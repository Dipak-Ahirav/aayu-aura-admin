import type { RequestHandler } from 'express';
import { ok } from '../../infrastructure/http/api-response.js';
import { createOrderSchema } from './order.schemas.js';
import { OrderService } from './order.service.js';

const orderService = new OrderService();

export const createOrder: RequestHandler = async (req, res, next) => {
  try {
    const input = createOrderSchema.parse(req.body);
    const order = await orderService.create(input, req.userId);
    res.status(201).json(ok(order));
  } catch (error) {
    next(error);
  }
};

export const listOrders: RequestHandler = async (_req, res, next) => {
  try {
    res.json(ok(await orderService.list()));
  } catch (error) {
    next(error);
  }
};

export const getOrder: RequestHandler = async (req, res, next) => {
  try {
    const id = req.params['id'];
    res.json(ok(await orderService.getById(Array.isArray(id) ? id[0] : (id ?? ''))));
  } catch (error) {
    next(error);
  }
};
