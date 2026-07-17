import mongoose, { Schema, Types } from 'mongoose';
import type { PurchasePaymentStatus, PurchaseStatus } from '@aayu-aura/shared-types';

export interface PurchaseItemDocument {
  productId?: Types.ObjectId;
  productName: string;
  sku?: string;
  hsn?: string;
  quantity: number;
  receivedQuantity: number;
  unitCostInPaise: number;
  discountInPaise: number;
  gstRate: number;
  taxableAmountInPaise: number;
  taxAmountInPaise: number;
  lineTotalInPaise: number;
}

export interface PurchaseDocument {
  purchaseNumber: string;
  supplierId: Types.ObjectId;
  supplierName: string;
  supplierMobile?: string;
  supplierInvoiceNumber?: string;
  items: PurchaseItemDocument[];
  subtotalInPaise: number;
  itemDiscountInPaise: number;
  taxableAmountInPaise: number;
  taxAmountInPaise: number;
  shippingChargeInPaise: number;
  otherChargeInPaise: number;
  totalInPaise: number;
  paidAmountInPaise: number;
  dueAmountInPaise: number;
  status: PurchaseStatus;
  paymentStatus: PurchasePaymentStatus;
  purchaseDate: Date;
  expectedReceiptDate?: Date;
  receivedAt?: Date;
  notes?: string;
  internalNotes?: string;
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const purchaseItemSchema = new Schema<PurchaseItemDocument>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', index: true },
    productName: { type: String, required: true, trim: true },
    sku: { type: String, trim: true, uppercase: true, index: true },
    hsn: { type: String, trim: true },
    quantity: { type: Number, required: true, min: 1 },
    receivedQuantity: { type: Number, required: true, min: 0, default: 0 },
    unitCostInPaise: { type: Number, required: true, min: 0 },
    discountInPaise: { type: Number, required: true, min: 0, default: 0 },
    gstRate: { type: Number, required: true, min: 0, max: 28, default: 0 },
    taxableAmountInPaise: { type: Number, required: true, min: 0 },
    taxAmountInPaise: { type: Number, required: true, min: 0 },
    lineTotalInPaise: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const purchaseSchema = new Schema<PurchaseDocument>(
  {
    purchaseNumber: { type: String, required: true, unique: true, index: true },
    supplierId: { type: Schema.Types.ObjectId, ref: 'Supplier', required: true, index: true },
    supplierName: { type: String, required: true, trim: true, index: true },
    supplierMobile: { type: String, trim: true },
    supplierInvoiceNumber: { type: String, trim: true, index: true },
    items: {
      type: [purchaseItemSchema],
      required: true,
      validate: [(items: unknown[]) => items.length > 0, 'At least one item is required.'],
    },
    subtotalInPaise: { type: Number, required: true, min: 0 },
    itemDiscountInPaise: { type: Number, required: true, min: 0 },
    taxableAmountInPaise: { type: Number, required: true, min: 0 },
    taxAmountInPaise: { type: Number, required: true, min: 0 },
    shippingChargeInPaise: { type: Number, required: true, min: 0 },
    otherChargeInPaise: { type: Number, required: true, min: 0 },
    totalInPaise: { type: Number, required: true, min: 0, index: true },
    paidAmountInPaise: { type: Number, required: true, min: 0 },
    dueAmountInPaise: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ['Draft', 'Ordered', 'Partially received', 'Received', 'Cancelled'],
      default: 'Draft',
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: ['Unpaid', 'Partially paid', 'Paid'],
      default: 'Unpaid',
      index: true,
    },
    purchaseDate: { type: Date, required: true, index: true },
    expectedReceiptDate: { type: Date },
    receivedAt: { type: Date },
    notes: { type: String, trim: true },
    internalNotes: { type: String, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

purchaseSchema.index({ createdAt: -1 });
purchaseSchema.index({ purchaseNumber: 1, supplierName: 1 });

export const PurchaseModel = mongoose.model<PurchaseDocument>('Purchase', purchaseSchema);
