import { z } from 'zod';

const optionalText = z.string().trim().optional().or(z.literal(''));

export const masterDataQuerySchema = z.object({
  search: z.string().trim().optional().default(''),
  type: z
    .enum(['all', 'Catalogue', 'Inventory', 'Finance', 'Order setup'])
    .optional()
    .default('all'),
  status: z.enum(['all', 'active', 'inactive', 'protected']).optional().default('all'),
  sort: z
    .enum(['newest', 'oldest', 'master_asc', 'value_asc', 'sort_order'])
    .optional()
    .default('newest'),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(5).max(100).optional().default(10),
});

export const createMasterDataSchema = z.object({
  master: z.string().trim().min(2),
  type: z.enum(['Catalogue', 'Inventory', 'Finance', 'Order setup']),
  value: z.string().trim().min(2),
  code: optionalText,
  description: optionalText,
  sortOrder: z.coerce.number().int().min(0).optional().default(0),
  status: z.enum(['active', 'inactive', 'protected']).optional().default('active'),
  isProtected: z.coerce.boolean().optional().default(false),
  usedByRecords: z.coerce.number().int().min(0).optional().default(0),
});

export const updateMasterDataSchema = createMasterDataSchema.partial();

export type MasterDataQueryInput = z.infer<typeof masterDataQuerySchema>;
export type CreateMasterDataInput = z.infer<typeof createMasterDataSchema>;
export type UpdateMasterDataInput = z.infer<typeof updateMasterDataSchema>;
