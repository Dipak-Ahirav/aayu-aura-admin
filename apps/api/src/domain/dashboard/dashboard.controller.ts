import type { RequestHandler } from 'express';
import type { DashboardPeriod } from '@aayu-aura/shared-types';
import { ok } from '../../infrastructure/http/api-response.js';
import { getDashboardSummary } from './dashboard.service.js';

const dashboardPeriods = [
  'today',
  'yesterday',
  'last_7_days',
  'last_30_days',
  'current_month',
  'previous_month',
  'financial_year',
] satisfies DashboardPeriod[];

function parsePeriod(value: unknown): DashboardPeriod {
  return dashboardPeriods.includes(value as DashboardPeriod)
    ? (value as DashboardPeriod)
    : 'current_month';
}

export const dashboardSummary: RequestHandler = async (req, res, next) => {
  try {
    const summary = await getDashboardSummary(parsePeriod(req.query['period']));
    res.json(ok(summary));
  } catch (error) {
    next(error);
  }
};
