import { z } from 'zod';

const paise = z.coerce.number().int().min(0).max(100_000_000);

export const createOrderSchema = z.object({
  source: z.string().trim().min(1).default('Admin'),
  customer: z.object({
    name: z.string().trim().min(2),
    mobile: z.string().trim().min(8),
    email: z.string().trim().email().optional().or(z.literal('')),
    billingAddress: z.string().trim().optional(),
    shippingAddress: z.string().trim().optional(),
    state: z.string().trim().optional(),
    stateCode: z.string().trim().optional(),
  }),
  items: z
    .array(
      z.object({
        productName: z.string().trim().min(2),
        sku: z.string().trim().optional(),
        hsn: z.string().trim().optional(),
        quantity: z.coerce.number().int().min(1).max(1000),
        unitPriceInPaise: paise,
        discountInPaise: paise.default(0),
        gstRate: z.coerce.number().min(0).max(28).default(0),
      }),
    )
    .min(1),
  shippingChargeInPaise: paise.default(0),
  packagingChargeInPaise: paise.default(0),
  otherChargeInPaise: paise.default(0),
  advancePaidInPaise: paise.default(0),
  notes: z.string().trim().optional(),
  internalNotes: z.string().trim().optional(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
