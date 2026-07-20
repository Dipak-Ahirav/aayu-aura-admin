import type { RequestHandler } from 'express';
import { ok } from '../../infrastructure/http/api-response.js';
import { publicOrderTrackingSchema } from './storefront-tracking.schemas.js';
import {
  getPublicOrderTracking,
  renderPublicOrderInvoicePdf,
} from './storefront-tracking.service.js';

export const storefrontTrackOrder: RequestHandler = async (req, res, next) => {
  try {
    const input = publicOrderTrackingSchema.parse(req.body);
    res.json(ok(await getPublicOrderTracking(input)));
  } catch (error) {
    next(error);
  }
};

export const storefrontDownloadInvoice: RequestHandler = async (req, res, next) => {
  try {
    const input = publicOrderTrackingSchema.parse({
      orderNumber: req.params['orderNumber'],
      identifier: req.query['identifier'],
    });
    const invoiceId = Array.isArray(req.params['invoiceId'])
      ? req.params['invoiceId'][0]
      : (req.params['invoiceId'] ?? '');
    const pdf = await renderPublicOrderInvoicePdf(input, invoiceId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${pdf.filename}"`);
    res.setHeader('Content-Length', pdf.content.length);
    res.send(pdf.content);
  } catch (error) {
    next(error);
  }
};
