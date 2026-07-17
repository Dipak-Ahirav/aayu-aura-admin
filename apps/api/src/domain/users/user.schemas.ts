import { z } from 'zod';

const userRole = z.enum([
  'owner',
  'administrator',
  'accountant',
  'inventory_manager',
  'order_manager',
  'viewer',
]);

export const userQuerySchema = z.object({
  search: z.string().trim().optional().default(''),
  role: z
    .enum(['all', ...userRole.options])
    .optional()
    .default('all'),
  status: z.enum(['all', 'active', 'inactive']).optional().default('all'),
  tab: z.enum(['users', 'roles', 'permissions', 'inactive']).optional().default('users'),
  sort: z
    .enum(['newest', 'oldest', 'name_asc', 'name_desc', 'last_login'])
    .optional()
    .default('newest'),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(5).max(100).optional().default(10),
});

export const createAdminUserSchema = z.object({
  name: z.string().trim().min(2),
  email: z.string().trim().email(),
  role: userRole,
  temporaryPassword: z.string().min(8),
  isActive: z.boolean().optional().default(true),
});

export const updateAdminUserSchema = createAdminUserSchema
  .omit({ temporaryPassword: true })
  .partial()
  .extend({
    temporaryPassword: z.string().min(8).optional(),
  });

export type UserQueryInput = z.infer<typeof userQuerySchema>;
export type CreateAdminUserInput = z.infer<typeof createAdminUserSchema>;
export type UpdateAdminUserInput = z.infer<typeof updateAdminUserSchema>;
