import type { RequestHandler } from 'express';
import { ok } from '../../infrastructure/http/api-response.js';
import { auditLogQuerySchema, createAuditLogSchema } from './audit-log.schemas.js';
import { AuditLogService } from './audit-log.service.js';

const auditLogService = new AuditLogService();

export const listAuditLogs: RequestHandler = async (req, res, next) => {
  try {
    res.json(ok(await auditLogService.list(auditLogQuerySchema.parse(req.query))));
  } catch (error) {
    next(error);
  }
};

export const exportAuditLogs: RequestHandler = async (req, res, next) => {
  try {
    const csv = await auditLogService.exportCsv(auditLogQuerySchema.parse(req.query));
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="audit-logs.csv"');
    res.send(csv);
  } catch (error) {
    next(error);
  }
};

export const createAuditLog: RequestHandler = async (req, res, next) => {
  try {
    res
      .status(201)
      .json(ok(await auditLogService.create(createAuditLogSchema.parse(req.body), req.userId)));
  } catch (error) {
    next(error);
  }
};

export const getAuditLog: RequestHandler = async (req, res, next) => {
  try {
    const id = req.params['id'];
    res.json(ok(await auditLogService.getById(Array.isArray(id) ? id[0] : (id ?? ''))));
  } catch (error) {
    next(error);
  }
};

export const reviewAuditLog: RequestHandler = async (req, res, next) => {
  try {
    const id = req.params['id'];
    res.json(ok(await auditLogService.review(Array.isArray(id) ? id[0] : (id ?? ''), req.userId)));
  } catch (error) {
    next(error);
  }
};
