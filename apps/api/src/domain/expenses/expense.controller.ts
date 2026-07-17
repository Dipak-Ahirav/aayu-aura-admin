import type { RequestHandler } from 'express';
import { ok } from '../../infrastructure/http/api-response.js';
import { createExpenseSchema, expenseQuerySchema, updateExpenseSchema } from './expense.schemas.js';
import { ExpenseService } from './expense.service.js';

const expenseService = new ExpenseService();

export const listExpenses: RequestHandler = async (req, res, next) => {
  try {
    res.json(ok(await expenseService.list(expenseQuerySchema.parse(req.query))));
  } catch (error) {
    next(error);
  }
};

export const exportExpenses: RequestHandler = async (req, res, next) => {
  try {
    const csv = await expenseService.exportCsv(expenseQuerySchema.parse(req.query));
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="expenses.csv"');
    res.send(csv);
  } catch (error) {
    next(error);
  }
};

export const createExpense: RequestHandler = async (req, res, next) => {
  try {
    res
      .status(201)
      .json(ok(await expenseService.create(createExpenseSchema.parse(req.body), req.userId)));
  } catch (error) {
    next(error);
  }
};

export const getExpense: RequestHandler = async (req, res, next) => {
  try {
    const id = req.params['id'];
    res.json(ok(await expenseService.getById(Array.isArray(id) ? id[0] : (id ?? ''))));
  } catch (error) {
    next(error);
  }
};

export const updateExpense: RequestHandler = async (req, res, next) => {
  try {
    const id = req.params['id'];
    res.json(
      ok(
        await expenseService.update(
          Array.isArray(id) ? id[0] : (id ?? ''),
          updateExpenseSchema.parse(req.body),
        ),
      ),
    );
  } catch (error) {
    next(error);
  }
};

export const cancelExpense: RequestHandler = async (req, res, next) => {
  try {
    const id = req.params['id'];
    res.json(ok(await expenseService.cancel(Array.isArray(id) ? id[0] : (id ?? ''))));
  } catch (error) {
    next(error);
  }
};
