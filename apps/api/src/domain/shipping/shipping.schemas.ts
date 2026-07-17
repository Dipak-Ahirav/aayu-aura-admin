import { z } from 'zod';

const objectId = z
  .string()
  .trim()
  .regex(/^[0-9a-fA-F]{24}$/);
const optionalText = z.string().trim().optional().or(z.literal(''));

export const shippingQuerySchema = z.object({
  search: z.string().trim().optional().default(''),
  status: z
    .enum(['all', 'Ready', 'Shipped', 'In transit', 'Delivered', 'Delayed', 'Cancelled'])
    .optional()
    .default('all'),
  courier: z.string().trim().optional().default('all'),
  segment: z.enum(['ready', 'shipped', 'delivered', 'delayed']).optional().default('ready'),
  sort: z.enum(['newest', 'oldest', 'expected_asc', 'expected_desc']).optional().default('newest'),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(5).max(100).optional().default(10),
});

export const createShipmentSchema = z.object({
  orderId: objectId,
  courier: z.string().trim().min(2),
  trackingNumber: optionalText,
  status: z
    .enum(['Ready', 'Shipped', 'In transit', 'Delivered', 'Delayed', 'Cancelled'])
    .optional()
    .default('Ready'),
  dispatchDate: z.string().trim().datetime().optional().or(z.literal('')),
  expectedDeliveryDate: z.string().trim().datetime().optional().or(z.literal('')),
  deliveredAt: z.string().trim().datetime().optional().or(z.literal('')),
  packageWeightGrams: z.coerce.number().int().min(0).max(1_000_000).optional().default(0),
  packageCount: z.coerce.number().int().min(1).max(100).optional().default(1),
  notes: optionalText,
});

export const updateShipmentSchema = createShipmentSchema.partial();

export type ShippingQueryInput = z.infer<typeof shippingQuerySchema>;
export type CreateShipmentInput = z.infer<typeof createShipmentSchema>;
export type UpdateShipmentInput = z.infer<typeof updateShipmentSchema>;
