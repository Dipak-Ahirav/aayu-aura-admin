import mongoose, { Schema } from 'mongoose';
import type { MasterDataStatus, MasterDataType } from '@aayu-aura/shared-types';

export interface MasterDataDocument {
  master: string;
  type: MasterDataType;
  value: string;
  code?: string;
  description?: string;
  sortOrder: number;
  status: MasterDataStatus;
  isProtected: boolean;
  usedByRecords: number;
  createdAt: Date;
  updatedAt: Date;
}

const masterDataSchema = new Schema<MasterDataDocument>(
  {
    master: { type: String, required: true, trim: true, index: true },
    type: {
      type: String,
      enum: ['Catalogue', 'Inventory', 'Finance', 'Order setup'],
      required: true,
      index: true,
    },
    value: { type: String, required: true, trim: true },
    code: { type: String, trim: true, uppercase: true },
    description: { type: String, trim: true },
    sortOrder: { type: Number, default: 0, index: true },
    status: {
      type: String,
      enum: ['active', 'inactive', 'protected'],
      default: 'active',
      index: true,
    },
    isProtected: { type: Boolean, default: false, index: true },
    usedByRecords: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

masterDataSchema.index({ master: 1, value: 1 }, { unique: true });
masterDataSchema.index({ master: 'text', value: 'text', code: 'text', description: 'text' });

export const MasterDataModel = mongoose.model<MasterDataDocument>('MasterData', masterDataSchema);
