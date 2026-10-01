import { Router, type Request } from 'express';
import { requireAuth, requireProfile } from '../middleware/auth';
import * as notifications from '../services/notification.service';
import { ApiError } from '../utils/ApiError';
import { asyncHandler, sendData } from '../utils/http';

const router = Router();
router.use(requireAuth, requireProfile);

function currentProfile(req: Request) {
  if (!req.profile) throw ApiError.badRequest('Choose a profile', 'PROFILE_REQUIRED');
  return req.profile;
}

/**
 * Notifications are pushed over the socket when the recipient is connected, and
 * read from here otherwise. Both paths hit the same rows, so nothing is lost by
 * being offline.
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    sendData(res, await notifications.listNotifications(currentProfile(req)._id));
  }),
);

router.post(
  '/read',
  asyncHandler(async (req, res) => {
    const ids = (req.body as { ids?: string[] })?.ids;
    const updated = await notifications.markRead(currentProfile(req)._id, ids);
    sendData(res, { updated });
  }),
);

export const notificationRoutes = router;
