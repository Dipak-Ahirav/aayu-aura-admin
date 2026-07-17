import mongoose, { Schema, Types } from 'mongoose';
import type {
  InspectionResult,
  OrderItemDto,
  ReturnResolution,
  ReturnStatus,
} from '@aayu-aura/shared-types';

export interface ReturnRequestDocument {
  returnNumber: string;
  orderId: Types.ObjectId;
  orderNumber: string;
  customer: {
    name: string;
    mobile: string;
    email?: string;
    billingAddress?: string;
    shippingAddress?: string;
    state?: string;
    stateCode?: string;
  };
  items: OrderItemDto[];
  reason: string;
  status: ReturnStatus;
  inspectionResult: InspectionResult;
  resolution: ReturnResolution;
  refundAmountInPaise: number;
  exchangeProductName?: string;
  exchangeSku?: string;
  exchangeAmountInPaise: number;
  requestedDate: Date;
  inspectedAt?: Date;
  closedAt?: Date;
  notes?: string;
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const returnItemSchema = new Schema<OrderItemDto>(
  {
    productName: { type: String, required: true, trim: true },
    sku: { type: String, trim: true },
    hsn: { type: String, trim: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPriceInPaise: { type: Number, required: true, min: 0 },
    discountInPaise: { type: Number, required: true, min: 0 },
    gstRate: { type: Number, required: true, min: 0 },
    taxableAmountInPaise: { type: Number, required: true, min: 0 },
    taxAmountInPaise: { type: Number, required: true, min: 0 },
    lineTotalInPaise: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const returnRequestSchema = new Schema<ReturnRequestDocument>(
  {
    returnNumber: { type: String, required: true, unique: true, index: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    orderNumber: { type: String, required: true, index: true },
    customer: {
      name: { type: String, required: true, trim: true },
      mobile: { type: String, required: true, trim: true, index: true },
      email: { type: String, trim: true, lowercase: true },
      billingAddress: { type: String, trim: true },
      shippingAddress: { type: String, trim: true },
      state: { type: String, trim: true },
      stateCode: { type: String, trim: true },
    },
    items: { type: [returnItemSchema], required: true },
    reason: { type: String, required: true, trim: true, index: true },
    status: {
      type: String,
      required: true,
      enum: [
        'Requested',
        'Inspection',
        'Refund due',
        'Exchange pending',
        'Closed',
        'Rejected',
        'Cancelled',
      ],
      default: 'Requested',
      index: true,
    },
    inspectionResult: {
      type: String,
      required: true,
      enum: ['Pending', 'Sellable', 'Damaged', 'Missing item', 'Rejected'],
      default: 'Pending',
      index: true,
    },
    resolution: {
      type: String,
      required: true,
      enum: ['Refund', 'Exchange', 'Store credit', 'Reject'],
      default: 'Refund',
      index: true,
    },
    refundAmountInPaise: { type: Number, required: true, min: 0, default: 0 },
    exchangeProductName: { type: String, trim: true },
    exchangeSku: { type: String, trim: true, uppercase: true },
    exchangeAmountInPaise: { type: Number, required: true, min: 0, default: 0 },
    requestedDate: { type: Date, required: true, index: true },
    inspectedAt: { type: Date },
    closedAt: { type: Date },
    notes: { type: String, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

returnRequestSchema.index({ createdAt: -1 });
returnRequestSchema.index({
  returnNumber: 'text',
  orderNumber: 'text',
  'customer.name': 'text',
  'customer.mobile': 'text',
  reason: 'text',
});

export const ReturnRequestModel = mongoose.model<ReturnRequestDocument>(
  'ReturnRequest',
  returnRequestSchema,
  'returns',
);
