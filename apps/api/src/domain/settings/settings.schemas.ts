import { z } from 'zod';

const optionalText = z.string().trim().optional().or(z.literal(''));

export const settingsQuerySchema = z.object({
  search: z.string().trim().optional().default(''),
  section: z.string().trim().optional().default('all'),
  configured: z.enum(['all', 'configured', 'partial', 'missing']).optional().default('all'),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(5).max(100).optional().default(10),
});

export const updateBusinessSettingsSchema = z.object({
  displayName: z.string().trim().min(2).optional(),
  legalName: optionalText,
  gstEnabled: z.boolean().optional(),
  gstin: optionalText,
  pan: optionalText,
  address: optionalText,
  state: optionalText,
  stateCode: optionalText,
  email: z.string().trim().email().optional().or(z.literal('')),
  phone: optionalText,
  invoicePrefix: optionalText,
  bankName: optionalText,
  bankAccountNumber: optionalText,
  bankIfsc: optionalText,
  upiId: optionalText,
  invoiceFooter: optionalText,
  allowNegativeStock: z.boolean().optional(),
  lowStockAlertEnabled: z.boolean().optional(),
  emailProvider: optionalText,
  whatsappProvider: optionalText,
});

export const createSettingsBackupSchema = z.object({
  collections: z.array(z.string().trim().min(1)).optional().default([]),
});

export type SettingsQueryInput = z.infer<typeof settingsQuerySchema>;
export type UpdateBusinessSettingsInput = z.infer<typeof updateBusinessSettingsSchema>;
export type CreateSettingsBackupInput = z.infer<typeof createSettingsBackupSchema>;
