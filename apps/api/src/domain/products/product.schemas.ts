import { z } from 'zod';

const paise = z.coerce.number().int().min(0).max(100_000_000);
const stock = z.coerce.number().int().min(0).max(1_000_000);

export const createProductSchema = z.object({
  name: z.string().trim().min(2),
  sku: z.string().trim().min(2),
  category: z.string().trim().optional().or(z.literal('')),
  status: z.enum(['draft', 'active', 'archived']).default('active'),
  purchasePriceInPaise: paise,
  landedCostInPaise: paise,
  sellingPriceInPaise: paise,
  currentPhysicalStock: stock.default(0),
  reservedStock: stock.default(0),
  reorderLevel: stock.default(5),
  hsn: z.string().trim().optional().or(z.literal('')),
  gstRate: z.coerce.number().min(0).max(28).default(0),
  coverImageUrl: z.string().trim().url().optional().or(z.literal('')),
  internalNotes: z.string().trim().optional().or(z.literal('')),
});

export const updateProductSchema = createProductSchema.partial();

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
