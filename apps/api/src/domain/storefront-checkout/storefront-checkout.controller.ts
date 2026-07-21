import type { RequestHandler } from 'express';
import { ok } from '../../infrastructure/http/api-response.js';
import { publicCheckoutSchema } from './storefront-checkout.schemas.js';
import { createPublicCheckoutOrder } from './storefront-checkout.service.js';

export const storefrontCheckout: RequestHandler = async (req, res, next) => {
  try {
    const input = publicCheckoutSchema.parse(req.body);
    const data = await createPublicCheckoutOrder(input);
    res.status(201).json(ok(data));
  } catch (error) {
    next(error);
  }
};
