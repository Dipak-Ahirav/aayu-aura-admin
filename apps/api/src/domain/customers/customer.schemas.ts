import { z } from 'zod';

const optionalText = z.string().trim().optional().or(z.literal(''));

export const customerQuerySchema = z.object({
  search: z.string().trim().optional().default(''),
  status: z.enum(['all', 'active', 'inactive']).optional().default('all'),
  source: z.string().trim().optional().default('all'),
  customerType: z.string().trim().optional().default('all'),
  segment: z.enum(['all', 'outstanding', 'repeat', 'inactive']).optional().default('all'),
  sort: z
    .enum(['newest', 'oldest', 'name_asc', 'name_desc', 'lifetime_desc', 'outstanding_desc'])
    .optional()
    .default('newest'),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(5).max(100).optional().default(10),
});

export const createCustomerSchema = z.object({
  name: z.string().trim().min(2),
  mobile: z.string().trim().min(8),
  email: z.string().trim().email().optional().or(z.literal('')),
  billingAddress: optionalText,
  shippingAddress: optionalText,
  state: optionalText,
  stateCode: optionalText,
  source: z.string().trim().min(1).optional().default('Admin'),
  customerType: z.string().trim().min(1).optional().default('Retail'),
  consentWhatsApp: z.coerce.boolean().optional().default(false),
  consentEmail: z.coerce.boolean().optional().default(false),
  internalNotes: optionalText,
});

export const updateCustomerSchema = createCustomerSchema.partial().extend({
  isActive: z.coerce.boolean().optional(),
});

export type CustomerQueryInput = z.infer<typeof customerQuerySchema>;
export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
