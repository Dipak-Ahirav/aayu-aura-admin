import mongoose, { Schema, Types } from 'mongoose';
import type { ProductStatus } from '@aayu-aura/shared-types';

export interface ProductDocument {
  name: string;
  sku: string;
  category?: string;
  status: ProductStatus;
  purchasePriceInPaise: number;
  landedCostInPaise: number;
  sellingPriceInPaise: number;
  currentPhysicalStock: number;
  reservedStock: number;
  reorderLevel?: number;
  hsn?: string;
  gstRate?: number;
  coverImageUrl?: string;
  internalNotes?: string;
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const productSchema = new Schema<ProductDocument>(
  {
    name: { type: String, required: true, trim: true, index: true },
    sku: { type: String, required: true, trim: true, unique: true, index: true, uppercase: true },
    category: { type: String, trim: true, index: true },
    status: {
      type: String,
      required: true,
      enum: ['draft', 'active', 'archived'],
      default: 'active',
      index: true,
    },
    purchasePriceInPaise: { type: Number, required: true, min: 0 },
    landedCostInPaise: { type: Number, required: true, min: 0 },
    sellingPriceInPaise: { type: Number, required: true, min: 0 },
    currentPhysicalStock: { type: Number, required: true, min: 0, default: 0, index: true },
    reservedStock: { type: Number, required: true, min: 0, default: 0 },
    reorderLevel: { type: Number, min: 0, default: 5 },
    hsn: { type: String, trim: true },
    gstRate: { type: Number, min: 0, max: 28, default: 0 },
    coverImageUrl: { type: String, trim: true },
    internalNotes: { type: String, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

productSchema.virtual('availableStock').get(function availableStock(this: ProductDocument) {
  return Math.max(this.currentPhysicalStock - this.reservedStock, 0);
});

productSchema.index({ createdAt: -1 });
productSchema.index({ name: 'text', sku: 'text', category: 'text' });

export const ProductModel = mongoose.model<ProductDocument>('Product', productSchema);
