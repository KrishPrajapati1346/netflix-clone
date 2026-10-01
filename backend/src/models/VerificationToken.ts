import {
  Schema,
  model,
  type HydratedDocument,
  type Model,
  type Types,
} from "mongoose";

export type VerificationPurpose = "email_verification" | "password_reset";

export interface VerificationTokenAttrs {
  userId: Types.ObjectId;
  tokenHash: string;
  purpose: VerificationPurpose;
  expiresAt: Date;
  usedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type VerificationTokenDocument =
  HydratedDocument<VerificationTokenAttrs> & {
    _id: Types.ObjectId;
  };

const verificationTokenSchema = new Schema<VerificationTokenAttrs>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    tokenHash: { type: String, required: true, unique: true },
    purpose: {
      type: String,
      enum: ["email_verification", "password_reset"],
      required: true,
    },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

verificationTokenSchema.index({ userId: 1, purpose: 1 });
verificationTokenSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 60 * 60 * 24 },
);

export const VerificationToken = model<
  VerificationTokenAttrs,
  Model<VerificationTokenAttrs>
>("VerificationToken", verificationTokenSchema);
