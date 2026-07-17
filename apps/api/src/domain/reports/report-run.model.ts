import mongoose, { Schema, Types } from 'mongoose';
import type {
  ReportCategory,
  ReportFormat,
  ReportPeriod,
  ReportStatus,
} from '@aayu-aura/shared-types';

export interface ReportRunDocument {
  reportName: string;
  category: ReportCategory;
  period: ReportPeriod;
  periodLabel: string;
  records: number;
  formats: ReportFormat[];
  status: ReportStatus;
  generatedAt: Date;
  notes?: string;
  snapshot?: Record<string, unknown>;
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const reportRunSchema = new Schema<ReportRunDocument>(
  {
    reportName: { type: String, required: true, trim: true, index: true },
    category: {
      type: String,
      required: true,
      enum: ['Sales', 'Inventory', 'Finance', 'GST'],
      index: true,
    },
    period: {
      type: String,
      required: true,
      enum: ['today', 'last_7_days', 'current_month', 'previous_month', 'financial_year'],
      index: true,
    },
    periodLabel: { type: String, required: true, trim: true },
    records: { type: Number, required: true, min: 0, default: 0 },
    formats: {
      type: [String],
      enum: ['CSV', 'Excel', 'PDF'],
      default: ['CSV'],
    },
    status: {
      type: String,
      required: true,
      enum: ['Ready', 'Draft', 'Failed', 'Archived'],
      default: 'Ready',
      index: true,
    },
    generatedAt: { type: Date, required: true, index: true },
    notes: { type: String, trim: true },
    snapshot: { type: Schema.Types.Mixed },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

reportRunSchema.index({ createdAt: -1 });
reportRunSchema.index({ reportName: 'text', category: 'text', periodLabel: 'text', notes: 'text' });

export const ReportRunModel = mongoose.model<ReportRunDocument>('ReportRun', reportRunSchema);
