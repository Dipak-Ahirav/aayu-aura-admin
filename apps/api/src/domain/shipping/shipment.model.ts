import mongoose, { Schema, Types } from 'mongoose';
import type { OrderItemDto, ShipmentStatus } from '@aayu-aura/shared-types';

export interface ShipmentDocument {
  shipmentNumber: string;
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
  courier: string;
  trackingNumber?: string;
  status: ShipmentStatus;
  dispatchDate?: Date;
  expectedDeliveryDate?: Date;
  deliveredAt?: Date;
  packageWeightGrams: number;
  packageCount: number;
  notes?: string;
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const itemSchema = new Schema<OrderItemDto>(
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

const shipmentSchema = new Schema<ShipmentDocument>(
  {
    shipmentNumber: { type: String, required: true, unique: true, index: true },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      unique: true,
      index: true,
    },
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
    items: { type: [itemSchema], required: true },
    courier: { type: String, required: true, trim: true, index: true },
    trackingNumber: { type: String, trim: true, index: true },
    status: {
      type: String,
      required: true,
      enum: ['Ready', 'Shipped', 'In transit', 'Delivered', 'Delayed', 'Cancelled'],
      default: 'Ready',
      index: true,
    },
    dispatchDate: { type: Date, index: true },
    expectedDeliveryDate: { type: Date, index: true },
    deliveredAt: { type: Date },
    packageWeightGrams: { type: Number, min: 0, default: 0 },
    packageCount: { type: Number, min: 1, default: 1 },
    notes: { type: String, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

shipmentSchema.index({ createdAt: -1 });
shipmentSchema.index({
  shipmentNumber: 'text',
  orderNumber: 'text',
  courier: 'text',
  trackingNumber: 'text',
});

export const ShipmentModel = mongoose.model<ShipmentDocument>('Shipment', shipmentSchema);
