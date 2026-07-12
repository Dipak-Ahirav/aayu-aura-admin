import type { RequestHandler } from 'express';
import type { OperationalModuleSlug } from '@aayu-aura/shared-types';
import { ok } from '../../infrastructure/http/api-response.js';
import { AppError } from '../../infrastructure/http/app-error.js';
import { getModuleOverview, operationalModuleSlugs } from './module-overview.data.js';

export const listModuleOverviews: RequestHandler = (_req, res) => {
  res.json(ok(operationalModuleSlugs.map((slug) => getModuleOverview(slug))));
};

export const getModuleOverviewBySlug: RequestHandler = (req, res, next) => {
  const slug = req.params['slug'] as OperationalModuleSlug | undefined;

  if (!slug || !operationalModuleSlugs.includes(slug)) {
    next(new AppError(404, 'MODULE_NOT_FOUND', 'This admin module does not exist.'));
    return;
  }

  res.json(ok(getModuleOverview(slug)));
};
