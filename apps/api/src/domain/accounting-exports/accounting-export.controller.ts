import type { RequestHandler } from 'express';
import { ok } from '../../infrastructure/http/api-response.js';
import {
  accountingExportQuerySchema,
  createAccountingExportSchema,
  createLedgerMappingSchema,
  updateAccountingExportSchema,
  updateLedgerMappingSchema,
} from './accounting-export.schemas.js';
import { AccountingExportService } from './accounting-export.service.js';

const accountingExportService = new AccountingExportService();

export const listAccountingExports: RequestHandler = async (req, res, next) => {
  try {
    res.json(ok(await accountingExportService.list(accountingExportQuerySchema.parse(req.query))));
  } catch (error) {
    next(error);
  }
};

export const createLedgerMapping: RequestHandler = async (req, res, next) => {
  try {
    res
      .status(201)
      .json(
        ok(
          await accountingExportService.createMapping(
            createLedgerMappingSchema.parse(req.body),
            req.userId,
          ),
        ),
      );
  } catch (error) {
    next(error);
  }
};

export const updateLedgerMapping: RequestHandler = async (req, res, next) => {
  try {
    const id = req.params['id'];
    res.json(
      ok(
        await accountingExportService.updateMapping(
          Array.isArray(id) ? id[0] : (id ?? ''),
          updateLedgerMappingSchema.parse(req.body),
          req.userId,
        ),
      ),
    );
  } catch (error) {
    next(error);
  }
};

export const deactivateLedgerMapping: RequestHandler = async (req, res, next) => {
  try {
    const id = req.params['id'];
    res.json(
      ok(
        await accountingExportService.deactivateMapping(
          Array.isArray(id) ? id[0] : (id ?? ''),
          req.userId,
        ),
      ),
    );
  } catch (error) {
    next(error);
  }
};

export const createAccountingExport: RequestHandler = async (req, res, next) => {
  try {
    res
      .status(201)
      .json(
        ok(
          await accountingExportService.createExport(
            createAccountingExportSchema.parse(req.body),
            req.userId,
          ),
        ),
      );
  } catch (error) {
    next(error);
  }
};

export const updateAccountingExport: RequestHandler = async (req, res, next) => {
  try {
    const id = req.params['id'];
    res.json(
      ok(
        await accountingExportService.updateExport(
          Array.isArray(id) ? id[0] : (id ?? ''),
          updateAccountingExportSchema.parse(req.body),
          req.userId,
        ),
      ),
    );
  } catch (error) {
    next(error);
  }
};

export const archiveAccountingExport: RequestHandler = async (req, res, next) => {
  try {
    const id = req.params['id'];
    res.json(
      ok(
        await accountingExportService.archiveExport(
          Array.isArray(id) ? id[0] : (id ?? ''),
          req.userId,
        ),
      ),
    );
  } catch (error) {
    next(error);
  }
};

export const downloadAccountingExport: RequestHandler = async (req, res, next) => {
  try {
    const id = req.params['id'];
    const file = await accountingExportService.file(Array.isArray(id) ? id[0] : (id ?? ''));
    res.setHeader('Content-Type', file.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${file.fileName}"`);
    res.send(file.content);
  } catch (error) {
    next(error);
  }
};
