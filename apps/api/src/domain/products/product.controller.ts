import type { RequestHandler } from 'express';
import { ok } from '../../infrastructure/http/api-response.js';
import { createProductSchema, updateProductSchema } from './product.schemas.js';
import { ProductService } from './product.service.js';

const productService = new ProductService();

export const createProduct: RequestHandler = async (req, res, next) => {
  try {
    const input = createProductSchema.parse(req.body);
    const product = await productService.create(input, req.userId);
    res.status(201).json(ok(product));
  } catch (error) {
    next(error);
  }
};

export const listProducts: RequestHandler = async (_req, res, next) => {
  try {
    res.json(ok(await productService.list()));
  } catch (error) {
    next(error);
  }
};

export const updateProduct: RequestHandler = async (req, res, next) => {
  try {
    const id = req.params['id'];
    const input = updateProductSchema.parse(req.body);
    res.json(
      ok(await productService.update(Array.isArray(id) ? id[0] : (id ?? ''), input, req.userId)),
    );
  } catch (error) {
    next(error);
  }
};
