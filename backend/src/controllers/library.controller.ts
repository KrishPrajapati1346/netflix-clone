import {
  listKindSchema,
  type ListMutationInput,
  type ProgressUpdateInput,
  type ReactionInput,
} from '@shared';
import * as lists from '../services/list.service';
import * as progress from '../services/progress.service';
import { ApiError } from '../utils/ApiError';
import { asyncHandler, param, sendData } from '../utils/http';
import { body } from '../middleware/validate';
import { Types } from 'mongoose';
import type { Request } from 'express';
import type { ProfileDocument } from '../models/Profile';

/**
 * A profile's own library: playback progress, saved lists and reactions.
 *
 * Every handler reads `req.profile`, which `requireProfile` resolved from a
 * signed grant and verified still belongs to the authenticated account. No
 * handler here accepts a profile id from the request body — that would make
 * one household member's library reachable from another's session.
 */

function requireProfile(req: Request): ProfileDocument {
  if (!req.profile) throw ApiError.badRequest('Choose a profile to continue', 'PROFILE_REQUIRED');
  return req.profile;
}

export const saveProgress = asyncHandler(async (req, res) => {
  const profile = requireProfile(req);
  const input = body<ProgressUpdateInput>(req);
  const saved = await progress.saveProgress(profile, input);
  sendData(res, saved);
});

export const continueWatching = asyncHandler(async (req, res) => {
  const profile = requireProfile(req);
  const items = await progress.getContinueWatching(profile);
  sendData(res, { items });
});

export const history = asyncHandler(async (req, res) => {
  const profile = requireProfile(req);
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(60, Math.max(1, Number(req.query.limit) || 24));

  const { rows, total } = await progress.getWatchHistory(profile, page, limit);
  sendData(res, {
    items: rows.map(progress.toProgressDTO),
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    hasMore: page * limit < total,
  });
});

export const removeFromHistory = asyncHandler(async (req, res) => {
  const profile = requireProfile(req);
  const mediaId = param(req, 'mediaId');

  if (!mediaId || !Types.ObjectId.isValid(mediaId)) {
    throw ApiError.badRequest('Invalid title id', 'INVALID_ID');
  }

  const removed = await progress.clearProgress(profile._id, new Types.ObjectId(mediaId));
  sendData(res, { removed });
});

export const getList = asyncHandler(async (req, res) => {
  const profile = requireProfile(req);
  const parsed = listKindSchema.safeParse(param(req, 'kind'));
  if (!parsed.success) throw ApiError.badRequest('Unknown list', 'INVALID_LIST');

  const items = await lists.getList(profile, parsed.data);
  sendData(res, { kind: parsed.data, items });
});

export const addToList = asyncHandler(async (req, res) => {
  const profile = requireProfile(req);
  const input = body<ListMutationInput>(req);
  const result = await lists.addToList(profile, input);
  sendData(res, result, result.added ? 201 : 200);
});

export const removeFromList = asyncHandler(async (req, res) => {
  const profile = requireProfile(req);
  const input = body<ListMutationInput>(req);
  const result = await lists.removeFromList(profile, input);
  sendData(res, result);
});

export const setReaction = asyncHandler(async (req, res) => {
  const profile = requireProfile(req);
  const input = body<ReactionInput>(req);
  const result = await lists.setReaction(profile, input.mediaType, input.mediaId, input.reaction);
  sendData(res, result);
});
