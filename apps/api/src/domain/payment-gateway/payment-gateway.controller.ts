import type { RequestHandler } from 'express';
import { ok } from '../../infrastructure/http/api-response.js';
import { verifyRazorpayPaymentSchema } from './payment-gateway.schemas.js';
import { handleRazorpayWebhook, verifyRazorpayPayment } from './payment-gateway.service.js';

export const verifyPublicRazorpayPayment: RequestHandler = async (req, res, next) => {
  try {
    const input = verifyRazorpayPaymentSchema.parse(req.body);
    res.json(ok(await verifyRazorpayPayment(input)));
  } catch (error) {
    next(error);
  }
};

export const razorpayWebhook: RequestHandler = async (req, res, next) => {
  try {
    const rawBody = (req as typeof req & { rawBody?: string }).rawBody ?? JSON.stringify(req.body);
    await handleRazorpayWebhook(rawBody, req.header('x-razorpay-signature') ?? undefined);
    res.json(ok({ received: true }));
  } catch (error) {
    next(error);
  }
};
