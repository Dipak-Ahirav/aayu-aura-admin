import mongoose, { Schema, Types } from 'mongoose';
import type { ProductStatus } from '@aayu-aura/shared-types';

export interface ProductDocument {
  name: string;
  sku: string;
  category?: string;
  status: ProductStatus;
  showInStorefront: boolean;
  purchasePriceInPaise: number;
  landedCostInPaise: number;
  sellingPriceInPaise: number;
  mrpInPaise?: number;
  offerPriceInPaise?: number;
  currentPhysicalStock: number;
  reservedStock: number;
  reorderLevel?: number;
  hsn?: string;
  gstRate?: number;
  coverImageUrl?: string;
  sareeType?: string;
  fabric?: string;
  primaryColour?: string;
  colours?: string[];
  pattern?: string;
  work?: string;
  occasion?: string;
  collection?: string;
  description?: string;
  careInstructions?: string;
  countryOfOrigin?: string;
  sareeLength?: string;
  sareeWidth?: string;
  blouseIncluded?: boolean;
  blouseDetails?: string;
  taxInformation?: string;
  deliveryEstimate?: string;
  codAvailable?: boolean;
  returnWindow?: string;
  isNewArrival?: boolean;
  isBestSeller?: boolean;
  averageRating?: number;
  reviewCount?: number;
  sizeChart?: {
    label: string;
    value: string;
  }[];
  images?: {
    url: string;
    altText?: string;
    sortOrder?: number;
  }[];
  videoUrls?: string[];
  internalNotes?: string;
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const productImageSchema = new Schema(
  {
    url: { type: String, required: true, trim: true },
    altText: { type: String, trim: true },
    sortOrder: { type: Number, min: 0, default: 0 },
  },
  { _id: false },
);

const sizeChartSchema = new Schema(
  {
    label: { type: String, required: true, trim: true },
    value: { type: String, required: true, trim: true },
  },
  { _id: false },
);

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
    showInStorefront: { type: Boolean, required: true, default: true, index: true },
    purchasePriceInPaise: { type: Number, required: true, min: 0 },
    landedCostInPaise: { type: Number, required: true, min: 0 },
    sellingPriceInPaise: { type: Number, required: true, min: 0 },
    mrpInPaise: { type: Number, min: 0 },
    offerPriceInPaise: { type: Number, min: 0 },
    currentPhysicalStock: { type: Number, required: true, min: 0, default: 0, index: true },
    reservedStock: { type: Number, required: true, min: 0, default: 0 },
    reorderLevel: { type: Number, min: 0, default: 5 },
    hsn: { type: String, trim: true },
    gstRate: { type: Number, min: 0, max: 28, default: 0 },
    coverImageUrl: { type: String, trim: true },
    sareeType: { type: String, trim: true, index: true },
    fabric: { type: String, trim: true, index: true },
    primaryColour: { type: String, trim: true, index: true },
    colours: [{ type: String, trim: true }],
    pattern: { type: String, trim: true, index: true },
    work: { type: String, trim: true },
    occasion: { type: String, trim: true, index: true },
    collection: { type: String, trim: true, index: true },
    description: { type: String, trim: true },
    careInstructions: { type: String, trim: true },
    countryOfOrigin: { type: String, trim: true, default: 'India' },
    sareeLength: { type: String, trim: true },
    sareeWidth: { type: String, trim: true },
    blouseIncluded: { type: Boolean, default: true },
    blouseDetails: { type: String, trim: true },
    taxInformation: { type: String, trim: true },
    deliveryEstimate: { type: String, trim: true },
    codAvailable: { type: Boolean, default: true },
    returnWindow: { type: String, trim: true },
    isNewArrival: { type: Boolean, default: false, index: true },
    isBestSeller: { type: Boolean, default: false, index: true },
    averageRating: { type: Number, min: 0, max: 5 },
    reviewCount: { type: Number, min: 0, default: 0 },
    sizeChart: [sizeChartSchema],
    images: [productImageSchema],
    videoUrls: [{ type: String, trim: true }],
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
productSchema.index({
  name: 'text',
  sku: 'text',
  category: 'text',
  sareeType: 'text',
  fabric: 'text',
  primaryColour: 'text',
  occasion: 'text',
  pattern: 'text',
  collection: 'text',
});

export const ProductModel = mongoose.model<ProductDocument>('Product', productSchema);
