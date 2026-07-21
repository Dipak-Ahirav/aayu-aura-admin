import { z } from 'zod';

export const customerRegisterSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().optional().or(z.literal('')),
  mobile: z.string().trim().min(8).max(20),
  password: z.string().min(8).max(120),
  termsAccepted: z.literal(true),
  marketingConsent: z.boolean().optional().default(false),
});

export const customerLoginSchema = z.object({
  identifier: z.string().trim().min(4).max(120),
  password: z.string().min(1).max(120),
});

export const customerOAuthSchema = z.object({
  provider: z.enum(['google']),
  idToken: z.string().trim().optional(),
  email: z.string().trim().email().optional(),
  name: z.string().trim().min(2).max(120).optional(),
  providerAccountId: z.string().trim().min(3).max(240).optional(),
});

export type CustomerRegisterInput = z.infer<typeof customerRegisterSchema>;
export type CustomerLoginInput = z.infer<typeof customerLoginSchema>;
export type CustomerOAuthInput = z.infer<typeof customerOAuthSchema>;
