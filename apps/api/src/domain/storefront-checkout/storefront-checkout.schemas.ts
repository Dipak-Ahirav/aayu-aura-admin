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

const paymentMethodSchema = z.enum(['UPI', 'Cards', 'Net banking', 'COD']);

const paymentDetailsSchema = z.discriminatedUnion('method', [
  z.object({
    method: z.literal('UPI'),
    upiId: z.string().trim().min(5).max(80),
    transactionReference: z.string().trim().min(6).max(80).optional(),
  }),
  z.object({
    method: z.literal('Cards'),
    cardholderName: z.string().trim().min(2).max(120),
    cardLast4: z.string().trim().regex(/^\d{4}$/),
    expiryMonth: z.string().trim().regex(/^(0[1-9]|1[0-2])$/),
    expiryYear: z.string().trim().regex(/^(\d{2}|\d{4})$/),
    transactionReference: z.string().trim().min(6).max(80).optional(),
  }),
  z.object({
    method: z.literal('Net banking'),
    bankName: z.string().trim().min(2).max(120),
    accountHolderName: z.string().trim().min(2).max(120),
    transactionReference: z.string().trim().min(6).max(80).optional(),
  }),
  z.object({
    method: z.literal('COD'),
  }),
]);

export const publicCheckoutSchema = z
  .object({
    cart: publicCartQuoteSchema,
    customer: addressSchema,
    billingAddress: addressSchema.optional(),
    paymentMethod: paymentMethodSchema,
    paymentDetails: paymentDetailsSchema.optional(),
    customerNotes: z.string().trim().max(500).optional().or(z.literal('')),
  })
  .superRefine((value, ctx) => {
    if (value.paymentMethod === 'COD') return;
    if (!value.paymentDetails || value.paymentDetails.method !== value.paymentMethod) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Provide valid ${value.paymentMethod} payment details.`,
        path: ['paymentDetails'],
      });
    }
  });

export type PublicCheckoutInput = z.infer<typeof publicCheckoutSchema>;
