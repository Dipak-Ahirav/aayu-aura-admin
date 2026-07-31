import mongoose, { Schema, Types } from 'mongoose';
import type { PublicCheckoutPaymentMethod } from '@aayu-aura/shared-types';

export interface PaymentGatewayOrderDocument {
  provider: 'razorpay';
  providerOrderId: string;
  providerPaymentId?: string;
  orderId: Types.ObjectId;
  orderNumber: string;
  amountInPaise: number;
  currency: 'INR';
  paymentMethod: Exclude<PublicCheckoutPaymentMethod, 'COD'>;
  customerUpiId?: string;
  status: 'created' | 'paid' | 'failed';
  signature?: string;
  createdAt: Date;
  updatedAt: Date;
}

const paymentGatewayOrderSchema = new Schema<PaymentGatewayOrderDocument>(
  {
    provider: { type: String, required: true, enum: ['razorpay'], index: true },
    providerOrderId: { type: String, required: true, unique: true, trim: true, index: true },
    providerPaymentId: { type: String, trim: true, index: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    orderNumber: { type: String, required: true, trim: true, index: true },
    amountInPaise: { type: Number, required: true, min: 1 },
    currency: { type: String, required: true, enum: ['INR'], default: 'INR' },
    paymentMethod: { type: String, required: true, trim: true, index: true },
    customerUpiId: { type: String, trim: true },
    status: {
      type: String,
      required: true,
      enum: ['created', 'paid', 'failed'],
      default: 'created',
      index: true,
    },
    signature: { type: String, trim: true },
  },
  { timestamps: true },
);

paymentGatewayOrderSchema.index({ createdAt: -1 });
paymentGatewayOrderSchema.index({ orderId: 1, provider: 1 });

export const PaymentGatewayOrderModel = mongoose.model<PaymentGatewayOrderDocument>(
  'PaymentGatewayOrder',
  paymentGatewayOrderSchema,
);
