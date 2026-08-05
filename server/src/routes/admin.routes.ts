import { Router } from 'express';
import * as controller from '../controllers/admin.controller';
import { requireAdmin, requireAuth } from '../middleware/auth';

const router = Router();

/**
 * Every admin route sits behind both gates, applied at the router level rather
 * than per-route. A route added to this file later cannot forget them.
 */
router.use(requireAuth, requireAdmin);

router.get('/overview', controller.overview);

export const adminRoutes = router;
