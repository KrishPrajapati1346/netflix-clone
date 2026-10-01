import { Router } from 'express';
import {
  createProfileSchema,
  selectProfileSchema,
  setProfilePinSchema,
  updateProfileSchema,
} from '@shared';
import * as controller from '../controllers/profile.controller';
import { optionalProfile, requireAuth } from '../middleware/auth';
import { authLimiter, writeLimiter } from '../middleware/rateLimit';
import { validate } from '../middleware/validate';

const router = Router();

// Managing profiles needs an account, but not an already-selected profile —
// this is the router you use to select one.
router.use(requireAuth);

router.get('/', controller.list);
router.post('/', writeLimiter, validate({ body: createProfileSchema }), controller.create);

// `authLimiter` because selection verifies a PIN, making it a credential check
// and therefore worth brute-forcing.
router.post('/select', authLimiter, validate({ body: selectProfileSchema }), controller.select);
router.post('/clear', controller.clear);

router.get('/active', optionalProfile, controller.active);

router.patch('/:id', writeLimiter, validate({ body: updateProfileSchema }), controller.update);
router.put('/:id/pin', authLimiter, validate({ body: setProfilePinSchema }), controller.setPin);
router.delete('/:id', optionalProfile, controller.remove);

export const profileRoutes = router;
