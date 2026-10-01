import { Episode } from '../models/Episode';
import { Movie } from '../models/Movie';
import { Profile } from '../models/Profile';
import { Season } from '../models/Season';
import { TVShow } from '../models/TVShow';
import { User } from '../models/User';
import { asyncHandler, sendData } from '../utils/http';

/**
 * Admin overview.
 *
 * Deliberately counts-only for now — the full dashboard arrives in Phase 7.
 * It exists this early because it is the endpoint that makes role-based access
 * *provable*: a `user` gets 403 here and an `admin` gets 200, exercised by the
 * test suite rather than asserted in a README.
 */
export const overview = asyncHandler(async (_req, res) => {
  const [users, admins, profiles, movies, shows, seasons, episodes, unverified] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ role: 'admin' }),
    Profile.countDocuments(),
    Movie.countDocuments(),
    TVShow.countDocuments(),
    Season.countDocuments(),
    Episode.countDocuments(),
    User.countDocuments({ isEmailVerified: false }),
  ]);

  sendData(res, {
    users: { total: users, admins, unverified },
    profiles,
    catalog: { movies, shows, seasons, episodes },
    generatedAt: new Date().toISOString(),
  });
});
