import mongoose, { Schema, Types } from 'mongoose';
import type { StockMovementDirection, StockMovementType } from '@aayu-aura/shared-types';

export interface StockMovementDocument {
  productId: Types.ObjectId;
  productName: string;
  sku: string;
  warehouse?: string;
  movementType: StockMovementType;
  direction: StockMovementDirection;
  quantity: number;
  previousPhysicalStock: number;
  newPhysicalStock: number;
  previousReservedStock: number;
  newReservedStock: number;
  reason?: string;
  reference?: string;
  notes?: string;
  reversedAt?: Date;
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const stockMovementSchema = new Schema<StockMovementDocument>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    productName: { type: String, required: true, trim: true, index: true },
    sku: { type: String, required: true, trim: true, uppercase: true, index: true },
    warehouse: { type: String, trim: true, index: true },
    movementType: {
      type: String,
      required: true,
      enum: ['adjustment', 'damage', 'return', 'reservation', 'release', 'purchase_receipt'],
      index: true,
    },
    direction: { type: String, required: true, enum: ['in', 'out'], index: true },
    quantity: { type: Number, required: true, min: 1 },
    previousPhysicalStock: { type: Number, required: true, min: 0 },
    newPhysicalStock: { type: Number, required: true, min: 0 },
    previousReservedStock: { type: Number, required: true, min: 0 },
    newReservedStock: { type: Number, required: true, min: 0 },
    reason: { type: String, trim: true },
    reference: { type: String, trim: true },
    notes: { type: String, trim: true },
    reversedAt: { type: Date, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

stockMovementSchema.index({ createdAt: -1 });
stockMovementSchema.index({ productName: 'text', sku: 'text', reason: 'text', reference: 'text' });

export const StockMovementModel = mongoose.model<StockMovementDocument>(
  'StockMovement',
  stockMovementSchema,
);
