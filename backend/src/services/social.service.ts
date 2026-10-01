import { Types } from 'mongoose';
import type { MediaType, TitleSummaryDTO } from '@shared';
import { ListEntry } from '../models/ListEntry';
import { Movie } from '../models/Movie';
import { Profile, type ProfileDocument } from '../models/Profile';
import { ActivityEvent, Follow, type ActivityKind } from '../models/Social';
import { TVShow } from '../models/TVShow';
import { ApiError } from '../utils/ApiError';
import { toSummary } from './catalog.service';
import { notify } from './notification.service';

/**
 * The social layer: public profiles, follows, shared lists and an activity feed.
 *
 * Everything here is opt-in. A profile is private until it sets a handle and
 * flips `isPublic`, and nothing is recorded to the activity feed for a profile
 * that has not opted in — a household member should not become discoverable
 * because someone else on the account did.
 */

const HANDLE_PATTERN = /^[a-z0-9_]{3,24}$/;

export interface PublicProfileDTO {
  profileId: string;
  handle: string;
  name: string;
  avatarKey: string;
  avatarUrl: string | null;
  followerCount: number;
  followingCount: number;
  /** Null when the viewer is anonymous or looking at their own profile. */
  isFollowing: boolean | null;
  isSelf: boolean;
  joinedAt: string;
}

export async function setHandle(
  profile: ProfileDocument,
  handle: string | null,
  isPublic: boolean,
): Promise<ProfileDocument> {
  if (profile.isKids && isPublic) {
    // A kids profile is not a social account.
    throw ApiError.badRequest('Kids profiles cannot be made public', 'KIDS_PROFILE');
  }

  if (handle !== null) {
    const normalised = handle.trim().toLowerCase().replace(/^@/, '');
    if (!HANDLE_PATTERN.test(normalised)) {
      throw ApiError.unprocessable('Please correct the highlighted fields', {
        handle: ['3–24 characters, using letters, numbers or underscores'],
      });
    }

    const taken = await Profile.exists({ handle: normalised, _id: { $ne: profile._id } });
    if (taken) throw ApiError.conflict('That handle is taken', 'HANDLE_TAKEN');

    profile.handle = normalised;
  } else {
    profile.handle = null;
  }

  // A profile with no handle has no address, so it cannot be public.
  profile.isPublic = handle === null ? false : isPublic;
  await profile.save();
  return profile;
}

export async function getPublicProfile(
  handle: string,
  viewer?: ProfileDocument | null,
): Promise<PublicProfileDTO> {
  const target = await Profile.findOne({ handle: handle.toLowerCase().replace(/^@/, '') });

  // 404 rather than 403 for a private profile: confirming it exists would leak
  // that the handle is taken by someone who chose not to be found.
  if (!target || !target.isPublic) {
    throw ApiError.notFound('No public profile with that handle', 'PROFILE_NOT_FOUND');
  }

  const isSelf = viewer ? viewer._id.toString() === target._id.toString() : false;

  const [followerCount, followingCount, following] = await Promise.all([
    Follow.countDocuments({ followingProfileId: target._id }),
    Follow.countDocuments({ followerProfileId: target._id }),
    viewer && !isSelf
      ? Follow.exists({ followerProfileId: viewer._id, followingProfileId: target._id })
      : Promise.resolve(null),
  ]);

  return {
    profileId: target._id.toString(),
    handle: target.handle!,
    name: target.name,
    avatarKey: target.avatarKey,
    avatarUrl: target.avatarUrl ?? null,
    followerCount,
    followingCount,
    isFollowing: viewer && !isSelf ? Boolean(following) : null,
    isSelf,
    joinedAt: target.createdAt.toISOString(),
  };
}

export async function followProfile(
  follower: ProfileDocument,
  targetProfileId: string,
): Promise<{ following: boolean }> {
  if (!Types.ObjectId.isValid(targetProfileId)) {
    throw ApiError.badRequest('Invalid profile', 'INVALID_ID');
  }
  if (follower._id.toString() === targetProfileId) {
    throw ApiError.badRequest('You cannot follow yourself', 'SELF_FOLLOW');
  }

  const target = await Profile.findById(targetProfileId);
  if (!target || !target.isPublic) {
    throw ApiError.notFound('That profile is not public', 'PROFILE_NOT_FOUND');
  }

  const result = await Follow.updateOne(
    { followerProfileId: follower._id, followingProfileId: target._id },
    { $setOnInsert: { followerUserId: follower.userId } },
    { upsert: true },
  );

  // Only announce a *new* follow; re-following is a no-op, not an event.
  if (result.upsertedCount > 0) {
    await Promise.all([
      notify({
        profileId: target._id,
        userId: target.userId,
        kind: 'follow',
        title: `${follower.name} followed you`,
        href: follower.handle ? `/u/${follower.handle}` : undefined,
        actorProfileId: follower._id,
      }),
      recordActivity(follower, 'followed', {
        targetProfileId: target._id,
        targetProfileName: target.name,
      }),
    ]);
  }

  return { following: true };
}

export async function unfollowProfile(
  follower: ProfileDocument,
  targetProfileId: string,
): Promise<{ following: boolean }> {
  await Follow.deleteOne({
    followerProfileId: follower._id,
    followingProfileId: new Types.ObjectId(targetProfileId),
  });
  return { following: false };
}

export async function listFollows(
  profileId: Types.ObjectId,
  direction: 'followers' | 'following',
): Promise<PublicProfileDTO[]> {
  const rows = await Follow.find(
    direction === 'followers' ? { followingProfileId: profileId } : { followerProfileId: profileId },
  )
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  const ids = rows.map((row) =>
    direction === 'followers' ? row.followerProfileId : row.followingProfileId,
  );
  if (ids.length === 0) return [];

  const profiles = await Profile.find({ _id: { $in: ids }, isPublic: true }).lean();

  return profiles.map((entry) => ({
    profileId: entry._id.toString(),
    handle: entry.handle ?? '',
    name: entry.name,
    avatarKey: entry.avatarKey,
    avatarUrl: entry.avatarUrl ?? null,
    followerCount: 0,
    followingCount: 0,
    isFollowing: null,
    isSelf: false,
    joinedAt: entry.createdAt.toISOString(),
  }));
}

export interface ActivityItemDTO {
  id: string;
  kind: ActivityKind;
  actor: { profileId: string; name: string; handle: string | null; avatarKey: string };
  mediaTitle: string | null;
  mediaSlug: string | null;
  targetProfileName: string | null;
  score: number | null;
  createdAt: string;
}

/**
 * Records a public action.
 *
 * Silently does nothing for a private profile — the check lives here so no
 * caller can forget it, and adding a new activity type cannot accidentally leak
 * a private profile's behaviour.
 */
export async function recordActivity(
  profile: ProfileDocument,
  kind: ActivityKind,
  details: {
    mediaType?: MediaType;
    mediaId?: Types.ObjectId;
    mediaTitle?: string;
    mediaSlug?: string;
    targetProfileId?: Types.ObjectId;
    targetProfileName?: string;
    score?: number;
  } = {},
): Promise<void> {
  if (!profile.isPublic) return;

  await ActivityEvent.create({
    profileId: profile._id,
    userId: profile.userId,
    kind,
    mediaType: details.mediaType ?? null,
    mediaId: details.mediaId ?? null,
    mediaTitle: details.mediaTitle ?? null,
    mediaSlug: details.mediaSlug ?? null,
    targetProfileId: details.targetProfileId ?? null,
    targetProfileName: details.targetProfileName ?? null,
    score: details.score ?? null,
  });
}

/**
 * The activity feed: what the profiles you follow have been doing.
 *
 * Read-time fan-out — resolve who you follow, then query their events. Two
 * indexed queries regardless of how much activity exists.
 */
export async function getFeed(
  profile: ProfileDocument,
  limit = 40,
): Promise<ActivityItemDTO[]> {
  const follows = await Follow.find({ followerProfileId: profile._id })
    .select('followingProfileId')
    .lean();

  const followingIds = follows.map((row) => row.followingProfileId);
  if (followingIds.length === 0) return [];

  const events = await ActivityEvent.find({ profileId: { $in: followingIds } })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  if (events.length === 0) return [];

  // One lookup for every actor on the page rather than one per event.
  const actors = await Profile.find({ _id: { $in: [...new Set(events.map((e) => e.profileId))] } })
    .select('name handle avatarKey')
    .lean();
  const actorMap = new Map(actors.map((actor) => [actor._id.toString(), actor]));

  return events.map((event) => {
    const actor = actorMap.get(event.profileId.toString());
    return {
      id: event._id.toString(),
      kind: event.kind,
      actor: {
        profileId: event.profileId.toString(),
        name: actor?.name ?? 'Someone',
        handle: actor?.handle ?? null,
        avatarKey: actor?.avatarKey ?? 'ember',
      },
      mediaTitle: event.mediaTitle ?? null,
      mediaSlug: event.mediaSlug ?? null,
      targetProfileName: event.targetProfileName ?? null,
      score: event.score ?? null,
      createdAt: event.createdAt.toISOString(),
    };
  });
}

/**
 * A public profile's shared watchlist.
 *
 * Only `my_list` is shared; favourites and watch-later stay private. Sharing
 * every list by default would be a surprising amount of disclosure from one
 * "make my profile public" toggle.
 */
export async function getSharedList(handle: string): Promise<TitleSummaryDTO[]> {
  const target = await Profile.findOne({
    handle: handle.toLowerCase().replace(/^@/, ''),
    isPublic: true,
  });
  if (!target) throw ApiError.notFound('No public profile with that handle', 'PROFILE_NOT_FOUND');

  const entries = await ListEntry.find({ profileId: target._id, kind: 'my_list' })
    .sort({ createdAt: -1 })
    .limit(60)
    .lean();

  const ids = entries.map((entry) => entry.mediaId);
  if (ids.length === 0) return [];

  const [movies, shows] = await Promise.all([
    Movie.find({ _id: { $in: ids }, isPublished: true }).lean(),
    TVShow.find({ _id: { $in: ids }, isPublished: true }).lean(),
  ]);

  return [
    ...movies.map((m) => toSummary({ ...m, mediaType: 'movie' } as never)),
    ...shows.map((s) =>
      toSummary({
        ...s,
        mediaType: 'tv',
        releaseDate: s.firstAirDate ?? null,
        runtimeMinutes: s.averageRuntimeMinutes || null,
      } as never),
    ),
  ];
}

/** Suggests public profiles to follow, newest first. */
export async function discoverProfiles(viewer: ProfileDocument): Promise<PublicProfileDTO[]> {
  const following = await Follow.find({ followerProfileId: viewer._id })
    .select('followingProfileId')
    .lean();

  const exclude = [viewer._id, ...following.map((row) => row.followingProfileId)];

  const profiles = await Profile.find({ isPublic: true, _id: { $nin: exclude } })
    .sort({ createdAt: -1 })
    .limit(12)
    .lean();

  return profiles.map((entry) => ({
    profileId: entry._id.toString(),
    handle: entry.handle ?? '',
    name: entry.name,
    avatarKey: entry.avatarKey,
    avatarUrl: entry.avatarUrl ?? null,
    followerCount: 0,
    followingCount: 0,
    isFollowing: false,
    isSelf: false,
    joinedAt: entry.createdAt.toISOString(),
  }));
}
