import { z } from 'zod';

export const publicOrderTrackingSchema = z.object({
  orderNumber: z.string().trim().min(3).max(80),
  identifier: z.string().trim().min(4).max(120),
});

export type PublicOrderTrackingInput = z.infer<typeof publicOrderTrackingSchema>;
