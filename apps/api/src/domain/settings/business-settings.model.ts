import mongoose, { Schema, Types } from 'mongoose';

export interface BusinessSettingsDocument {
  key: 'business';
  displayName: string;
  legalName?: string;
  currency: 'INR';
  locale: 'en-IN';
  timeZone: 'Asia/Kolkata';
  financialYearStartMonth: 4;
  gstEnabled: boolean;
  gstin?: string;
  pan?: string;
  address?: string;
  state?: string;
  stateCode?: string;
  email?: string;
  phone?: string;
  invoicePrefix?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankIfsc?: string;
  upiId?: string;
  invoiceFooter?: string;
  allowNegativeStock: boolean;
  lowStockAlertEnabled: boolean;
  emailProvider?: string;
  whatsappProvider?: string;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const businessSettingsSchema = new Schema<BusinessSettingsDocument>(
  {
    key: { type: String, required: true, unique: true, default: 'business' },
    displayName: { type: String, required: true, trim: true, default: 'Aayu & Aura' },
    legalName: { type: String, trim: true, default: 'Aayu & Aura' },
    currency: { type: String, enum: ['INR'], default: 'INR' },
    locale: { type: String, enum: ['en-IN'], default: 'en-IN' },
    timeZone: { type: String, enum: ['Asia/Kolkata'], default: 'Asia/Kolkata' },
    financialYearStartMonth: { type: Number, enum: [4], default: 4 },
    gstEnabled: { type: Boolean, default: false },
    gstin: { type: String, trim: true, uppercase: true },
    pan: { type: String, trim: true, uppercase: true },
    address: { type: String, trim: true },
    state: { type: String, trim: true },
    stateCode: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    invoicePrefix: { type: String, trim: true, default: 'AA' },
    bankName: { type: String, trim: true },
    bankAccountNumber: { type: String, trim: true },
    bankIfsc: { type: String, trim: true, uppercase: true },
    upiId: { type: String, trim: true },
    invoiceFooter: { type: String, trim: true },
    allowNegativeStock: { type: Boolean, default: false },
    lowStockAlertEnabled: { type: Boolean, default: true },
    emailProvider: { type: String, trim: true },
    whatsappProvider: { type: String, trim: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

export const BusinessSettingsModel = mongoose.model<BusinessSettingsDocument>(
  'BusinessSettings',
  businessSettingsSchema,
);
