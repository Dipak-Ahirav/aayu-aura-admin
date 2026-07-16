import mongoose, { Schema } from 'mongoose';
import type { CustomerSource, CustomerType } from '@aayu-aura/shared-types';

export interface CustomerDocument {
  name: string;
  mobile: string;
  email?: string;
  billingAddress?: string;
  shippingAddress?: string;
  state?: string;
  stateCode?: string;
  source?: CustomerSource;
  customerType?: CustomerType;
  consentWhatsApp: boolean;
  consentEmail: boolean;
  internalNotes?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const customerSchema = new Schema<CustomerDocument>(
  {
    name: { type: String, required: true, trim: true },
    mobile: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    billingAddress: { type: String, trim: true },
    shippingAddress: { type: String, trim: true },
    state: { type: String, trim: true },
    stateCode: { type: String, trim: true },
    source: {
      type: String,
      trim: true,
      default: 'Admin',
      index: true,
    },
    customerType: {
      type: String,
      trim: true,
      default: 'Retail',
      index: true,
    },
    consentWhatsApp: { type: Boolean, default: false, index: true },
    consentEmail: { type: Boolean, default: false, index: true },
    internalNotes: { type: String, trim: true },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

customerSchema.index({ mobile: 1 }, { unique: true });
customerSchema.index({ name: 'text', mobile: 'text', email: 'text' });

export const CustomerModel = mongoose.model<CustomerDocument>('Customer', customerSchema);
