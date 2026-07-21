import type { RequestHandler } from 'express';
import { ok } from '../../infrastructure/http/api-response.js';
import { publicCartQuoteSchema } from './storefront-cart.schemas.js';
import { quotePublicCart } from './storefront-cart.service.js';

export const storefrontCartQuote: RequestHandler = async (req, res, next) => {
  try {
    const input = publicCartQuoteSchema.parse(req.body);
    res.json(ok(await quotePublicCart(input)));
  } catch (error) {
    next(error);
  }
};
