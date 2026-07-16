import type { RequestHandler } from 'express';
import { ok } from '../../infrastructure/http/api-response.js';
import {
  createCustomerSchema,
  customerQuerySchema,
  updateCustomerSchema,
} from './customer.schemas.js';
import { CustomerService } from './customer.service.js';

const customerService = new CustomerService();

export const listCustomers: RequestHandler = async (req, res, next) => {
  try {
    const input = customerQuerySchema.parse(req.query);
    res.json(ok(await customerService.list(input)));
  } catch (error) {
    next(error);
  }
};

export const createCustomer: RequestHandler = async (req, res, next) => {
  try {
    const input = createCustomerSchema.parse(req.body);
    res.status(201).json(ok(await customerService.create(input)));
  } catch (error) {
    next(error);
  }
};

export const getCustomer: RequestHandler = async (req, res, next) => {
  try {
    const id = req.params['id'];
    res.json(ok(await customerService.getById(Array.isArray(id) ? id[0] : (id ?? ''))));
  } catch (error) {
    next(error);
  }
};

export const updateCustomer: RequestHandler = async (req, res, next) => {
  try {
    const id = req.params['id'];
    const input = updateCustomerSchema.parse(req.body);
    res.json(ok(await customerService.update(Array.isArray(id) ? id[0] : (id ?? ''), input)));
  } catch (error) {
    next(error);
  }
};

export const deactivateCustomer: RequestHandler = async (req, res, next) => {
  try {
    const id = req.params['id'];
    res.json(ok(await customerService.deactivate(Array.isArray(id) ? id[0] : (id ?? ''))));
  } catch (error) {
    next(error);
  }
};
