import { z } from 'zod';
import { publicCartQuoteSchema } from '../storefront-cart/storefront-cart.schemas.js';

const addressSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  mobile: z.string().trim().min(8).max(20),
  email: z.string().trim().email().optional().or(z.literal('')),
  addressLine1: z.string().trim().min(5).max(240),
  addressLine2: z.string().trim().max(180).optional().or(z.literal('')),
  landmark: z.string().trim().max(140).optional().or(z.literal('')),
  city: z.string().trim().min(2).max(100),
  state: z.string().trim().min(2).max(100),
  stateCode: z.string().trim().max(8).optional().or(z.literal('')),
  pinCode: z.string().trim().min(4).max(12),
});

export const publicCheckoutSchema = z.object({
  cart: publicCartQuoteSchema,
  customer: addressSchema,
  billingAddress: addressSchema.optional(),
  paymentMethod: z.enum(['UPI', 'Cards', 'Net banking', 'COD']),
  customerNotes: z.string().trim().max(500).optional().or(z.literal('')),
});

export type PublicCheckoutInput = z.infer<typeof publicCheckoutSchema>;
