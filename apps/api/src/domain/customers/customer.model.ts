import mongoose, { Schema } from 'mongoose';

export interface CustomerDocument {
  name: string;
  mobile: string;
  email?: string;
  billingAddress?: string;
  shippingAddress?: string;
  state?: string;
  stateCode?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const customerSchema = new Schema<CustomerDocument>(
  {
    name: { type: String, required: true, trim: true },
    mobile: { type: String, required: true, trim: true, index: true },
    email: { type: String, trim: true, lowercase: true },
    billingAddress: { type: String, trim: true },
    shippingAddress: { type: String, trim: true },
    state: { type: String, trim: true },
    stateCode: { type: String, trim: true },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

customerSchema.index({ mobile: 1 }, { unique: true });

export const CustomerModel = mongoose.model<CustomerDocument>('Customer', customerSchema);
