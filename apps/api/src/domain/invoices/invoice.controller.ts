import type { RequestHandler } from 'express';
import { ok } from '../../infrastructure/http/api-response.js';
import { createInvoiceSchema } from './invoice.schemas.js';
import { InvoiceService } from './invoice.service.js';

const invoiceService = new InvoiceService();

export const createInvoice: RequestHandler = async (req, res, next) => {
  try {
    const input = createInvoiceSchema.parse(req.body);
    const invoice = await invoiceService.create(input, req.userId);
    res.status(201).json(ok(invoice));
  } catch (error) {
    next(error);
  }
};

export const listInvoices: RequestHandler = async (_req, res, next) => {
  try {
    res.json(ok(await invoiceService.list()));
  } catch (error) {
    next(error);
  }
};

export const getInvoice: RequestHandler = async (req, res, next) => {
  try {
    const id = req.params['id'];
    res.json(ok(await invoiceService.getById(Array.isArray(id) ? id[0] : (id ?? ''))));
  } catch (error) {
    next(error);
  }
};

export const downloadInvoicePdf: RequestHandler = async (req, res, next) => {
  try {
    const id = req.params['id'];
    const pdf = await invoiceService.renderPdf(Array.isArray(id) ? id[0] : (id ?? ''));
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${pdf.filename}"`);
    res.setHeader('Content-Length', pdf.content.length);
    res.send(pdf.content);
  } catch (error) {
    next(error);
  }
};
