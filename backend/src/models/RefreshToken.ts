import {
  Schema,
  model,
  type HydratedDocument,
  type Model,
  type Types,
} from "mongoose";

export interface RefreshTokenAttrs {
  userId: Types.ObjectId;
  tokenHash: string;
  familyId: string;
  expiresAt: Date;
  revokedAt?: Date | null;
  revokedReason?:
    | "logout"
    | "logout_all"
    | "rotated"
    | "reuse_detected"
    | "password_change"
    | null;
  rotatedTo?: string | null;
  userAgent?: string | null;
  ip?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type RefreshTokenDocument = HydratedDocument<RefreshTokenAttrs> & {
  _id: Types.ObjectId;
};
export type RefreshTokenModel = Model<RefreshTokenAttrs>;

const refreshTokenSchema = new Schema<RefreshTokenAttrs, RefreshTokenModel>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    tokenHash: { type: String, required: true, unique: true },
    familyId: { type: String, required: true, index: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
    revokedReason: {
      type: String,
      enum: [
        "logout",
        "logout_all",
        "rotated",
        "reuse_detected",
        "password_change",
        null,
      ],
      default: null,
    },
    rotatedTo: { type: String, default: null },
    userAgent: { type: String, default: null, maxlength: 400 },
    ip: { type: String, default: null, maxlength: 90 },
  },
  { timestamps: true },
);

refreshTokenSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 60 * 60 * 24 },
);

export const RefreshToken = model<RefreshTokenAttrs, RefreshTokenModel>(
  "RefreshToken",
  refreshTokenSchema,
);
