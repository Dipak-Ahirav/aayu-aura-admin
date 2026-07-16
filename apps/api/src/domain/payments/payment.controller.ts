import type { RequestHandler } from 'express';
import { ok } from '../../infrastructure/http/api-response.js';
import { createPaymentSchema } from './payment.schemas.js';
import { PaymentService } from './payment.service.js';

const paymentService = new PaymentService();

export const createPayment: RequestHandler = async (req, res, next) => {
  try {
    const input = createPaymentSchema.parse(req.body);
    const payment = await paymentService.create(input, req.userId);
    res.status(201).json(ok(payment));
  } catch (error) {
    next(error);
  }
};

export const listPayments: RequestHandler = async (_req, res, next) => {
  try {
    res.json(ok(await paymentService.list()));
  } catch (error) {
    next(error);
  }
};
