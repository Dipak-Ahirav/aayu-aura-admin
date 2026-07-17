import type { RequestHandler } from 'express';
import { ok } from '../../infrastructure/http/api-response.js';
import { createReturnSchema, returnsQuerySchema, updateReturnSchema } from './return.schemas.js';
import { ReturnService } from './return.service.js';

const returnService = new ReturnService();

export const listReturns: RequestHandler = async (req, res, next) => {
  try {
    res.json(ok(await returnService.list(returnsQuerySchema.parse(req.query))));
  } catch (error) {
    next(error);
  }
};

export const createReturn: RequestHandler = async (req, res, next) => {
  try {
    res
      .status(201)
      .json(ok(await returnService.create(createReturnSchema.parse(req.body), req.userId)));
  } catch (error) {
    next(error);
  }
};

export const getReturn: RequestHandler = async (req, res, next) => {
  try {
    const id = req.params['id'];
    res.json(ok(await returnService.getById(Array.isArray(id) ? id[0] : (id ?? ''))));
  } catch (error) {
    next(error);
  }
};

export const updateReturn: RequestHandler = async (req, res, next) => {
  try {
    const id = req.params['id'];
    res.json(
      ok(
        await returnService.update(
          Array.isArray(id) ? id[0] : (id ?? ''),
          updateReturnSchema.parse(req.body),
        ),
      ),
    );
  } catch (error) {
    next(error);
  }
};

export const cancelReturn: RequestHandler = async (req, res, next) => {
  try {
    const id = req.params['id'];
    res.json(ok(await returnService.cancel(Array.isArray(id) ? id[0] : (id ?? ''))));
  } catch (error) {
    next(error);
  }
};

export const createExchange: RequestHandler = async (req, res, next) => {
  try {
    const id = req.params['id'];
    res.json(
      ok(
        await returnService.createExchange(
          Array.isArray(id) ? id[0] : (id ?? ''),
          updateReturnSchema.parse(req.body),
        ),
      ),
    );
  } catch (error) {
    next(error);
  }
};
