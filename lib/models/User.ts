/**
 * lib/models/User.ts
 * Mongoose model for system users (citizens, police, admins).
 */
import mongoose, { Schema, Document, Model } from "mongoose";
import crypto from "crypto";

export interface IUser extends Document {
  userId: string;
  email: string;
  passwordHash: string;
  name: string;
  role: "citizen" | "police" | "admin";
  walletAddress?: string;
  /** Jurisdiction pincode for police officers. */
  pincode?: string;
  /** Citizen profile fields */
  gender?: "male" | "female" | "other";
  phone?: string;
  /** Aadhaar stored masked — last 4 digits only e.g. XXXX-XXXX-1234 */
  aadhaarMasked?: string;
  dateOfBirth?: string;
  /** Police profile fields */
  badgeNumber?: string;
  policeStation?: string;
  /** Email verification */
  emailVerified: boolean;
  emailOTP?: string;
  emailOTPExpiry?: Date;
  /** Hashed reset token (sha256 of the plaintext token sent in the email) */
  passwordResetToken?: string;
  /** Token expiry — valid for 1 hour from issue */
  passwordResetExpiry?: Date;
  createdAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    userId: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true },
    role: { type: String, enum: ["citizen", "police", "admin"], required: true },
    walletAddress: { type: String },
    pincode: { type: String, index: true },
    gender: { type: String, enum: ["male", "female", "other"] },
    phone: { type: String },
    aadhaarMasked: { type: String },
    dateOfBirth: { type: String },
    badgeNumber: { type: String },
    policeStation: { type: String },
    emailVerified: { type: Boolean, default: false },
    emailOTP: { type: String },
    emailOTPExpiry: { type: Date },
    passwordResetToken: { type: String },
    passwordResetExpiry: { type: Date },
  },
  { timestamps: true }
);

// Password hashing helpers (PBKDF2 via Node crypto — no extra deps needed)
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 100_000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  const test = crypto.pbkdf2Sync(password, salt, 100_000, 64, "sha512").toString("hex");
  return hash === test;
}

const UserModel: Model<IUser> =
  (mongoose.models.User as Model<IUser>) ||
  mongoose.model<IUser>("User", UserSchema);

export default UserModel;
