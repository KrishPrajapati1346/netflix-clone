import { Router } from 'express';
import { createReviewSchema, ratingSchema, updateReviewSchema } from '@shared';
import * as controller from '../controllers/review.controller';
import { optionalAuth, optionalProfile, requireAuth, requireProfile } from '../middleware/auth';
import { writeLimiter } from '../middleware/rateLimit';
import { validate } from '../middleware/validate';

const router = Router();

// Reading reviews is public; `optionalProfile` only adds viewer state (own
// review, helpful votes) when a profile is present.
router.get('/titles/:mediaId', optionalAuth, optionalProfile, controller.list);

// Everything below writes, so it needs an unlocked profile.
router.use(requireAuth, requireProfile);

router.put('/ratings', writeLimiter, validate({ body: ratingSchema }), controller.setRating);
router.delete('/ratings/:mediaType/:mediaId', writeLimiter, controller.clearRating);

router.post('/', writeLimiter, validate({ body: createReviewSchema }), controller.create);
router.patch('/:id', writeLimiter, validate({ body: updateReviewSchema }), controller.update);
router.delete('/:id', writeLimiter, controller.remove);
router.post('/:id/helpful', writeLimiter, controller.toggleHelpful);

export const reviewRoutes = router;
