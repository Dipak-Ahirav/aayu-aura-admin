import mongoose, { Schema } from 'mongoose';
import type { UserRole } from '@aayu-aura/shared-types';

export interface UserDocument {
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  isActive: boolean;
  failedLoginAttempts: number;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<UserDocument>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true, index: true },
    passwordHash: { type: String, required: true, select: false },
    role: {
      type: String,
      required: true,
      enum: [
        'owner',
        'administrator',
        'accountant',
        'inventory_manager',
        'order_manager',
        'viewer',
      ],
    },
    isActive: { type: Boolean, default: true, index: true },
    failedLoginAttempts: { type: Number, default: 0 },
    lastLoginAt: { type: Date },
  },
  { timestamps: true },
);

export const UserModel = mongoose.model<UserDocument>('User', userSchema);
