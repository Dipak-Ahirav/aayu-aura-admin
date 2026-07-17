import { z } from 'zod';

const objectId = z
  .string()
  .trim()
  .regex(/^[0-9a-fA-F]{24}$/);
const optionalText = z.string().trim().optional().or(z.literal(''));

export const inventoryQuerySchema = z.object({
  search: z.string().trim().optional().default(''),
  segment: z.enum(['all', 'low_stock', 'transactions', 'reservations']).optional().default('all'),
  stockStatus: z.enum(['all', 'in_stock', 'low_stock', 'out_of_stock']).optional().default('all'),
  warehouse: z.string().trim().optional().default('all'),
  sort: z
    .enum(['name_asc', 'name_desc', 'available_asc', 'available_desc', 'newest'])
    .optional()
    .default('name_asc'),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(5).max(100).optional().default(10),
});

export const createStockMovementSchema = z.object({
  productId: objectId,
  warehouse: optionalText,
  movementType: z
    .enum(['adjustment', 'damage', 'return', 'reservation', 'release', 'purchase_receipt'])
    .default('adjustment'),
  direction: z.enum(['in', 'out']),
  quantity: z.coerce.number().int().min(1).max(1_000_000),
  reason: optionalText,
  reference: optionalText,
  notes: optionalText,
});

export const updateStockMovementSchema = z.object({
  warehouse: optionalText,
  reason: optionalText,
  reference: optionalText,
  notes: optionalText,
});

export type InventoryQueryInput = z.infer<typeof inventoryQuerySchema>;
export type CreateStockMovementInput = z.infer<typeof createStockMovementSchema>;
export type UpdateStockMovementInput = z.infer<typeof updateStockMovementSchema>;
