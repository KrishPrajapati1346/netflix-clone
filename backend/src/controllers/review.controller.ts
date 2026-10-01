import type { Request } from 'express';
import {
  reviewQuerySchema,
  type CreateReviewInput,
  type RatingInput,
  type UpdateReviewInput,
} from '@shared';
import type { ProfileDocument } from '../models/Profile';
import * as reviews from '../services/review.service';
import { ApiError } from '../utils/ApiError';
import { asyncHandler, param, sendData } from '../utils/http';
import { body } from '../middleware/validate';

function requireProfile(req: Request): ProfileDocument {
  if (!req.profile) throw ApiError.badRequest('Choose a profile to continue', 'PROFILE_REQUIRED');
  return req.profile;
}

export const setRating = asyncHandler(async (req, res) => {
  const result = await reviews.setRating(requireProfile(req), body<RatingInput>(req));
  sendData(res, result);
});

export const clearRating = asyncHandler(async (req, res) => {
  const mediaType = param(req, 'mediaType') === 'tv' ? 'tv' : 'movie';
  await reviews.clearRating(requireProfile(req), mediaType, param(req, 'mediaId'));
  sendData(res, { cleared: true });
});

export const create = asyncHandler(async (req, res) => {
  const review = await reviews.createReview(requireProfile(req), body<CreateReviewInput>(req));
  sendData(res, { review }, 201);
});

export const update = asyncHandler(async (req, res) => {
  const review = await reviews.updateReview(
    requireProfile(req),
    param(req, 'id'),
    body<UpdateReviewInput>(req),
  );
  sendData(res, { review });
});

export const remove = asyncHandler(async (req, res) => {
  await reviews.deleteReview(requireProfile(req), param(req, 'id'));
  sendData(res, { deleted: true });
});

/** Public: anonymous visitors read reviews, they just cannot vote or post. */
export const list = asyncHandler(async (req, res) => {
  const parsed = reviewQuerySchema.parse(req.query);
  const page = await reviews.listReviews(param(req, 'mediaId'), parsed, req.profile);
  sendData(res, page);
});

export const toggleHelpful = asyncHandler(async (req, res) => {
  const result = await reviews.toggleHelpful(requireProfile(req), param(req, 'id'));
  sendData(res, result);
});
