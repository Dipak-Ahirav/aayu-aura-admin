import mongoose, { Schema, Types } from 'mongoose';
import type { SettingsBackupStatus } from '@aayu-aura/shared-types';

export interface SettingsBackupDocument {
  backupNumber: string;
  status: SettingsBackupStatus;
  collections: string[];
  records: number;
  fileName: string;
  payload: Record<string, unknown>;
  generatedAt: Date;
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const settingsBackupSchema = new Schema<SettingsBackupDocument>(
  {
    backupNumber: { type: String, required: true, unique: true, index: true },
    status: {
      type: String,
      enum: ['Generated', 'Failed', 'Archived'],
      default: 'Generated',
      index: true,
    },
    collections: { type: [String], default: [] },
    records: { type: Number, required: true, min: 0, default: 0 },
    fileName: { type: String, required: true, trim: true },
    payload: { type: Schema.Types.Mixed, required: true },
    generatedAt: { type: Date, required: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

settingsBackupSchema.index({ createdAt: -1 });

export const SettingsBackupModel = mongoose.model<SettingsBackupDocument>(
  'SettingsBackup',
  settingsBackupSchema,
);
