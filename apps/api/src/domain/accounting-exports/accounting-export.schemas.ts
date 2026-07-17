import { z } from 'zod';

const voucherType = z.enum([
  'Sales',
  'Purchase',
  'Receipt',
  'Payment',
  'Debit Note',
  'Credit Note',
  'Journal',
  'Stock Journal',
]);

const exportFormat = z.enum(['XML', 'CSV', 'Excel', 'JSON']);

export const accountingExportQuerySchema = z.object({
  search: z.string().trim().optional().default(''),
  tab: z.enum(['mappings', 'ready', 'history', 'errors']).optional().default('mappings'),
  voucherType: z
    .enum(['all', ...voucherType.options])
    .optional()
    .default('all'),
  status: z
    .enum(['all', 'Validation pending', 'Generated', 'Failed', 'Archived'])
    .optional()
    .default('all'),
  format: z
    .enum(['all', ...exportFormat.options])
    .optional()
    .default('all'),
  sort: z.enum(['newest', 'oldest', 'records_desc', 'records_asc']).optional().default('newest'),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(5).max(100).optional().default(10),
});

export const createLedgerMappingSchema = z.object({
  sourceType: z.string().trim().min(2),
  sourceValue: z.string().trim().min(1),
  tallyLedgerName: z.string().trim().min(2),
  voucherType,
  taxLedgerName: z.string().trim().optional().or(z.literal('')),
  isActive: z.boolean().optional().default(true),
  notes: z.string().trim().optional().or(z.literal('')),
});

export const updateLedgerMappingSchema = createLedgerMappingSchema.partial();

export const createAccountingExportSchema = z.object({
  fromDate: z.string().trim().datetime().optional().or(z.literal('')),
  toDate: z.string().trim().datetime().optional().or(z.literal('')),
  format: exportFormat,
  voucherType: z
    .enum(['all', ...voucherType.options])
    .optional()
    .default('all'),
  notes: z.string().trim().optional().or(z.literal('')),
});

export const updateAccountingExportSchema = createAccountingExportSchema.partial().extend({
  status: z.enum(['Validation pending', 'Generated', 'Failed', 'Archived']).optional(),
});

export type AccountingExportQueryInput = z.infer<typeof accountingExportQuerySchema>;
export type CreateLedgerMappingInput = z.infer<typeof createLedgerMappingSchema>;
export type UpdateLedgerMappingInput = z.infer<typeof updateLedgerMappingSchema>;
export type CreateAccountingExportInput = z.infer<typeof createAccountingExportSchema>;
export type UpdateAccountingExportInput = z.infer<typeof updateAccountingExportSchema>;
