import bcrypt from 'bcryptjs';
import { Schema, model, type HydratedDocument, type Model, type Types } from 'mongoose';
import { USER_ROLES, type UserRole, type UserDTO } from '@kinora/shared';

export type AuthProvider = 'local' | 'google' | 'github';

export interface LinkedAccount {
  provider: Exclude<AuthProvider, 'local'>;
  providerId: string;
  linkedAt: Date;
}

export interface UserAttrs {
  name: string;
  email: string;
  /** Absent for accounts created purely through OAuth. */
  passwordHash?: string;
  role: UserRole;
  isEmailVerified: boolean;
  avatarUrl?: string | null;
  linkedAccounts: LinkedAccount[];
  /** Consecutive failed logins; reset on success. Drives account-level lockout. */
  failedLoginAttempts: number;
  lockedUntil?: Date | null;
  /** Access tokens issued before this instant are rejected. */
  credentialsChangedAt: Date;
  lastLoginAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserMethods {
  /** Hashes and assigns a new password. Does not save — the caller does. */
  setPassword(plaintext: string): Promise<void>;
  verifyPassword(candidate: string): Promise<boolean>;
  isLocked(): boolean;
  toDTO(): UserDTO;
}

export type UserDocument = HydratedDocument<UserAttrs, UserMethods> & { _id: Types.ObjectId };
export type UserModel = Model<UserAttrs, Record<string, never>, UserMethods>;

/** Lockout policy: after this many consecutive failures, refuse for the window. */
export const MAX_FAILED_LOGINS = 8;
export const LOCKOUT_MS = 15 * 60 * 1000;
const BCRYPT_ROUNDS = 12;

/**
 * Current time truncated to whole seconds.
 *
 * `credentialsChangedAt` is compared against a JWT's `iat`, which the spec
 * defines in seconds. Storing millisecond precision makes a token minted in the
 * same second as the credential change look *older* than it — so a freshly
 * registered user would be rejected by `requireAuth` on their very first
 * request. Truncating both sides to the same unit removes the mismatch.
 */
function nowToSecond(): Date {
  return new Date(Math.floor(Date.now() / 1000) * 1000);
}

const linkedAccountSchema = new Schema<LinkedAccount>(
  {
    provider: { type: String, enum: ['google', 'github'], required: true },
    providerId: { type: String, required: true },
    linkedAt: { type: Date, default: () => new Date() },
  },
  { _id: false },
);

const userSchema = new Schema<UserAttrs, UserModel, UserMethods>(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
      // `unique` already builds the index; adding `index: true` would make
      // Mongoose warn about a duplicate index definition on boot.
    },
    // `select: false` so a stray `User.find()` can never serialise the hash.
    passwordHash: { type: String, select: false },
    role: { type: String, enum: USER_ROLES, default: 'user', index: true },
    isEmailVerified: { type: Boolean, default: false },
    avatarUrl: { type: String, default: null },
    linkedAccounts: { type: [linkedAccountSchema], default: [] },
    failedLoginAttempts: { type: Number, default: 0, select: false },
    lockedUntil: { type: Date, default: null, select: false },
    credentialsChangedAt: { type: Date, default: nowToSecond },
    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// One account per provider identity, but only for documents that have one.
userSchema.index(
  { 'linkedAccounts.provider': 1, 'linkedAccounts.providerId': 1 },
  { sparse: true },
);

/**
 * The only path that writes `passwordHash`.
 *
 * Bumping `credentialsChangedAt` in the same step is what makes already-issued
 * access tokens stop working the moment a password changes — `requireAuth`
 * compares the token's `iat` against it. Keeping the two writes together means
 * no caller can update one and forget the other.
 */
userSchema.methods.setPassword = async function (this: UserDocument, plaintext: string) {
  this.passwordHash = await bcrypt.hash(plaintext, BCRYPT_ROUNDS);
  this.credentialsChangedAt = nowToSecond();
};

userSchema.methods.verifyPassword = async function (this: UserDocument, candidate: string) {
  if (!this.passwordHash) return false;
  return bcrypt.compare(candidate, this.passwordHash);
};

userSchema.methods.isLocked = function (this: UserDocument) {
  return Boolean(this.lockedUntil && this.lockedUntil.getTime() > Date.now());
};

userSchema.methods.toDTO = function (this: UserDocument): UserDTO {
  const providers: AuthProvider[] = [
    ...(this.passwordHash ? (['local'] as const) : []),
    ...this.linkedAccounts.map((a) => a.provider),
  ];
  return {
    id: this._id.toString(),
    name: this.name,
    email: this.email,
    role: this.role,
    isEmailVerified: this.isEmailVerified,
    avatarUrl: this.avatarUrl ?? null,
    // `passwordHash` is `select: false`, so 'local' only appears when the
    // caller explicitly selected it — which the auth routes that surface
    // provider state all do.
    authProviders: providers,
    createdAt: this.createdAt.toISOString(),
  };
};

export const User = model<UserAttrs, UserModel>('User', userSchema);
