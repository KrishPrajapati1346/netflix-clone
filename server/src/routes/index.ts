import { Router } from 'express';
import mongoose from 'mongoose';
import { features } from '../config/env';
import { sendData } from '../utils/http';
import { adminRoutes } from './admin.routes';
import { authRoutes } from './auth.routes';

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

router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);

export const apiRoutes = router;
