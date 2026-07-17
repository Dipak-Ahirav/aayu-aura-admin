import type { RequestHandler } from 'express';
import { ok } from '../../infrastructure/http/api-response.js';
import {
  createShipmentSchema,
  shippingQuerySchema,
  updateShipmentSchema,
} from './shipping.schemas.js';
import { ShippingService } from './shipping.service.js';

const shippingService = new ShippingService();

export const listShipments: RequestHandler = async (req, res, next) => {
  try {
    res.json(ok(await shippingService.list(shippingQuerySchema.parse(req.query))));
  } catch (error) {
    next(error);
  }
};

export const createShipment: RequestHandler = async (req, res, next) => {
  try {
    res
      .status(201)
      .json(ok(await shippingService.create(createShipmentSchema.parse(req.body), req.userId)));
  } catch (error) {
    next(error);
  }
};

export const getShipment: RequestHandler = async (req, res, next) => {
  try {
    const id = req.params['id'];
    res.json(ok(await shippingService.getById(Array.isArray(id) ? id[0] : (id ?? ''))));
  } catch (error) {
    next(error);
  }
};

export const updateShipment: RequestHandler = async (req, res, next) => {
  try {
    const id = req.params['id'];
    res.json(
      ok(
        await shippingService.update(
          Array.isArray(id) ? id[0] : (id ?? ''),
          updateShipmentSchema.parse(req.body),
        ),
      ),
    );
  } catch (error) {
    next(error);
  }
};

export const cancelShipment: RequestHandler = async (req, res, next) => {
  try {
    const id = req.params['id'];
    res.json(ok(await shippingService.cancel(Array.isArray(id) ? id[0] : (id ?? ''))));
  } catch (error) {
    next(error);
  }
};

export const downloadPackingSlip: RequestHandler = async (req, res, next) => {
  try {
    const id = req.params['id'];
    const pdf = await shippingService.packingSlip(Array.isArray(id) ? id[0] : (id ?? ''));
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${pdf.filename}"`);
    res.setHeader('Content-Length', pdf.content.length);
    res.send(pdf.content);
  } catch (error) {
    next(error);
  }
};

export const downloadOrderPackingSlip: RequestHandler = async (req, res, next) => {
  try {
    const id = req.params['id'];
    const pdf = await shippingService.orderPackingSlip(Array.isArray(id) ? id[0] : (id ?? ''));
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${pdf.filename}"`);
    res.setHeader('Content-Length', pdf.content.length);
    res.send(pdf.content);
  } catch (error) {
    next(error);
  }
};
