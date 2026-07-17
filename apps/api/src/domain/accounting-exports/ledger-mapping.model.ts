import mongoose, { Schema, Types } from 'mongoose';
import type { AccountingVoucherType } from '@aayu-aura/shared-types';

export interface LedgerMappingDocument {
  sourceType: string;
  sourceValue: string;
  tallyLedgerName: string;
  voucherType: AccountingVoucherType;
  taxLedgerName?: string;
  isActive: boolean;
  notes?: string;
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ledgerMappingSchema = new Schema<LedgerMappingDocument>(
  {
    sourceType: { type: String, required: true, trim: true, index: true },
    sourceValue: { type: String, required: true, trim: true, index: true },
    tallyLedgerName: { type: String, required: true, trim: true, index: true },
    voucherType: {
      type: String,
      required: true,
      enum: [
        'Sales',
        'Purchase',
        'Receipt',
        'Payment',
        'Debit Note',
        'Credit Note',
        'Journal',
        'Stock Journal',
      ],
      index: true,
    },
    taxLedgerName: { type: String, trim: true },
    isActive: { type: Boolean, required: true, default: true, index: true },
    notes: { type: String, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

ledgerMappingSchema.index({ sourceType: 1, sourceValue: 1, voucherType: 1 }, { unique: true });
ledgerMappingSchema.index({
  sourceType: 'text',
  sourceValue: 'text',
  tallyLedgerName: 'text',
  taxLedgerName: 'text',
  notes: 'text',
});

export const LedgerMappingModel = mongoose.model<LedgerMappingDocument>(
  'LedgerMapping',
  ledgerMappingSchema,
);
