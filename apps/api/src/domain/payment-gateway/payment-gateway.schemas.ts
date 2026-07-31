import { z } from 'zod';

export const verifyRazorpayPaymentSchema = z.object({
  razorpayOrderId: z.string().trim().min(6),
  razorpayPaymentId: z.string().trim().min(6),
  razorpaySignature: z.string().trim().min(20),
});

export type VerifyRazorpayPaymentInput = z.infer<typeof verifyRazorpayPaymentSchema>;
