import { Router } from 'express';
import { listMutationSchema, progressUpdateSchema, reactionSchema } from '@shared';
import * as controller from '../controllers/library.controller';
import { requireAuth, requireProfile } from '../middleware/auth';
import { writeLimiter } from '../middleware/rateLimit';
import { validate } from '../middleware/validate';

const router = Router();

/**
 * Everything here is scoped to one profile, so both gates apply to the whole
 * router. A route added later inherits them rather than having to remember.
 */
router.use(requireAuth, requireProfile);

/**
 * Progress saves are frequent by design — the player heartbeats every few
 * seconds — so this route deliberately skips `writeLimiter`. The global
 * limiter still applies, and the operation is a single indexed upsert.
 */
router.post('/progress', validate({ body: progressUpdateSchema }), controller.saveProgress);
router.get('/progress/continue', controller.continueWatching);
router.get('/progress/history', controller.history);
router.delete('/progress/:mediaId', controller.removeFromHistory);

router.get('/lists/:kind', controller.getList);
router.post('/lists', writeLimiter, validate({ body: listMutationSchema }), controller.addToList);
router.delete(
  '/lists',
  writeLimiter,
  validate({ body: listMutationSchema }),
  controller.removeFromList,
);

router.post('/reactions', writeLimiter, validate({ body: reactionSchema }), controller.setReaction);

export const libraryRoutes = router;
