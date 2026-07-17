import type { RequestHandler } from 'express';
import { ok } from '../../infrastructure/http/api-response.js';
import {
  createReportRunSchema,
  reportQuerySchema,
  updateReportRunSchema,
} from './report.schemas.js';
import { ReportService } from './report.service.js';

const reportService = new ReportService();

export const listReports: RequestHandler = async (req, res, next) => {
  try {
    res.json(ok(await reportService.list(reportQuerySchema.parse(req.query))));
  } catch (error) {
    next(error);
  }
};

export const exportReports: RequestHandler = async (req, res, next) => {
  try {
    const csv = await reportService.exportCsv(reportQuerySchema.parse(req.query));
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="reports.csv"');
    res.send(csv);
  } catch (error) {
    next(error);
  }
};

export const createReport: RequestHandler = async (req, res, next) => {
  try {
    res
      .status(201)
      .json(ok(await reportService.create(createReportRunSchema.parse(req.body), req.userId)));
  } catch (error) {
    next(error);
  }
};

export const getReport: RequestHandler = async (req, res, next) => {
  try {
    const id = req.params['id'];
    res.json(ok(await reportService.getById(Array.isArray(id) ? id[0] : (id ?? ''))));
  } catch (error) {
    next(error);
  }
};

export const updateReport: RequestHandler = async (req, res, next) => {
  try {
    const id = req.params['id'];
    res.json(
      ok(
        await reportService.update(
          Array.isArray(id) ? id[0] : (id ?? ''),
          updateReportRunSchema.parse(req.body),
        ),
      ),
    );
  } catch (error) {
    next(error);
  }
};

export const archiveReport: RequestHandler = async (req, res, next) => {
  try {
    const id = req.params['id'];
    res.json(ok(await reportService.archive(Array.isArray(id) ? id[0] : (id ?? ''))));
  } catch (error) {
    next(error);
  }
};
