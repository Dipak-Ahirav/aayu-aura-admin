import type { RequestHandler } from 'express';
import { ok } from '../../infrastructure/http/api-response.js';
import {
  createMasterDataSchema,
  masterDataQuerySchema,
  updateMasterDataSchema,
} from './master-data.schemas.js';
import { MasterDataService } from './master-data.service.js';

const masterDataService = new MasterDataService();

function routeId(id: string | string[] | undefined): string {
  return Array.isArray(id) ? id[0] : (id ?? '');
}

export const listMasterData: RequestHandler = async (req, res, next) => {
  try {
    const input = masterDataQuerySchema.parse(req.query);
    res.json(ok(await masterDataService.list(input)));
  } catch (error) {
    next(error);
  }
};

export const createMasterData: RequestHandler = async (req, res, next) => {
  try {
    const input = createMasterDataSchema.parse(req.body);
    res.status(201).json(ok(await masterDataService.create(input)));
  } catch (error) {
    next(error);
  }
};

export const getMasterData: RequestHandler = async (req, res, next) => {
  try {
    res.json(ok(await masterDataService.getById(routeId(req.params['id']))));
  } catch (error) {
    next(error);
  }
};

export const updateMasterData: RequestHandler = async (req, res, next) => {
  try {
    const input = updateMasterDataSchema.parse(req.body);
    res.json(ok(await masterDataService.update(routeId(req.params['id']), input)));
  } catch (error) {
    next(error);
  }
};

export const deactivateMasterData: RequestHandler = async (req, res, next) => {
  try {
    res.json(ok(await masterDataService.deactivate(routeId(req.params['id']))));
  } catch (error) {
    next(error);
  }
};
