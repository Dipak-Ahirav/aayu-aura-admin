import mongoose, { Schema } from 'mongoose';
import type { SupplierStatus } from '@aayu-aura/shared-types';

export interface SupplierDocument {
  name: string;
  contactPerson?: string;
  mobile: string;
  email?: string;
  gstin?: string;
  address?: string;
  state?: string;
  stateCode?: string;
  paymentTermsDays: number;
  openingBalanceInPaise: number;
  currentPayableInPaise: number;
  bankName?: string;
  accountNumber?: string;
  ifsc?: string;
  status: SupplierStatus;
  notes?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const supplierSchema = new Schema<SupplierDocument>(
  {
    name: { type: String, required: true, trim: true },
    contactPerson: { type: String, trim: true },
    mobile: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    gstin: { type: String, trim: true, uppercase: true, index: true },
    address: { type: String, trim: true },
    state: { type: String, trim: true, index: true },
    stateCode: { type: String, trim: true },
    paymentTermsDays: { type: Number, default: 0, min: 0 },
    openingBalanceInPaise: { type: Number, default: 0, min: 0 },
    currentPayableInPaise: { type: Number, default: 0, min: 0, index: true },
    bankName: { type: String, trim: true },
    accountNumber: { type: String, trim: true },
    ifsc: { type: String, trim: true, uppercase: true },
    status: {
      type: String,
      enum: ['active', 'payment_due', 'inactive'],
      default: 'active',
      index: true,
    },
    notes: { type: String, trim: true },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

supplierSchema.index({ mobile: 1 }, { unique: true });
supplierSchema.index({ name: 'text', mobile: 'text', gstin: 'text', email: 'text' });

export const SupplierModel = mongoose.model<SupplierDocument>('Supplier', supplierSchema);
