import { z } from 'zod';

const objectId = z
  .string()
  .trim()
  .regex(/^[0-9a-fA-F]{24}$/);
const paise = z.coerce.number().int().min(0).max(100_000_000);
const optionalText = z.string().trim().optional().or(z.literal(''));

export const purchaseQuerySchema = z.object({
  search: z.string().trim().optional().default(''),
  status: z
    .enum(['all', 'Draft', 'Ordered', 'Partially received', 'Received', 'Cancelled'])
    .optional()
    .default('all'),
  supplierId: z.string().trim().optional().default('all'),
  segment: z.enum(['all', 'draft', 'ordered', 'received']).optional().default('all'),
  sort: z.enum(['newest', 'oldest', 'amount_desc', 'due_desc']).optional().default('newest'),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(5).max(100).optional().default(10),
});

export const createPurchaseSchema = z.object({
  supplierId: objectId,
  purchaseDate: z.string().trim().datetime().optional().or(z.literal('')),
  expectedReceiptDate: z.string().trim().datetime().optional().or(z.literal('')),
  supplierInvoiceNumber: optionalText,
  items: z
    .array(
      z.object({
        productId: objectId.optional().or(z.literal('')),
        productName: z.string().trim().min(2),
        sku: optionalText,
        hsn: optionalText,
        quantity: z.coerce.number().int().min(1).max(10000),
        receivedQuantity: z.coerce.number().int().min(0).optional().default(0),
        unitCostInPaise: paise,
        discountInPaise: paise.optional().default(0),
        gstRate: z.coerce.number().min(0).max(28).optional().default(0),
      }),
    )
    .min(1),
  shippingChargeInPaise: paise.optional().default(0),
  otherChargeInPaise: paise.optional().default(0),
  paidAmountInPaise: paise.optional().default(0),
  status: z
    .enum(['Draft', 'Ordered', 'Partially received', 'Received', 'Cancelled'])
    .optional()
    .default('Draft'),
  notes: optionalText,
  internalNotes: optionalText,
});

export const updatePurchaseSchema = createPurchaseSchema.partial();

export type PurchaseQueryInput = z.infer<typeof purchaseQuerySchema>;
export type CreatePurchaseInput = z.infer<typeof createPurchaseSchema>;
export type UpdatePurchaseInput = z.infer<typeof updatePurchaseSchema>;
