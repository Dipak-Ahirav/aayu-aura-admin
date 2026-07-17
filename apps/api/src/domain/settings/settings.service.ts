import mongoose, { Types } from 'mongoose';
import type {
  BusinessSettingsDto,
  SettingsBackupDto,
  SettingsListDto,
  SettingsSectionDto,
  SettingsSummaryDto,
} from '@aayu-aura/shared-types';
import { AppError } from '../../infrastructure/http/app-error.js';
import { recordAudit } from '../audit-logs/audit-recorder.js';
import { CounterModel } from '../counters/counter.model.js';
import { BusinessSettingsModel, type BusinessSettingsDocument } from './business-settings.model.js';
import { SettingsBackupModel, type SettingsBackupDocument } from './settings-backup.model.js';
import type {
  CreateSettingsBackupInput,
  SettingsQueryInput,
  UpdateBusinessSettingsInput,
} from './settings.schemas.js';

const DEFAULT_BACKUP_COLLECTIONS = [
  'businesssettings',
  'products',
  'orders',
  'customers',
  'suppliers',
  'purchases',
  'stockmovements',
  'payments',
  'invoices',
  'shipments',
  'returnrequests',
  'expenses',
  'accountingexports',
  'users',
  'auditlogs',
];

function cleanText(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function toBusinessDto(
  settings: BusinessSettingsDocument & { _id: Types.ObjectId },
): BusinessSettingsDto {
  return {
    displayName: settings.displayName,
    legalName: settings.legalName,
    currency: settings.currency,
    locale: settings.locale,
    timeZone: settings.timeZone,
    financialYearStartMonth: settings.financialYearStartMonth,
    gstEnabled: settings.gstEnabled,
    gstin: settings.gstin,
    pan: settings.pan,
    address: settings.address,
    state: settings.state,
    stateCode: settings.stateCode,
    email: settings.email,
    phone: settings.phone,
    invoicePrefix: settings.invoicePrefix,
    bankName: settings.bankName,
    bankAccountNumber: settings.bankAccountNumber,
    bankIfsc: settings.bankIfsc,
    upiId: settings.upiId,
    invoiceFooter: settings.invoiceFooter,
    allowNegativeStock: settings.allowNegativeStock,
    lowStockAlertEnabled: settings.lowStockAlertEnabled,
    emailProvider: settings.emailProvider,
    whatsappProvider: settings.whatsappProvider,
    updatedAt: settings.updatedAt.toISOString(),
  };
}

function toBackupDto(backup: SettingsBackupDocument & { _id: Types.ObjectId }): SettingsBackupDto {
  return {
    id: backup._id.toString(),
    backupNumber: backup.backupNumber,
    status: backup.status,
    collections: backup.collections,
    records: backup.records,
    fileName: backup.fileName,
    generatedAt: backup.generatedAt.toISOString(),
    createdAt: backup.createdAt.toISOString(),
  };
}

function completionStatus(completed: number, total: number): 'Configured' | 'Partial' | 'Missing' {
  if (completed >= total) return 'Configured';
  if (completed > 0) return 'Partial';
  return 'Missing';
}

function configuredText(completed: number, total: number): string {
  return `${completed}/${total} fields`;
}

function sectionsFor(
  settings: BusinessSettingsDocument & { _id: Types.ObjectId },
  latestBackup?: SettingsBackupDocument & { _id: Types.ObjectId },
): SettingsSectionDto[] {
  const businessFields = [
    settings.displayName,
    settings.legalName,
    settings.address,
    settings.state,
    settings.email,
    settings.phone,
  ].filter(Boolean).length;
  const billingFields = [
    settings.invoicePrefix,
    settings.bankName,
    settings.bankAccountNumber,
    settings.bankIfsc,
    settings.upiId,
    settings.gstEnabled ? settings.gstin : 'gst-disabled',
  ].filter(Boolean).length;
  const inventoryFields = [
    settings.allowNegativeStock !== undefined,
    settings.lowStockAlertEnabled !== undefined,
  ].filter(Boolean).length;
  const communicationFields = [settings.emailProvider, settings.whatsappProvider].filter(
    Boolean,
  ).length;

  return [
    {
      section: 'Business profile',
      configured: configuredText(businessFields, 6),
      critical: true,
      status: completionStatus(businessFields, 6),
    },
    {
      section: 'Billing and invoice',
      configured: configuredText(billingFields, 6),
      critical: true,
      status: completionStatus(billingFields, 6),
    },
    {
      section: 'Inventory rules',
      configured: configuredText(inventoryFields, 2),
      critical: false,
      status: completionStatus(inventoryFields, 2),
    },
    {
      section: 'Communication',
      configured: configuredText(communicationFields, 2),
      critical: false,
      status: completionStatus(communicationFields, 2),
    },
    {
      section: 'Data safety',
      configured: latestBackup ? latestBackup.generatedAt.toISOString().slice(0, 10) : 'No backup',
      critical: true,
      status: latestBackup ? 'Configured' : 'Missing',
    },
  ];
}

function summaryFor(
  settings: BusinessSettingsDocument & { _id: Types.ObjectId },
  sections: SettingsSectionDto[],
  backups: number,
): SettingsSummaryDto {
  return {
    businessProfile:
      sections.find((section) => section.section === 'Business profile')?.status ?? 'Missing',
    gst: settings.gstEnabled ? 'Enabled' : 'Disabled',
    whatsapp: settings.whatsappProvider ?? 'Not set',
    email: settings.emailProvider ?? 'Not set',
    sections: sections.length,
    backups,
  };
}

function filterSections(
  sections: SettingsSectionDto[],
  input: SettingsQueryInput,
): SettingsSectionDto[] {
  const search = input.search.toLowerCase();
  return sections.filter((section) => {
    const matchesSearch =
      !search ||
      section.section.toLowerCase().includes(search) ||
      section.status.toLowerCase().includes(search) ||
      section.configured.toLowerCase().includes(search);
    const matchesSection =
      input.section === 'all' ||
      section.section.toLowerCase().replace(/\s+/g, '-') === input.section;
    const matchesConfigured =
      input.configured === 'all' || section.status.toLowerCase() === input.configured;
    return matchesSearch && matchesSection && matchesConfigured;
  });
}

async function nextBackupNumber(): Promise<string> {
  const counter = await CounterModel.findOneAndUpdate(
    { _id: 'settings_backup' },
    { $inc: { sequence: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
  return `BKP-${String(counter.sequence).padStart(4, '0')}`;
}

export class SettingsService {
  async ensureBusinessSettings(): Promise<BusinessSettingsDocument & { _id: Types.ObjectId }> {
    const existing = await BusinessSettingsModel.findOne({ key: 'business' });
    if (existing) return existing;
    return BusinessSettingsModel.create({
      key: 'business',
      displayName: 'Aayu & Aura',
      legalName: 'Aayu & Aura',
      currency: 'INR',
      locale: 'en-IN',
      timeZone: 'Asia/Kolkata',
      financialYearStartMonth: 4,
      gstEnabled: false,
      invoicePrefix: 'AA',
      allowNegativeStock: false,
      lowStockAlertEnabled: true,
    });
  }

  async list(input: SettingsQueryInput): Promise<SettingsListDto> {
    const skip = (input.page - 1) * input.pageSize;
    const [settings, backups, backupCount] = await Promise.all([
      this.ensureBusinessSettings(),
      SettingsBackupModel.find().sort({ generatedAt: -1 }).limit(10),
      SettingsBackupModel.countDocuments(),
    ]);
    const sections = sectionsFor(settings, backups[0]);
    const filteredSections = filterSections(sections, input);

    return {
      business: toBusinessDto(settings),
      sections: filteredSections.slice(skip, skip + input.pageSize),
      backups: backups.map((backup) => toBackupDto(backup)),
      total: filteredSections.length,
      page: input.page,
      pageSize: input.pageSize,
      summary: summaryFor(settings, sections, backupCount),
    };
  }

  async getBusiness(): Promise<BusinessSettingsDto> {
    return toBusinessDto(await this.ensureBusinessSettings());
  }

  async updateBusiness(
    input: UpdateBusinessSettingsInput,
    userId?: string,
  ): Promise<BusinessSettingsDto> {
    const existing = await this.ensureBusinessSettings();
    const previous = toBusinessDto(existing);
    const payload = {
      ...(input.displayName !== undefined ? { displayName: input.displayName.trim() } : {}),
      ...(input.legalName !== undefined ? { legalName: cleanText(input.legalName) } : {}),
      ...(input.gstEnabled !== undefined ? { gstEnabled: input.gstEnabled } : {}),
      ...(input.gstin !== undefined ? { gstin: cleanText(input.gstin)?.toUpperCase() } : {}),
      ...(input.pan !== undefined ? { pan: cleanText(input.pan)?.toUpperCase() } : {}),
      ...(input.address !== undefined ? { address: cleanText(input.address) } : {}),
      ...(input.state !== undefined ? { state: cleanText(input.state) } : {}),
      ...(input.stateCode !== undefined ? { stateCode: cleanText(input.stateCode) } : {}),
      ...(input.email !== undefined ? { email: cleanText(input.email)?.toLowerCase() } : {}),
      ...(input.phone !== undefined ? { phone: cleanText(input.phone) } : {}),
      ...(input.invoicePrefix !== undefined
        ? { invoicePrefix: cleanText(input.invoicePrefix) }
        : {}),
      ...(input.bankName !== undefined ? { bankName: cleanText(input.bankName) } : {}),
      ...(input.bankAccountNumber !== undefined
        ? { bankAccountNumber: cleanText(input.bankAccountNumber) }
        : {}),
      ...(input.bankIfsc !== undefined
        ? { bankIfsc: cleanText(input.bankIfsc)?.toUpperCase() }
        : {}),
      ...(input.upiId !== undefined ? { upiId: cleanText(input.upiId) } : {}),
      ...(input.invoiceFooter !== undefined
        ? { invoiceFooter: cleanText(input.invoiceFooter) }
        : {}),
      ...(input.allowNegativeStock !== undefined
        ? { allowNegativeStock: input.allowNegativeStock }
        : {}),
      ...(input.lowStockAlertEnabled !== undefined
        ? { lowStockAlertEnabled: input.lowStockAlertEnabled }
        : {}),
      ...(input.emailProvider !== undefined
        ? { emailProvider: cleanText(input.emailProvider) }
        : {}),
      ...(input.whatsappProvider !== undefined
        ? { whatsappProvider: cleanText(input.whatsappProvider) }
        : {}),
      ...(userId ? { updatedBy: new Types.ObjectId(userId) } : {}),
    };

    const updated = await BusinessSettingsModel.findByIdAndUpdate(
      existing._id,
      { $set: payload },
      { new: true },
    );
    if (!updated)
      throw new AppError(404, 'SETTINGS_NOT_FOUND', 'Business settings were not found.');
    const dto = toBusinessDto(updated);
    await recordAudit({
      module: 'Settings',
      action: 'Update business settings',
      entity: 'BusinessSettings',
      entityId: updated._id.toString(),
      userId,
      previousValue: previous as unknown as Record<string, unknown>,
      newValue: dto as unknown as Record<string, unknown>,
      severity: 'Warning',
    });
    return dto;
  }

  async createBackup(
    input: CreateSettingsBackupInput,
    userId?: string,
  ): Promise<SettingsBackupDto> {
    const db = mongoose.connection.db;
    if (!db) throw new AppError(503, 'DATABASE_NOT_READY', 'Database connection is not ready.');

    const requestedCollections = input.collections.length
      ? input.collections
      : DEFAULT_BACKUP_COLLECTIONS;
    const existingCollections = new Set(
      (await db.listCollections().toArray()).map((item) => item.name),
    );
    const collections = requestedCollections.filter((name) => existingCollections.has(name));
    const payload: Record<string, unknown> = {};
    let records = 0;

    for (const collectionName of collections) {
      const rows = await db.collection(collectionName).find({}).limit(1000).toArray();
      payload[collectionName] = rows;
      records += rows.length;
    }

    const backupNumber = await nextBackupNumber();
    const generatedAt = new Date();
    const backup = await SettingsBackupModel.create({
      backupNumber,
      status: 'Generated',
      collections,
      records,
      fileName: `${backupNumber.toLowerCase()}-settings-backup.json`,
      payload: {
        generatedAt: generatedAt.toISOString(),
        collections: payload,
      },
      generatedAt,
      createdBy: userId ? new Types.ObjectId(userId) : undefined,
    });
    const dto = toBackupDto(backup);
    await recordAudit({
      module: 'Settings',
      action: 'Backup data',
      entity: 'SettingsBackup',
      entityId: dto.id,
      userId,
      newValue: dto as unknown as Record<string, unknown>,
      metadata: { backupNumber: dto.backupNumber, records: dto.records },
    });
    return dto;
  }

  async backupFile(id: string): Promise<{ fileName: string; content: string }> {
    const backup = await SettingsBackupModel.findById(id);
    if (!backup)
      throw new AppError(404, 'SETTINGS_BACKUP_NOT_FOUND', 'Settings backup was not found.');
    return {
      fileName: backup.fileName,
      content: JSON.stringify(backup.payload, null, 2),
    };
  }
}
