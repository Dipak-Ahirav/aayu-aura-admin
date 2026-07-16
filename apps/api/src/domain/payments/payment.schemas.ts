import { z } from 'zod';

const objectId = z
  .string()
  .trim()
  .regex(/^[0-9a-fA-F]{24}$/);
const paise = z.coerce.number().int().min(1).max(100_000_000);

export const createPaymentSchema = z
  .object({
    direction: z.string().trim().min(1).default('Customer receipt'),
    orderId: objectId.optional().or(z.literal('')),
    invoiceId: objectId.optional().or(z.literal('')),
    amountInPaise: paise,
    method: z.string().trim().min(1),
    paymentDate: z.string().trim().datetime().optional().or(z.literal('')),
    referenceNumber: z.string().trim().optional().or(z.literal('')),
    notes: z.string().trim().optional().or(z.literal('')),
  })
  .refine((value) => value.orderId || value.invoiceId, {
    message: 'Select an order or invoice.',
    path: ['orderId'],
  });

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
