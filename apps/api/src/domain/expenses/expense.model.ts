import mongoose, { Schema, Types } from 'mongoose';
import type { ExpenseStatus } from '@aayu-aura/shared-types';

export interface ExpenseDocument {
  title: string;
  category: string;
  amountInPaise: number;
  taxAmountInPaise: number;
  totalInPaise: number;
  paymentMethod: string;
  status: ExpenseStatus;
  expenseDate: Date;
  vendor?: string;
  referenceNumber?: string;
  proofUrl?: string;
  notes?: string;
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const expenseSchema = new Schema<ExpenseDocument>(
  {
    title: { type: String, required: true, trim: true, index: true },
    category: { type: String, required: true, trim: true, index: true },
    amountInPaise: { type: Number, required: true, min: 0 },
    taxAmountInPaise: { type: Number, required: true, min: 0, default: 0 },
    totalInPaise: { type: Number, required: true, min: 0, index: true },
    paymentMethod: { type: String, required: true, trim: true, index: true },
    status: {
      type: String,
      required: true,
      enum: ['Draft', 'Approved', 'Rejected', 'Cancelled'],
      default: 'Draft',
      index: true,
    },
    expenseDate: { type: Date, required: true, index: true },
    vendor: { type: String, trim: true },
    referenceNumber: { type: String, trim: true },
    proofUrl: { type: String, trim: true },
    notes: { type: String, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

expenseSchema.index({ createdAt: -1 });
expenseSchema.index({
  title: 'text',
  category: 'text',
  vendor: 'text',
  referenceNumber: 'text',
  notes: 'text',
});

export const ExpenseModel = mongoose.model<ExpenseDocument>('Expense', expenseSchema);
