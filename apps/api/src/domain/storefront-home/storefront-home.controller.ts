import type { RequestHandler } from 'express';
import { ok } from '../../infrastructure/http/api-response.js';
import { getStorefrontHome } from './storefront-home.service.js';

export const storefrontHome: RequestHandler = async (_req, res, next) => {
  try {
    const homepage = await getStorefrontHome();
    res.json(ok(homepage));
  } catch (error) {
    next(error);
  }
};
