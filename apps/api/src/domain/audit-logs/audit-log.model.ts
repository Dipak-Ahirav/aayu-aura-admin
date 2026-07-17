import mongoose, { Schema, Types } from 'mongoose';
import type { AuditModule, AuditSeverity } from '@aayu-aura/shared-types';

export interface AuditLogDocument {
  module: AuditModule;
  action: string;
  entity: string;
  entityId?: string;
  userId?: Types.ObjectId;
  userName: string;
  userEmail?: string;
  previousValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  severity: AuditSeverity;
  metadata?: Record<string, unknown>;
  reviewed: boolean;
  reviewedAt?: Date;
  reviewedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const auditLogSchema = new Schema<AuditLogDocument>(
  {
    module: {
      type: String,
      required: true,
      enum: [
        'Auth',
        'Products',
        'Inventory',
        'Invoices',
        'Payments',
        'Users',
        'Exports',
        'Settings',
        'Orders',
        'Finance',
      ],
      index: true,
    },
    action: { type: String, required: true, trim: true, index: true },
    entity: { type: String, required: true, trim: true, index: true },
    entityId: { type: String, trim: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    userName: { type: String, required: true, trim: true, default: 'System' },
    userEmail: { type: String, trim: true, lowercase: true },
    previousValue: { type: Schema.Types.Mixed },
    newValue: { type: Schema.Types.Mixed },
    severity: {
      type: String,
      required: true,
      enum: ['Info', 'Warning', 'Critical'],
      default: 'Info',
      index: true,
    },
    metadata: { type: Schema.Types.Mixed },
    reviewed: { type: Boolean, required: true, default: false, index: true },
    reviewedAt: { type: Date },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({
  module: 'text',
  action: 'text',
  entity: 'text',
  entityId: 'text',
  userName: 'text',
  userEmail: 'text',
});

export const AuditLogModel = mongoose.model<AuditLogDocument>('AuditLog', auditLogSchema);
