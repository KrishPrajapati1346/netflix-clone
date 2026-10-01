import DOMPurify from 'isomorphic-dompurify';
import { Types } from 'mongoose';
import type {
  CreateReviewInput,
  MediaType,
  Paginated,
  RatingInput,
  ReviewDTO,
  ReviewQuery,
  UpdateReviewInput,
} from '@shared';
import { Movie } from '../models/Movie';
import type { ProfileDocument } from '../models/Profile';
import { Rating } from '../models/Rating';
import { HelpfulVote, Review, type ReviewAttrs } from '../models/Review';
import { TVShow } from '../models/TVShow';
import { ApiError } from '../utils/ApiError';
import { paginate } from '../utils/http';

/**
 * Ratings and written reviews.
 *
 * Review bodies are user-generated content that gets rendered back to other
 * users, so they are sanitised on write. Sanitising on write rather than on
 * read means the dangerous form is never stored — a later feature that reads
 * the field (an email digest, an RSS feed, the admin panel) is safe without
 * having to remember to sanitise again.
 */

/**
 * Allow-list, not a block-list.
 *
 * A block-list has to anticipate every dangerous tag and every encoding of it;
 * an allow-list only has to name the handful that are safe. No `<a>`, because
 * review links are a spam vector with no upside here.
 */
const SANITIZE_CONFIG = {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li', 'blockquote'],
  ALLOWED_ATTR: [] as string[],
};

function sanitizeBody(body: string): string {
  return DOMPurify.sanitize(body, SANITIZE_CONFIG).trim();
}

/** Recomputes a title's denormalised score after any rating change. */
async function refreshAggregate(mediaType: MediaType, mediaId: Types.ObjectId): Promise<void> {
  const [summary] = await Rating.aggregate<{ average: number; count: number }>([
    { $match: { mediaId } },
    { $group: { _id: null, average: { $avg: '$score' }, count: { $sum: 1 } } },
  ]);

  const update = {
    averageScore: summary ? Math.round(summary.average * 10) / 10 : 0,
    ratingCount: summary?.count ?? 0,
  };

  // Branch rather than assigning `Movie | TVShow` to one variable: the two
  // models have different document types, so the union is not callable.
  if (mediaType === 'movie') {
    await Movie.updateOne({ _id: mediaId }, { $set: update });
  } else {
    await TVShow.updateOne({ _id: mediaId }, { $set: update });
  }
}

export async function setRating(
  profile: ProfileDocument,
  input: RatingInput,
): Promise<{ score: number; averageScore: number; ratingCount: number }> {
  const mediaId = new Types.ObjectId(input.mediaId);

  await Rating.updateOne(
    { profileId: profile._id, mediaType: input.mediaType, mediaId },
    { $set: { score: input.score, userId: profile.userId } },
    { upsert: true },
  );

  await refreshAggregate(input.mediaType, mediaId);

  const { recordActivity } = await import('./social.service');
  const named =
    input.mediaType === 'movie'
      ? await Movie.findById(mediaId).select('title slug').lean()
      : await TVShow.findById(mediaId).select('title slug').lean();
  await recordActivity(profile, 'rated', {
    mediaType: input.mediaType,
    mediaId,
    mediaTitle: named?.title,
    mediaSlug: named?.slug,
    score: input.score,
  });

  const title =
    input.mediaType === 'movie'
      ? await Movie.findById(mediaId).select('averageScore ratingCount').lean()
      : await TVShow.findById(mediaId).select('averageScore ratingCount').lean();

  return {
    score: input.score,
    averageScore: title?.averageScore ?? 0,
    ratingCount: title?.ratingCount ?? 0,
  };
}

export async function clearRating(
  profile: ProfileDocument,
  mediaType: MediaType,
  mediaId: string,
): Promise<void> {
  const id = new Types.ObjectId(mediaId);
  await Rating.deleteOne({ profileId: profile._id, mediaType, mediaId: id });
  await refreshAggregate(mediaType, id);
}

export async function createReview(
  profile: ProfileDocument,
  input: CreateReviewInput,
): Promise<ReviewDTO> {
  const mediaId = new Types.ObjectId(input.mediaId);
  const body = sanitizeBody(input.body);

  if (body.length === 0) {
    throw ApiError.unprocessable('Please correct the highlighted fields', {
      body: ['Your review must contain some text'],
    });
  }

  const existing = await Review.findOne({
    profileId: profile._id,
    mediaType: input.mediaType,
    mediaId,
  });

  if (existing) {
    throw ApiError.conflict(
      'You have already reviewed this title. Edit your existing review instead.',
      'REVIEW_EXISTS',
    );
  }

  const review = await Review.create({
    profileId: profile._id,
    userId: profile.userId,
    mediaType: input.mediaType,
    mediaId,
    title: input.title,
    body,
    score: input.score,
    hasSpoilers: input.hasSpoilers,
  });

  // A review carries a rating, so posting one also rates the title. Keeping
  // them separate would let a 5-star review sit next to no star rating.
  await setRating(profile, {
    mediaType: input.mediaType,
    mediaId: input.mediaId,
    score: input.score,
  });

  const { recordActivity } = await import('./social.service');
  const named =
    input.mediaType === 'movie'
      ? await Movie.findById(mediaId).select('title slug').lean()
      : await TVShow.findById(mediaId).select('title slug').lean();
  await recordActivity(profile, 'reviewed', {
    mediaType: input.mediaType,
    mediaId,
    mediaTitle: named?.title,
    mediaSlug: named?.slug,
    score: input.score,
  });

  return toReviewDTO(review, profile, false);
}

export async function updateReview(
  profile: ProfileDocument,
  reviewId: string,
  input: UpdateReviewInput,
): Promise<ReviewDTO> {
  // The `profileId` filter is the authorization check: another profile's review
  // simply does not resolve, so there is no separate ownership branch to forget.
  const review = await Review.findOne({ _id: reviewId, profileId: profile._id });
  if (!review) throw ApiError.notFound('Review not found', 'REVIEW_NOT_FOUND');

  if (input.title !== undefined) review.title = input.title;
  if (input.body !== undefined) review.body = sanitizeBody(input.body);
  if (input.hasSpoilers !== undefined) review.hasSpoilers = input.hasSpoilers;

  if (input.score !== undefined) {
    review.score = input.score;
    await setRating(profile, {
      mediaType: review.mediaType,
      mediaId: review.mediaId.toString(),
      score: input.score,
    });
  }

  await review.save();
  return toReviewDTO(review, profile, false);
}

export async function deleteReview(profile: ProfileDocument, reviewId: string): Promise<void> {
  const review = await Review.findOneAndDelete({ _id: reviewId, profileId: profile._id });
  if (!review) throw ApiError.notFound('Review not found', 'REVIEW_NOT_FOUND');

  // Votes on a deleted review are orphans; remove them with it.
  await HelpfulVote.deleteMany({ reviewId: review._id });
}

export async function listReviews(
  mediaId: string,
  query: ReviewQuery,
  profile?: ProfileDocument | null,
): Promise<Paginated<ReviewDTO>> {
  const id = new Types.ObjectId(mediaId);

  const sortMap: Record<ReviewQuery['sort'], Record<string, 1 | -1>> = {
    helpful: { helpfulCount: -1, createdAt: -1 },
    newest: { createdAt: -1 },
    oldest: { createdAt: 1 },
    score: { score: -1, createdAt: -1 },
  };

  // Hidden reviews stay visible to their own author, so a moderated user is not
  // left wondering whether their post saved.
  const visibility = profile
    ? { $or: [{ isHidden: false }, { profileId: profile._id }] }
    : { isHidden: false };

  const filter = { mediaId, ...visibility };

  const [rows, total] = await Promise.all([
    Review.find(filter)
      .sort(sortMap[query.sort])
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .populate<{ profileId: { _id: Types.ObjectId; name: string; avatarUrl?: string | null } }>(
        'profileId',
        'name avatarUrl',
      )
      .lean(),
    Review.countDocuments(filter),
  ]);

  // One query for every vote on this page, rather than one per review.
  const votedIds = profile
    ? new Set(
        (
          await HelpfulVote.find({
            profileId: profile._id,
            reviewId: { $in: rows.map((row) => row._id) },
          })
            .select('reviewId')
            .lean()
        ).map((vote) => vote.reviewId.toString()),
      )
    : new Set<string>();

  const items = rows.map((row) => {
    const author = row.profileId as unknown as {
      _id: Types.ObjectId;
      name: string;
      avatarUrl?: string | null;
    };

    return {
      id: row._id.toString(),
      mediaType: row.mediaType,
      mediaId: row.mediaId.toString(),
      author: {
        id: row.userId.toString(),
        profileId: author?._id?.toString() ?? '',
        name: author?.name ?? 'Deleted profile',
        avatarUrl: author?.avatarUrl ?? null,
      },
      title: row.title,
      body: row.body,
      score: row.score,
      hasSpoilers: row.hasSpoilers,
      helpfulCount: row.helpfulCount,
      viewerFoundHelpful: votedIds.has(row._id.toString()),
      isOwn: profile ? author?._id?.toString() === profile._id.toString() : false,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    } satisfies ReviewDTO;
  });

  void id;
  return paginate(items, total, query.page, query.limit);
}

/**
 * Toggles a helpful vote.
 *
 * The counter is adjusted with `$inc` in the same step, so two concurrent votes
 * cannot both read the old count and write the same new one.
 */
export async function toggleHelpful(
  profile: ProfileDocument,
  reviewId: string,
): Promise<{ helpful: boolean; helpfulCount: number }> {
  const review = await Review.findById(reviewId);
  if (!review) throw ApiError.notFound('Review not found', 'REVIEW_NOT_FOUND');

  if (review.profileId.toString() === profile._id.toString()) {
    throw ApiError.badRequest('You cannot mark your own review as helpful', 'OWN_REVIEW');
  }

  const existing = await HelpfulVote.findOneAndDelete({
    reviewId: review._id,
    profileId: profile._id,
  });

  if (existing) {
    const updated = await Review.findByIdAndUpdate(
      review._id,
      { $inc: { helpfulCount: -1 } },
      { new: true },
    );
    return { helpful: false, helpfulCount: Math.max(0, updated?.helpfulCount ?? 0) };
  }

  await HelpfulVote.create({ reviewId: review._id, profileId: profile._id });
  const updated = await Review.findByIdAndUpdate(
    review._id,
    { $inc: { helpfulCount: 1 } },
    { new: true },
  );

  return { helpful: true, helpfulCount: updated?.helpfulCount ?? 1 };
}

function toReviewDTO(
  review: ReviewAttrs & { _id: Types.ObjectId },
  profile: ProfileDocument,
  viewerFoundHelpful: boolean,
): ReviewDTO {
  return {
    id: review._id.toString(),
    mediaType: review.mediaType,
    mediaId: review.mediaId.toString(),
    author: {
      id: review.userId.toString(),
      profileId: profile._id.toString(),
      name: profile.name,
      avatarUrl: profile.avatarUrl ?? null,
    },
    title: review.title,
    body: review.body,
    score: review.score,
    hasSpoilers: review.hasSpoilers,
    helpfulCount: review.helpfulCount,
    viewerFoundHelpful,
    isOwn: true,
    createdAt: review.createdAt.toISOString(),
    updatedAt: review.updatedAt.toISOString(),
  };
}
