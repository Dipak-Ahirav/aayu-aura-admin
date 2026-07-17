import { z } from 'zod';

const auditModule = z.enum([
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
]);

export const auditLogQuerySchema = z.object({
  search: z.string().trim().optional().default(''),
  tab: z.enum(['all', 'security', 'inventory', 'finance']).optional().default('all'),
  module: z
    .enum(['all', ...auditModule.options])
    .optional()
    .default('all'),
  action: z.string().trim().optional().default('all'),
  user: z.string().trim().optional().default('all'),
  severity: z.enum(['all', 'Info', 'Warning', 'Critical']).optional().default('all'),
  reviewed: z.enum(['all', 'reviewed', 'unreviewed']).optional().default('all'),
  sort: z.enum(['newest', 'oldest']).optional().default('newest'),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(5).max(100).optional().default(10),
});

export const createAuditLogSchema = z.object({
  module: auditModule,
  action: z.string().trim().min(2),
  entity: z.string().trim().min(1),
  entityId: z.string().trim().optional().or(z.literal('')),
  userName: z.string().trim().optional().or(z.literal('')),
  userEmail: z.string().trim().email().optional().or(z.literal('')),
  previousValue: z.record(z.string(), z.unknown()).optional(),
  newValue: z.record(z.string(), z.unknown()).optional(),
  severity: z.enum(['Info', 'Warning', 'Critical']).optional().default('Info'),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type AuditLogQueryInput = z.infer<typeof auditLogQuerySchema>;
export type CreateAuditLogInput = z.infer<typeof createAuditLogSchema>;
