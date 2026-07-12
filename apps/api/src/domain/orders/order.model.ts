import mongoose, { Schema, Types } from 'mongoose';
import type {
  OrderFulfilmentStatus,
  OrderPaymentStatus,
  OrderSource,
} from '@aayu-aura/shared-types';

export interface OrderItemDocument {
  productName: string;
  sku?: string;
  hsn?: string;
  quantity: number;
  unitPriceInPaise: number;
  discountInPaise: number;
  gstRate: number;
  taxableAmountInPaise: number;
  taxAmountInPaise: number;
  lineTotalInPaise: number;
}

export interface OrderDocument {
  orderNumber: string;
  source: OrderSource;
  customerId?: Types.ObjectId;
  customer: {
    name: string;
    mobile: string;
    email?: string;
    billingAddress?: string;
    shippingAddress?: string;
    state?: string;
    stateCode?: string;
  };
  items: OrderItemDocument[];
  subtotalInPaise: number;
  itemDiscountInPaise: number;
  taxableAmountInPaise: number;
  taxAmountInPaise: number;
  shippingChargeInPaise: number;
  packagingChargeInPaise: number;
  otherChargeInPaise: number;
  totalInPaise: number;
  advancePaidInPaise: number;
  dueAmountInPaise: number;
  paymentStatus: OrderPaymentStatus;
  fulfilmentStatus: OrderFulfilmentStatus;
  status: string;
  orderDate: Date;
  notes?: string;
  internalNotes?: string;
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const orderItemSchema = new Schema<OrderItemDocument>(
  {
    productName: { type: String, required: true, trim: true },
    sku: { type: String, trim: true, index: true },
    hsn: { type: String, trim: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPriceInPaise: { type: Number, required: true, min: 0 },
    discountInPaise: { type: Number, required: true, min: 0, default: 0 },
    gstRate: { type: Number, required: true, min: 0, max: 28, default: 0 },
    taxableAmountInPaise: { type: Number, required: true, min: 0 },
    taxAmountInPaise: { type: Number, required: true, min: 0 },
    lineTotalInPaise: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const orderSchema = new Schema<OrderDocument>(
  {
    orderNumber: { type: String, required: true, unique: true, index: true },
    source: {
      type: String,
      required: true,
      enum: [
        'Admin',
        'WhatsApp',
        'Instagram',
        'Facebook',
        'Phone',
        'Offline',
        'Marketplace',
        'Referral',
      ],
      index: true,
    },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', index: true },
    customer: {
      name: { type: String, required: true, trim: true },
      mobile: { type: String, required: true, trim: true, index: true },
      email: { type: String, trim: true, lowercase: true },
      billingAddress: { type: String, trim: true },
      shippingAddress: { type: String, trim: true },
      state: { type: String, trim: true },
      stateCode: { type: String, trim: true },
    },
    items: {
      type: [orderItemSchema],
      required: true,
      validate: [(items: unknown[]) => items.length > 0, 'At least one item is required.'],
    },
    subtotalInPaise: { type: Number, required: true, min: 0 },
    itemDiscountInPaise: { type: Number, required: true, min: 0 },
    taxableAmountInPaise: { type: Number, required: true, min: 0 },
    taxAmountInPaise: { type: Number, required: true, min: 0 },
    shippingChargeInPaise: { type: Number, required: true, min: 0 },
    packagingChargeInPaise: { type: Number, required: true, min: 0 },
    otherChargeInPaise: { type: Number, required: true, min: 0 },
    totalInPaise: { type: Number, required: true, min: 0, index: true },
    advancePaidInPaise: { type: Number, required: true, min: 0 },
    dueAmountInPaise: { type: Number, required: true, min: 0 },
    paymentStatus: {
      type: String,
      required: true,
      enum: ['Unpaid', 'Partially paid', 'Paid'],
      index: true,
    },
    fulfilmentStatus: {
      type: String,
      required: true,
      enum: [
        'Draft',
        'Pending',
        'Confirmed',
        'Packed',
        'Ready to ship',
        'Shipped',
        'Delivered',
        'Cancelled',
      ],
      index: true,
    },
    status: { type: String, required: true, index: true },
    orderDate: { type: Date, required: true, index: true },
    notes: { type: String, trim: true },
    internalNotes: { type: String, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

orderSchema.index({ createdAt: -1 });
orderSchema.index({ orderNumber: 1, 'customer.mobile': 1 });

export const OrderModel = mongoose.model<OrderDocument>('Order', orderSchema);
