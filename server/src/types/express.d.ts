import type { UserDocument } from '../models/User';
import type { ProfileDocument } from '../models/Profile';

/**
 * Request augmentation.
 *
 * `Express.User` is widened rather than redeclaring `Request.user`: Passport's
 * types already declare `user?: Express.User` on the request, and declaring the
 * same property a second time with a different type is a merge conflict. Filling
 * in the intentionally-empty `Express.User` interface is the supported way to
 * tell both Passport and our own middleware what a user actually is.
 *
 * Everything here is optional at the type level on purpose: a handler that wants
 * a guaranteed `req.user` must sit behind `requireAuth`, and the compiler will
 * not let it pretend otherwise.
 */
declare global {
  namespace Express {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface User extends UserDocument {}

    interface Request {
      /** The profile selected for this request, resolved from a signed grant. */
      profile?: ProfileDocument;
      /** Parsed + coerced output of the Zod validators, replacing raw input. */
      validated?: {
        body?: unknown;
        query?: unknown;
        params?: unknown;
      };
      /** Correlation id, attached at the top of the middleware chain. */
      id?: string;
    }
  }
}

export {};
