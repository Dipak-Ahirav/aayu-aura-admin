import type { RequestHandler } from 'express';
import { ok } from '../../infrastructure/http/api-response.js';
import {
  createPurchaseSchema,
  purchaseQuerySchema,
  updatePurchaseSchema,
} from './purchase.schemas.js';
import { PurchaseService } from './purchase.service.js';

const purchaseService = new PurchaseService();

function routeId(id: string | string[] | undefined): string {
  return Array.isArray(id) ? id[0] : (id ?? '');
}

export const listPurchases: RequestHandler = async (req, res, next) => {
  try {
    const input = purchaseQuerySchema.parse(req.query);
    res.json(ok(await purchaseService.list(input)));
  } catch (error) {
    next(error);
  }
};

export const createPurchase: RequestHandler = async (req, res, next) => {
  try {
    const input = createPurchaseSchema.parse(req.body);
    res.status(201).json(ok(await purchaseService.create(input)));
  } catch (error) {
    next(error);
  }
};

export const getPurchase: RequestHandler = async (req, res, next) => {
  try {
    res.json(ok(await purchaseService.getById(routeId(req.params['id']))));
  } catch (error) {
    next(error);
  }
};

export const updatePurchase: RequestHandler = async (req, res, next) => {
  try {
    const input = updatePurchaseSchema.parse(req.body);
    res.json(ok(await purchaseService.update(routeId(req.params['id']), input)));
  } catch (error) {
    next(error);
  }
};

export const cancelPurchase: RequestHandler = async (req, res, next) => {
  try {
    res.json(ok(await purchaseService.cancel(routeId(req.params['id']))));
  } catch (error) {
    next(error);
  }
};
