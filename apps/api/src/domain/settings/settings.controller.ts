import type { RequestHandler } from 'express';
import { ok } from '../../infrastructure/http/api-response.js';
import {
  createSettingsBackupSchema,
  settingsQuerySchema,
  updateBusinessSettingsSchema,
} from './settings.schemas.js';
import { SettingsService } from './settings.service.js';

const settingsService = new SettingsService();

export const listSettings: RequestHandler = async (req, res, next) => {
  try {
    const input = settingsQuerySchema.parse(req.query);
    res.json(ok(await settingsService.list(input)));
  } catch (error) {
    next(error);
  }
};

export const getBusinessSettings: RequestHandler = async (_req, res, next) => {
  try {
    res.json(ok(await settingsService.getBusiness()));
  } catch (error) {
    next(error);
  }
};

export const updateBusinessSettings: RequestHandler = async (req, res, next) => {
  try {
    const input = updateBusinessSettingsSchema.parse(req.body);
    res.json(ok(await settingsService.updateBusiness(input, req.userId)));
  } catch (error) {
    next(error);
  }
};

export const createSettingsBackup: RequestHandler = async (req, res, next) => {
  try {
    const input = createSettingsBackupSchema.parse(req.body);
    res.status(201).json(ok(await settingsService.createBackup(input, req.userId)));
  } catch (error) {
    next(error);
  }
};

export const downloadSettingsBackup: RequestHandler = async (req, res, next) => {
  try {
    const id = req.params['id'];
    const file = await settingsService.backupFile(Array.isArray(id) ? id[0] : (id ?? ''));
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${file.fileName}"`);
    res.send(file.content);
  } catch (error) {
    next(error);
  }
};
