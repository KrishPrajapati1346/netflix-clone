import { Schema, model, type HydratedDocument, type Model, type Types } from 'mongoose';

/**
 * One row per issued refresh token.
 *
 * Refresh tokens are opaque random strings, never JWTs: revocation has to be
 * authoritative, and a self-contained token cannot be un-issued. Only the
 * SHA-256 digest is stored, so a database dump does not yield usable sessions.
 *
 * Tokens are grouped into a *family* — one login, then every token rotated from
 * it. Presenting a token that was already rotated means the string leaked and
 * someone is replaying it, so the whole family is revoked at once. That is the
 * standard reuse-detection response, and it is why `rotatedTo` is retained
 * rather than the row simply being deleted on rotation.
 */
export interface RefreshTokenAttrs {
  userId: Types.ObjectId;
  tokenHash: string;
  familyId: string;
  expiresAt: Date;
  revokedAt?: Date | null;
  revokedReason?: 'logout' | 'logout_all' | 'rotated' | 'reuse_detected' | 'password_change' | null;
  /** Hash of the token that replaced this one, for auditing a reuse event. */
  rotatedTo?: string | null;
  userAgent?: string | null;
  ip?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type RefreshTokenDocument = HydratedDocument<RefreshTokenAttrs> & { _id: Types.ObjectId };
export type RefreshTokenModel = Model<RefreshTokenAttrs>;

const refreshTokenSchema = new Schema<RefreshTokenAttrs, RefreshTokenModel>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    familyId: { type: String, required: true, index: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
    revokedReason: {
      type: String,
      enum: ['logout', 'logout_all', 'rotated', 'reuse_detected', 'password_change', null],
      default: null,
    },
    rotatedTo: { type: String, default: null },
    userAgent: { type: String, default: null, maxlength: 400 },
    ip: { type: String, default: null, maxlength: 90 },
  },
  { timestamps: true },
);

/**
 * Mongo's TTL monitor reaps expired rows roughly once a minute.
 *
 * The grace period keeps a just-expired token readable for a short window so a
 * reuse attempt still finds its family to revoke instead of silently missing.
 */
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 });

export const RefreshToken = model<RefreshTokenAttrs, RefreshTokenModel>(
  'RefreshToken',
  refreshTokenSchema,
);
