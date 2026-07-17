import mongoose, { Schema, Types } from 'mongoose';
import type {
  AccountingExportFormat,
  AccountingExportStatus,
  AccountingVoucherType,
} from '@aayu-aura/shared-types';

export interface AccountingExportDocument {
  exportNumber: string;
  fromDate: Date;
  toDate: Date;
  format: AccountingExportFormat;
  voucherType: 'all' | AccountingVoucherType;
  records: number;
  status: AccountingExportStatus;
  fileName?: string;
  notes?: string;
  generatedAt: Date;
  payload?: Record<string, unknown>;
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const accountingExportSchema = new Schema<AccountingExportDocument>(
  {
    exportNumber: { type: String, required: true, unique: true, index: true },
    fromDate: { type: Date, required: true, index: true },
    toDate: { type: Date, required: true, index: true },
    format: { type: String, required: true, enum: ['XML', 'CSV', 'Excel', 'JSON'], index: true },
    voucherType: {
      type: String,
      required: true,
      enum: [
        'all',
        'Sales',
        'Purchase',
        'Receipt',
        'Payment',
        'Debit Note',
        'Credit Note',
        'Journal',
        'Stock Journal',
      ],
      default: 'all',
      index: true,
    },
    records: { type: Number, required: true, min: 0, default: 0 },
    status: {
      type: String,
      required: true,
      enum: ['Validation pending', 'Generated', 'Failed', 'Archived'],
      default: 'Generated',
      index: true,
    },
    fileName: { type: String, trim: true },
    notes: { type: String, trim: true },
    generatedAt: { type: Date, required: true, index: true },
    payload: { type: Schema.Types.Mixed },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

accountingExportSchema.index({ createdAt: -1 });
accountingExportSchema.index({ exportNumber: 'text', fileName: 'text', notes: 'text' });

export const AccountingExportModel = mongoose.model<AccountingExportDocument>(
  'AccountingExport',
  accountingExportSchema,
);
