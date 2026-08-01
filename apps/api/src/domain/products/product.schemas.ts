import { z } from 'zod';

const paise = z.coerce.number().int().min(0).max(100_000_000);
const stock = z.coerce.number().int().min(0).max(1_000_000);
const optionalText = z.string().trim().max(4_000).optional().or(z.literal(''));
const shortText = z.string().trim().max(180).optional().or(z.literal(''));
const url = z.string().trim().url().optional().or(z.literal(''));
const publicImage = z.object({
  url: z.string().trim().url(),
  altText: z.string().trim().max(180).optional().or(z.literal('')),
  sortOrder: z.coerce.number().int().min(0).max(1000).optional(),
});
const sizeChartItem = z.object({
  label: z.string().trim().min(1).max(80),
  value: z.string().trim().min(1).max(160),
});

export const createProductSchema = z.object({
  name: z.string().trim().min(2),
  sku: z.string().trim().min(2),
  category: shortText,
  status: z.enum(['draft', 'active', 'archived']).default('active'),
  showInStorefront: z.coerce.boolean().default(true),
  purchasePriceInPaise: paise,
  landedCostInPaise: paise,
  sellingPriceInPaise: paise,
  mrpInPaise: paise.optional(),
  offerPriceInPaise: paise.optional(),
  currentPhysicalStock: stock.default(0),
  reservedStock: stock.default(0),
  reorderLevel: stock.default(5),
  hsn: shortText,
  gstRate: z.coerce.number().min(0).max(28).default(0),
  coverImageUrl: url,
  sareeType: shortText,
  fabric: shortText,
  primaryColour: shortText,
  colours: z.array(z.string().trim().min(1).max(40)).max(12).optional(),
  pattern: shortText,
  work: shortText,
  occasion: shortText,
  collection: shortText,
  description: optionalText,
  careInstructions: optionalText,
  countryOfOrigin: shortText,
  sareeLength: shortText,
  sareeWidth: shortText,
  blouseIncluded: z.coerce.boolean().default(true),
  blouseDetails: optionalText,
  taxInformation: shortText,
  deliveryEstimate: shortText,
  codAvailable: z.coerce.boolean().default(true),
  returnWindow: shortText,
  isNewArrival: z.coerce.boolean().default(false),
  isBestSeller: z.coerce.boolean().default(false),
  averageRating: z.coerce.number().min(0).max(5).optional(),
  reviewCount: stock.optional(),
  sizeChart: z.array(sizeChartItem).max(12).optional(),
  images: z.array(publicImage).max(16).optional(),
  videoUrls: z.array(z.string().trim().url()).max(6).optional(),
  internalNotes: optionalText,
});

export const updateProductSchema = createProductSchema.partial();

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
