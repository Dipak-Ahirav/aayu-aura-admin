import type { Request, Response } from 'express';
import { ok } from '../../infrastructure/http/api-response.js';
import {
  getStorefrontProductDetail,
  listStorefrontProducts,
} from './storefront-products.service.js';

export async function storefrontProducts(req: Request, res: Response) {
  const data = await listStorefrontProducts(req.query);
  res.json(ok(data));
}

export async function storefrontProductDetail(req: Request, res: Response) {
  const productSlug = req.params['productSlug'];
  const data =
    typeof productSlug === 'string' ? await getStorefrontProductDetail(productSlug) : null;
  res.json(ok(data));
}
