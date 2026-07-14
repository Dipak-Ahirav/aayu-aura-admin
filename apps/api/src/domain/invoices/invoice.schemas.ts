import { z } from 'zod';

export const createInvoiceSchema = z.object({
  orderId: z.string().trim().min(1),
  type: z
    .enum(['Tax invoice', 'Retail invoice', 'Proforma invoice', 'Quotation', 'Payment receipt'])
    .default('Tax invoice'),
  dueDate: z.string().trim().datetime().optional().or(z.literal('')),
  notes: z.string().trim().optional(),
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
