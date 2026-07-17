import { z } from 'zod';

const paise = z.coerce.number().int().min(0).max(100_000_000);
const optionalText = z.string().trim().optional().or(z.literal(''));

export const expenseQuerySchema = z.object({
  search: z.string().trim().optional().default(''),
  status: z.enum(['all', 'Draft', 'Approved', 'Rejected', 'Cancelled']).optional().default('all'),
  category: z.string().trim().optional().default('all'),
  paymentMethod: z.string().trim().optional().default('all'),
  segment: z.enum(['all', 'draft', 'approved', 'rejected']).optional().default('all'),
  sort: z.enum(['newest', 'oldest', 'amount_desc', 'amount_asc']).optional().default('newest'),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(5).max(100).optional().default(10),
});

export const createExpenseSchema = z.object({
  title: z.string().trim().min(2),
  category: z.string().trim().min(2),
  amountInPaise: paise,
  taxAmountInPaise: paise.optional().default(0),
  paymentMethod: z.string().trim().min(2),
  status: z.enum(['Draft', 'Approved', 'Rejected', 'Cancelled']).optional().default('Draft'),
  expenseDate: z.string().trim().datetime().optional().or(z.literal('')),
  vendor: optionalText,
  referenceNumber: optionalText,
  proofUrl: z.string().trim().url().optional().or(z.literal('')),
  notes: optionalText,
});

export const updateExpenseSchema = createExpenseSchema.partial();

export type ExpenseQueryInput = z.infer<typeof expenseQuerySchema>;
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;
