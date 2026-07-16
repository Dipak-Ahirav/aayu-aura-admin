import mongoose, { Schema, Types } from 'mongoose';
import type { InvoiceStatus, InvoiceType } from '@aayu-aura/shared-types';
import type { OrderItemDocument } from '../orders/order.model.js';

export interface InvoiceDocument {
  invoiceNumber: string;
  type: InvoiceType;
  status: InvoiceStatus;
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
  items: OrderItemDocument[];
  subtotalInPaise: number;
  itemDiscountInPaise: number;
  taxableAmountInPaise: number;
  taxAmountInPaise: number;
  shippingChargeInPaise: number;
  packagingChargeInPaise: number;
  otherChargeInPaise: number;
  grandTotalInPaise: number;
  paidAmountInPaise: number;
  dueAmountInPaise: number;
  invoiceDate: Date;
  dueDate?: Date;
  notes?: string;
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const invoiceItemSchema = new Schema<OrderItemDocument>(
  {
    productName: { type: String, required: true, trim: true },
    sku: { type: String, trim: true },
    hsn: { type: String, trim: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPriceInPaise: { type: Number, required: true, min: 0 },
    discountInPaise: { type: Number, required: true, min: 0 },
    gstRate: { type: Number, required: true, min: 0, max: 28 },
    taxableAmountInPaise: { type: Number, required: true, min: 0 },
    taxAmountInPaise: { type: Number, required: true, min: 0 },
    lineTotalInPaise: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const invoiceSchema = new Schema<InvoiceDocument>(
  {
    invoiceNumber: { type: String, required: true, unique: true, index: true },
    type: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    status: {
      type: String,
      required: true,
      enum: ['Draft', 'Finalised', 'Cancelled'],
      default: 'Finalised',
      index: true,
    },
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
    items: { type: [invoiceItemSchema], required: true },
    subtotalInPaise: { type: Number, required: true, min: 0 },
    itemDiscountInPaise: { type: Number, required: true, min: 0 },
    taxableAmountInPaise: { type: Number, required: true, min: 0 },
    taxAmountInPaise: { type: Number, required: true, min: 0 },
    shippingChargeInPaise: { type: Number, required: true, min: 0 },
    packagingChargeInPaise: { type: Number, required: true, min: 0 },
    otherChargeInPaise: { type: Number, required: true, min: 0 },
    grandTotalInPaise: { type: Number, required: true, min: 0, index: true },
    paidAmountInPaise: { type: Number, required: true, min: 0 },
    dueAmountInPaise: { type: Number, required: true, min: 0 },
    invoiceDate: { type: Date, required: true, index: true },
    dueDate: { type: Date },
    notes: { type: String, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

invoiceSchema.index({ orderId: 1, type: 1 }, { unique: true });
invoiceSchema.index({ createdAt: -1 });

export const InvoiceModel = mongoose.model<InvoiceDocument>('Invoice', invoiceSchema);
