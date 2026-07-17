import { z } from 'zod';

const optionalText = z.string().trim().optional().or(z.literal(''));
const paise = z.coerce.number().int().min(0).max(100_000_000);

export const supplierQuerySchema = z.object({
  search: z.string().trim().optional().default(''),
  status: z.enum(['all', 'active', 'payment_due', 'inactive']).optional().default('all'),
  state: z.string().trim().optional().default('all'),
  segment: z.enum(['all', 'outstanding', 'inactive']).optional().default('all'),
  sort: z
    .enum(['newest', 'oldest', 'name_asc', 'name_desc', 'payable_desc', 'credit_days'])
    .optional()
    .default('newest'),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(5).max(100).optional().default(10),
});

export const createSupplierSchema = z.object({
  name: z.string().trim().min(2),
  contactPerson: optionalText,
  mobile: z.string().trim().min(8),
  email: z.string().trim().email().optional().or(z.literal('')),
  gstin: optionalText,
  address: optionalText,
  state: optionalText,
  stateCode: optionalText,
  paymentTermsDays: z.coerce.number().int().min(0).max(365).optional().default(0),
  openingBalanceInPaise: paise.optional().default(0),
  currentPayableInPaise: paise.optional().default(0),
  bankName: optionalText,
  accountNumber: optionalText,
  ifsc: optionalText,
  status: z.enum(['active', 'payment_due', 'inactive']).optional().default('active'),
  notes: optionalText,
});

export const updateSupplierSchema = createSupplierSchema.partial().extend({
  isActive: z.coerce.boolean().optional(),
});

export type SupplierQueryInput = z.infer<typeof supplierQuerySchema>;
export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;
export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>;
