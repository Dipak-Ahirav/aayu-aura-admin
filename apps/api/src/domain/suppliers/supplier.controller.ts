import type { RequestHandler } from 'express';
import { ok } from '../../infrastructure/http/api-response.js';
import {
  createSupplierSchema,
  supplierQuerySchema,
  updateSupplierSchema,
} from './supplier.schemas.js';
import { SupplierService } from './supplier.service.js';

const supplierService = new SupplierService();

function routeId(id: string | string[] | undefined): string {
  return Array.isArray(id) ? id[0] : (id ?? '');
}

export const listSuppliers: RequestHandler = async (req, res, next) => {
  try {
    const input = supplierQuerySchema.parse(req.query);
    res.json(ok(await supplierService.list(input)));
  } catch (error) {
    next(error);
  }
};

export const exportSuppliers: RequestHandler = async (req, res, next) => {
  try {
    const input = supplierQuerySchema.parse(req.query);
    const csv = await supplierService.exportCsv(input);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="suppliers.csv"');
    res.send(csv);
  } catch (error) {
    next(error);
  }
};

export const createSupplier: RequestHandler = async (req, res, next) => {
  try {
    const input = createSupplierSchema.parse(req.body);
    res.status(201).json(ok(await supplierService.create(input)));
  } catch (error) {
    next(error);
  }
};

export const getSupplier: RequestHandler = async (req, res, next) => {
  try {
    res.json(ok(await supplierService.getById(routeId(req.params['id']))));
  } catch (error) {
    next(error);
  }
};

export const updateSupplier: RequestHandler = async (req, res, next) => {
  try {
    const input = updateSupplierSchema.parse(req.body);
    res.json(ok(await supplierService.update(routeId(req.params['id']), input)));
  } catch (error) {
    next(error);
  }
};

export const deactivateSupplier: RequestHandler = async (req, res, next) => {
  try {
    res.json(ok(await supplierService.deactivate(routeId(req.params['id']))));
  } catch (error) {
    next(error);
  }
};
