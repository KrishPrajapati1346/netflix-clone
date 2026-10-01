import crypto from 'node:crypto';
import { Types } from 'mongoose';
import type {
  CreatePartyInput,
  PartyMemberDTO,
  PartyMessageDTO,
  PartyStateDTO,
} from '@shared';
import { Episode } from '../models/Episode';
import { Movie } from '../models/Movie';
import type { ProfileDocument } from '../models/Profile';
import { TVShow } from '../models/TVShow';
import { PartyMessage, WatchParty, type WatchPartyDocument } from '../models/WatchParty';
import { ApiError } from '../utils/ApiError';

/**
 * Watch parties.
 *
 * The server is the clock. Clients report and request, but the party's
 * authoritative position lives here — otherwise two members drift apart with no
 * way to tell which is right.
 */

/**
 * Six characters from an unambiguous alphabet.
 *
 * No I, O, 0 or 1: codes get read aloud and typed by hand, and those four are
 * where transcription errors come from.
 */
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateCode(): string {
  const bytes = crypto.randomBytes(6);
  return Array.from(bytes, (byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length]).join('');
}

/** In-memory presence: party code -> profileId -> member. */
const presence = new Map<string, Map<string, PartyMemberDTO>>();

export function joinPresence(code: string, member: PartyMemberDTO): PartyMemberDTO[] {
  const room = presence.get(code) ?? new Map<string, PartyMemberDTO>();
  room.set(member.profileId, member);
  presence.set(code, room);
  return [...room.values()];
}

export function leavePresence(code: string, profileId: string): PartyMemberDTO[] {
  const room = presence.get(code);
  if (!room) return [];

  room.delete(profileId);
  // Drop empty rooms so the map does not grow with every party ever held.
  if (room.size === 0) presence.delete(code);
  return [...room.values()];
}

export function getPresence(code: string): PartyMemberDTO[] {
  return [...(presence.get(code)?.values() ?? [])];
}

export async function createParty(
  profile: ProfileDocument,
  input: CreatePartyInput,
): Promise<PartyStateDTO> {
  const mediaId = new Types.ObjectId(input.mediaId);

  // Verify the host may actually watch this, so a party cannot be used to
  // sidestep a kids profile's maturity limit.
  const allowed = profile.allowedRatings();
  const title =
    input.mediaType === 'movie'
      ? await Movie.findOne({ _id: mediaId, isPublished: true, maturityRating: { $in: allowed } }).lean()
      : await TVShow.findOne({ _id: mediaId, isPublished: true, maturityRating: { $in: allowed } }).lean();

  if (!title) throw ApiError.notFound('That title is not available', 'TITLE_NOT_FOUND');

  // Retry on the astronomically unlikely code collision rather than trusting
  // randomness; the unique index is the real guarantee.
  let code = generateCode();
  for (let attempt = 0; attempt < 5; attempt++) {
    if (!(await WatchParty.exists({ code, endedAt: null }))) break;
    code = generateCode();
  }

  const party = await WatchParty.create({
    code,
    hostProfileId: profile._id,
    hostUserId: profile.userId,
    mediaType: input.mediaType,
    mediaId,
    episodeId: input.episodeId ? new Types.ObjectId(input.episodeId) : null,
    hostControlsOnly: input.hostControlsOnly,
    positionSeconds: 0,
    isPlaying: false,
    lastSyncAt: new Date(),
  });

  return toPartyState(party, profile);
}

export async function findParty(code: string): Promise<WatchPartyDocument> {
  const party = await WatchParty.findOne({ code: code.toUpperCase(), endedAt: null });
  if (!party) throw ApiError.notFound('No active party with that code', 'PARTY_NOT_FOUND');
  return party;
}

export async function toPartyState(
  party: WatchPartyDocument,
  profile: ProfileDocument,
): Promise<PartyStateDTO> {
  let title = '';
  let subtitle: string | null = null;

  if (party.mediaType === 'movie') {
    const movie = await Movie.findById(party.mediaId).select('title').lean();
    title = movie?.title ?? 'Unknown title';
  } else {
    const [show, episode] = await Promise.all([
      TVShow.findById(party.mediaId).select('title').lean(),
      party.episodeId ? Episode.findById(party.episodeId).select('title seasonNumber episodeNumber').lean() : null,
    ]);
    title = show?.title ?? 'Unknown series';
    subtitle = episode ? `S${episode.seasonNumber} E${episode.episodeNumber} · ${episode.title}` : null;
  }

  return {
    code: party.code,
    mediaType: party.mediaType,
    mediaId: party.mediaId.toString(),
    episodeId: party.episodeId ? party.episodeId.toString() : null,
    title,
    subtitle,
    positionSeconds: projectedPosition(party),
    isPlaying: party.isPlaying,
    lastSyncAt: party.lastSyncAt.toISOString(),
    hostControlsOnly: party.hostControlsOnly,
    hostProfileId: party.hostProfileId.toString(),
    members: getPresence(party.code),
    isHost: party.hostProfileId.toString() === profile._id.toString(),
  };
}

/**
 * Where playback actually is *now*.
 *
 * A stored position is only true as of `lastSyncAt`. While the party is
 * playing, real time has moved on — so a joiner must be told the projected
 * position, or they start however many seconds behind everyone else.
 */
export function projectedPosition(party: WatchPartyDocument): number {
  if (!party.isPlaying) return party.positionSeconds;
  const elapsed = (Date.now() - party.lastSyncAt.getTime()) / 1000;
  return Math.max(0, party.positionSeconds + elapsed);
}

export async function applyControl(
  party: WatchPartyDocument,
  profile: ProfileDocument,
  action: 'play' | 'pause' | 'seek',
  positionSeconds: number,
): Promise<WatchPartyDocument> {
  const isHost = party.hostProfileId.toString() === profile._id.toString();

  // Authorisation, enforced server-side. Hiding the controls in the UI for
  // non-hosts is presentation; this is the rule.
  if (party.hostControlsOnly && !isHost) {
    throw ApiError.forbidden('Only the host can control playback', 'HOST_ONLY');
  }

  party.positionSeconds = positionSeconds;
  party.isPlaying = action !== 'pause';
  party.lastSyncAt = new Date();
  await party.save();

  return party;
}

export async function endParty(party: WatchPartyDocument, profile: ProfileDocument): Promise<void> {
  if (party.hostProfileId.toString() !== profile._id.toString()) {
    throw ApiError.forbidden('Only the host can end the party', 'HOST_ONLY');
  }
  party.endedAt = new Date();
  await party.save();
  presence.delete(party.code);
}

export async function addMessage(
  party: WatchPartyDocument,
  profile: ProfileDocument,
  kind: 'chat' | 'reaction' | 'system',
  body: string,
  atSeconds: number,
): Promise<PartyMessageDTO> {
  const message = await PartyMessage.create({
    partyId: party._id,
    profileId: profile._id,
    profileName: profile.name,
    kind,
    body,
    atSeconds,
  });

  return {
    id: message._id.toString(),
    profileId: message.profileId.toString(),
    profileName: message.profileName,
    kind: message.kind,
    body: message.body,
    atSeconds: message.atSeconds,
    createdAt: message.createdAt.toISOString(),
  };
}

/** Recent history, so someone joining mid-party sees the conversation. */
export async function getMessages(partyId: Types.ObjectId, limit = 100): Promise<PartyMessageDTO[]> {
  const rows = await PartyMessage.find({ partyId }).sort({ createdAt: -1 }).limit(limit).lean();

  return rows.reverse().map((row) => ({
    id: row._id.toString(),
    profileId: row.profileId.toString(),
    profileName: row.profileName,
    kind: row.kind,
    body: row.body,
    atSeconds: row.atSeconds,
    createdAt: row.createdAt.toISOString(),
  }));
}
