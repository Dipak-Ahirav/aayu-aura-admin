import type { Request, Response } from 'express';
import { ok } from '../../infrastructure/http/api-response.js';
import { getStorefrontSearch } from './storefront-search.service.js';

export async function storefrontSearch(req: Request, res: Response) {
  const data = await getStorefrontSearch(req.query);
  res.json(ok(data));
}
