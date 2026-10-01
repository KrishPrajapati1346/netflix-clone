import bcrypt from "bcryptjs";
import {
  Schema,
  model,
  type HydratedDocument,
  type Model,
  type Types,
} from "mongoose";
import { USER_ROLES, type UserRole, type UserDTO } from "@shared";

export type AuthProvider = "local" | "google" | "github";

export interface LinkedAccount {
  provider: Exclude<AuthProvider, "local">;
  providerId: string;
  linkedAt: Date;
}

export interface UserAttrs {
  name: string;
  email: string;
  passwordHash?: string;
  role: UserRole;
  isEmailVerified: boolean;
  avatarUrl?: string | null;
  linkedAccounts: LinkedAccount[];
  failedLoginAttempts: number;
  lockedUntil?: Date | null;
  credentialsChangedAt: Date;
  lastLoginAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserMethods {
  setPassword(plaintext: string): Promise<void>;
  verifyPassword(candidate: string): Promise<boolean>;
  isLocked(): boolean;
  toDTO(): UserDTO;
}

export type UserDocument = HydratedDocument<UserAttrs, UserMethods> & {
  _id: Types.ObjectId;
};
export type UserModel = Model<UserAttrs, Record<string, never>, UserMethods>;

export const MAX_FAILED_LOGINS = 8;
export const LOCKOUT_MS = 15 * 60 * 1000;
const BCRYPT_ROUNDS = 12;

function nowToSecond(): Date {
  return new Date(Math.floor(Date.now() / 1000) * 1000);
}

const linkedAccountSchema = new Schema<LinkedAccount>(
  {
    provider: { type: String, enum: ["google", "github"], required: true },
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
    },

    passwordHash: { type: String, select: false },
    role: { type: String, enum: USER_ROLES, default: "user", index: true },
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

userSchema.index(
  { "linkedAccounts.provider": 1, "linkedAccounts.providerId": 1 },
  { sparse: true },
);

userSchema.methods.setPassword = async function (
  this: UserDocument,
  plaintext: string,
) {
  this.passwordHash = await bcrypt.hash(plaintext, BCRYPT_ROUNDS);
  this.credentialsChangedAt = nowToSecond();
};

userSchema.methods.verifyPassword = async function (
  this: UserDocument,
  candidate: string,
) {
  if (!this.passwordHash) return false;
  return bcrypt.compare(candidate, this.passwordHash);
};

userSchema.methods.isLocked = function (this: UserDocument) {
  return Boolean(this.lockedUntil && this.lockedUntil.getTime() > Date.now());
};

userSchema.methods.toDTO = function (this: UserDocument): UserDTO {
  const providers: AuthProvider[] = [
    ...(this.passwordHash ? (["local"] as const) : []),
    ...this.linkedAccounts.map((a) => a.provider),
  ];
  return {
    id: this._id.toString(),
    name: this.name,
    email: this.email,
    role: this.role,
    isEmailVerified: this.isEmailVerified,
    avatarUrl: this.avatarUrl ?? null,

    authProviders: providers,
    createdAt: this.createdAt.toISOString(),
  };
};

export const User = model<UserAttrs, UserModel>("User", userSchema);
