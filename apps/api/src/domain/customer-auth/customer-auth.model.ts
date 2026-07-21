import mongoose, { Schema, Types } from 'mongoose';
import type { CustomerOAuthProvider } from '@aayu-aura/shared-types';

export interface CustomerCredentialDocument {
  customerId: Types.ObjectId;
  email?: string;
  mobile: string;
  passwordHash?: string;
  providers: {
    provider: CustomerOAuthProvider;
    providerAccountId: string;
    email?: string;
  }[];
  termsAcceptedAt?: Date;
  lastLoginAt?: Date;
  failedLoginAttempts: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const providerSchema = new Schema<CustomerCredentialDocument['providers'][number]>(
  {
    provider: { type: String, enum: ['google'], required: true },
    providerAccountId: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
  },
  { _id: false },
);

const customerCredentialSchema = new Schema<CustomerCredentialDocument>(
  {
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    email: { type: String, trim: true, lowercase: true, sparse: true, index: true },
    mobile: { type: String, required: true, trim: true, index: true },
    passwordHash: { type: String, select: false },
    providers: { type: [providerSchema], default: [] },
    termsAcceptedAt: { type: Date },
    lastLoginAt: { type: Date },
    failedLoginAttempts: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

customerCredentialSchema.index({ mobile: 1 }, { unique: true });
customerCredentialSchema.index({ email: 1 }, { unique: true, sparse: true });
customerCredentialSchema.index(
  { 'providers.provider': 1, 'providers.providerAccountId': 1 },
  { sparse: true },
);

export const CustomerCredentialModel = mongoose.model<CustomerCredentialDocument>(
  'CustomerCredential',
  customerCredentialSchema,
);
