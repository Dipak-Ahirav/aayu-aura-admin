import { z } from 'zod';

export const publicCartQuoteSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().trim().optional(),
        productSlug: z.string().trim().optional(),
        productCode: z.string().trim().optional(),
        quantity: z.coerce.number().int().min(1).max(20),
      }),
    )
    .max(50)
    .default([]),
  couponCode: z.string().trim().max(40).optional().or(z.literal('')),
  pinCode: z.string().trim().max(12).optional().or(z.literal('')),
});

export type PublicCartQuoteInput = z.infer<typeof publicCartQuoteSchema>;
