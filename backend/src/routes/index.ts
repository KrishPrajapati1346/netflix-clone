import { Router } from 'express';
import mongoose from 'mongoose';
import { features } from '../config/env';
import { sendData } from '../utils/http';
import { adminRoutes } from './admin.routes';
import { artworkRoutes } from './artwork.routes';
import { authRoutes } from './auth.routes';
import { catalogRoutes } from './catalog.routes';
import { libraryRoutes } from './library.routes';
import { profileRoutes } from './profile.routes';
import { reviewRoutes } from './review.routes';
import { notificationRoutes } from './notification.routes';
import { partyRoutes } from './party.routes';
import { searchRoutes } from './search.routes';
import { socialRoutes } from './social.routes';

const router = Router();

/**
 * Liveness probe.
 *
 * Reports database state rather than a bare "ok", because the process happily
 * stays up while Mongo is unreachable — and an uptime check that cannot tell
 * those apart is worse than none. Also the endpoint a free-tier keep-alive
 * pings to blunt Render's cold starts.
 */
router.get('/health', (_req, res) => {
  // Mongoose also uses 99 ("uninitialized"), so this is a map rather than an
  // array indexed by readyState.
  const states: Record<number, string> = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
    99: 'uninitialized',
  };
  const dbState = states[mongoose.connection.readyState] ?? 'unknown';
  const healthy = mongoose.connection.readyState === 1;

  res.status(healthy ? 200 : 503).json({
    success: healthy,
    data: {
      status: healthy ? 'ok' : 'degraded',
      database: dbState,
      uptimeSeconds: Math.round(process.uptime()),
      features,
      timestamp: new Date().toISOString(),
    },
  });
});

/** Lets the client render only what this deployment can actually deliver. */
router.get('/features', (_req, res) => {
  sendData(res, features);
});

router.use('/artwork', artworkRoutes);
router.use('/auth', authRoutes);
router.use('/profiles', profileRoutes);
router.use('/catalog', catalogRoutes);
router.use('/library', libraryRoutes);
router.use('/reviews', reviewRoutes);
router.use('/search', searchRoutes);
router.use('/parties', partyRoutes);
router.use('/notifications', notificationRoutes);
router.use('/social', socialRoutes);
router.use('/admin', adminRoutes);

export const apiRoutes = router;
