import { z } from 'zod';

const objectId = z
  .string()
  .trim()
  .regex(/^[0-9a-fA-F]{24}$/);
const optionalText = z.string().trim().optional().or(z.literal(''));
const paise = z.coerce.number().int().min(0).max(100_000_000);

export const returnsQuerySchema = z.object({
  search: z.string().trim().optional().default(''),
  status: z
    .enum([
      'all',
      'Requested',
      'Inspection',
      'Refund due',
      'Exchange pending',
      'Closed',
      'Rejected',
      'Cancelled',
    ])
    .optional()
    .default('all'),
  inspectionResult: z
    .enum(['all', 'Pending', 'Sellable', 'Damaged', 'Missing item', 'Rejected'])
    .optional()
    .default('all'),
  segment: z.enum(['requests', 'inspection', 'refunds', 'closed']).optional().default('requests'),
  sort: z.enum(['newest', 'oldest', 'refund_desc']).optional().default('newest'),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(5).max(100).optional().default(10),
});

export const createReturnSchema = z.object({
  orderId: objectId,
  reason: z.string().trim().min(2),
  status: z
    .enum([
      'Requested',
      'Inspection',
      'Refund due',
      'Exchange pending',
      'Closed',
      'Rejected',
      'Cancelled',
    ])
    .optional()
    .default('Requested'),
  inspectionResult: z
    .enum(['Pending', 'Sellable', 'Damaged', 'Missing item', 'Rejected'])
    .optional()
    .default('Pending'),
  resolution: z.enum(['Refund', 'Exchange', 'Store credit', 'Reject']).optional().default('Refund'),
  refundAmountInPaise: paise.optional().default(0),
  exchangeProductName: optionalText,
  exchangeSku: optionalText,
  exchangeAmountInPaise: paise.optional().default(0),
  requestedDate: z.string().trim().datetime().optional().or(z.literal('')),
  inspectedAt: z.string().trim().datetime().optional().or(z.literal('')),
  closedAt: z.string().trim().datetime().optional().or(z.literal('')),
  notes: optionalText,
});

export const updateReturnSchema = createReturnSchema.partial();

export type ReturnsQueryInput = z.infer<typeof returnsQuerySchema>;
export type CreateReturnInput = z.infer<typeof createReturnSchema>;
export type UpdateReturnInput = z.infer<typeof updateReturnSchema>;
