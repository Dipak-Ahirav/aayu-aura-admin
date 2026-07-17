import type { RequestHandler } from 'express';
import { ok } from '../../infrastructure/http/api-response.js';
import { createAdminUserSchema, updateAdminUserSchema, userQuerySchema } from './user.schemas.js';
import { UserService } from './user.service.js';

const userService = new UserService();

export const listUsers: RequestHandler = async (req, res, next) => {
  try {
    res.json(ok(await userService.list(userQuerySchema.parse(req.query))));
  } catch (error) {
    next(error);
  }
};

export const createUser: RequestHandler = async (req, res, next) => {
  try {
    res
      .status(201)
      .json(ok(await userService.create(createAdminUserSchema.parse(req.body), req.userId)));
  } catch (error) {
    next(error);
  }
};

export const getUser: RequestHandler = async (req, res, next) => {
  try {
    const id = req.params['id'];
    res.json(ok(await userService.getById(Array.isArray(id) ? id[0] : (id ?? ''))));
  } catch (error) {
    next(error);
  }
};

export const updateUser: RequestHandler = async (req, res, next) => {
  try {
    const id = req.params['id'];
    res.json(
      ok(
        await userService.update(
          Array.isArray(id) ? id[0] : (id ?? ''),
          updateAdminUserSchema.parse(req.body),
          req.userId,
        ),
      ),
    );
  } catch (error) {
    next(error);
  }
};

export const deactivateUser: RequestHandler = async (req, res, next) => {
  try {
    const id = req.params['id'];
    res.json(ok(await userService.deactivate(Array.isArray(id) ? id[0] : (id ?? ''), req.userId)));
  } catch (error) {
    next(error);
  }
};
