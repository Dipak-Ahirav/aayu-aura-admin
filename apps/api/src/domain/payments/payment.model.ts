import mongoose, { Schema, Types } from 'mongoose';
import type { PaymentDirection, PaymentMethod, PaymentStatus } from '@aayu-aura/shared-types';

export interface PaymentDocument {
  paymentNumber: string;
  direction: PaymentDirection;
  status: PaymentStatus;
  orderId?: Types.ObjectId;
  orderNumber?: string;
  invoiceId?: Types.ObjectId;
  invoiceNumber?: string;
  customer?: {
    name: string;
    mobile: string;
    email?: string;
    billingAddress?: string;
    shippingAddress?: string;
    state?: string;
    stateCode?: string;
  };
  amountInPaise: number;
  method: PaymentMethod;
  paymentDate: Date;
  referenceNumber?: string;
  notes?: string;
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new Schema<PaymentDocument>(
  {
    paymentNumber: { type: String, required: true, unique: true, index: true },
    direction: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    status: {
      type: String,
      required: true,
      enum: ['Recorded', 'Reconciled', 'Cancelled'],
      default: 'Recorded',
      index: true,
    },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', index: true },
    orderNumber: { type: String, trim: true, index: true },
    invoiceId: { type: Schema.Types.ObjectId, ref: 'Invoice', index: true },
    invoiceNumber: { type: String, trim: true, index: true },
    customer: {
      name: { type: String, trim: true },
      mobile: { type: String, trim: true, index: true },
      email: { type: String, trim: true, lowercase: true },
      billingAddress: { type: String, trim: true },
      shippingAddress: { type: String, trim: true },
      state: { type: String, trim: true },
      stateCode: { type: String, trim: true },
    },
    amountInPaise: { type: Number, required: true, min: 1, index: true },
    method: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    paymentDate: { type: Date, required: true, index: true },
    referenceNumber: { type: String, trim: true, index: true },
    notes: { type: String, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

paymentSchema.index({ createdAt: -1 });
paymentSchema.index({ orderId: 1, paymentDate: -1 });
paymentSchema.index({ invoiceId: 1, paymentDate: -1 });

export const PaymentModel = mongoose.model<PaymentDocument>('Payment', paymentSchema);
