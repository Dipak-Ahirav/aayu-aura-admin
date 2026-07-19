import type { Request, Response } from 'express';
import { ok } from '../../infrastructure/http/api-response.js';
import { getStorefrontCollections } from './storefront-collections.service.js';

export async function storefrontCollections(req: Request, res: Response) {
  const collectionSlug = req.params['collectionSlug'];
  const data = await getStorefrontCollections({
    ...req.query,
    collectionSlug: typeof collectionSlug === 'string' ? collectionSlug : undefined,
  });
  res.json(ok(data));
}
