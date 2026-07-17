import type { RequestHandler } from 'express';
import { ok } from '../../infrastructure/http/api-response.js';
import {
  createStockMovementSchema,
  inventoryQuerySchema,
  updateStockMovementSchema,
} from './inventory.schemas.js';
import { InventoryService } from './inventory.service.js';

const inventoryService = new InventoryService();

export const listInventory: RequestHandler = async (req, res, next) => {
  try {
    const input = inventoryQuerySchema.parse(req.query);
    res.json(ok(await inventoryService.list(input)));
  } catch (error) {
    next(error);
  }
};

export const createStockMovement: RequestHandler = async (req, res, next) => {
  try {
    const input = createStockMovementSchema.parse(req.body);
    res.status(201).json(ok(await inventoryService.createMovement(input, req.userId)));
  } catch (error) {
    next(error);
  }
};

export const updateStockMovement: RequestHandler = async (req, res, next) => {
  try {
    const id = req.params['id'];
    const input = updateStockMovementSchema.parse(req.body);
    res.json(
      ok(await inventoryService.updateMovement(Array.isArray(id) ? id[0] : (id ?? ''), input)),
    );
  } catch (error) {
    next(error);
  }
};

export const reverseStockMovement: RequestHandler = async (req, res, next) => {
  try {
    const id = req.params['id'];
    res.json(ok(await inventoryService.reverseMovement(Array.isArray(id) ? id[0] : (id ?? ''))));
  } catch (error) {
    next(error);
  }
};
