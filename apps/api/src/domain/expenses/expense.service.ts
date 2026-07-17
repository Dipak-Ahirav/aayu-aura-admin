import { Types, type SortOrder } from 'mongoose';
import type { ExpenseDto, ExpenseListDto, ExpenseSummaryDto } from '@aayu-aura/shared-types';
import { AppError } from '../../infrastructure/http/app-error.js';
import { ExpenseModel, type ExpenseDocument } from './expense.model.js';
import type {
  CreateExpenseInput,
  ExpenseQueryInput,
  UpdateExpenseInput,
} from './expense.schemas.js';

function cleanEmpty(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function dateValue(value: string | undefined): Date {
  return value ? new Date(value) : new Date();
}

function toDto(expense: ExpenseDocument & { _id: Types.ObjectId }): ExpenseDto {
  return {
    id: expense._id.toString(),
    title: expense.title,
    category: expense.category,
    amountInPaise: expense.amountInPaise,
    taxAmountInPaise: expense.taxAmountInPaise,
    totalInPaise: expense.totalInPaise,
    paymentMethod: expense.paymentMethod,
    status: expense.status,
    expenseDate: expense.expenseDate.toISOString(),
    vendor: expense.vendor,
    referenceNumber: expense.referenceNumber,
    proofUrl: expense.proofUrl,
    notes: expense.notes,
    createdAt: expense.createdAt.toISOString(),
  };
}

function payload(input: CreateExpenseInput | UpdateExpenseInput): Partial<ExpenseDocument> {
  const amount = input.amountInPaise;
  const tax = input.taxAmountInPaise;
  return {
    ...(input.title !== undefined ? { title: input.title.trim() } : {}),
    ...(input.category !== undefined ? { category: input.category.trim() } : {}),
    ...(amount !== undefined ? { amountInPaise: amount } : {}),
    ...(tax !== undefined ? { taxAmountInPaise: tax } : {}),
    ...(amount !== undefined || tax !== undefined
      ? { totalInPaise: (amount ?? 0) + (tax ?? 0) }
      : {}),
    ...(input.paymentMethod !== undefined ? { paymentMethod: input.paymentMethod.trim() } : {}),
    ...(input.status !== undefined ? { status: input.status } : {}),
    ...(input.expenseDate !== undefined ? { expenseDate: dateValue(input.expenseDate) } : {}),
    ...(input.vendor !== undefined ? { vendor: cleanEmpty(input.vendor) } : {}),
    ...(input.referenceNumber !== undefined
      ? { referenceNumber: cleanEmpty(input.referenceNumber) }
      : {}),
    ...(input.proofUrl !== undefined ? { proofUrl: cleanEmpty(input.proofUrl) } : {}),
    ...(input.notes !== undefined ? { notes: cleanEmpty(input.notes) } : {}),
  };
}

function filterFor(input: ExpenseQueryInput): Record<string, unknown> {
  const filter: Record<string, unknown> = {};
  if (input.status !== 'all') filter['status'] = input.status;
  if (input.category !== 'all') filter['category'] = input.category;
  if (input.paymentMethod !== 'all') filter['paymentMethod'] = input.paymentMethod;
  if (input.segment === 'draft') filter['status'] = 'Draft';
  if (input.segment === 'approved') filter['status'] = 'Approved';
  if (input.segment === 'rejected') filter['status'] = 'Rejected';
  if (input.search) {
    const search = new RegExp(input.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter['$or'] = [
      { title: search },
      { category: search },
      { vendor: search },
      { referenceNumber: search },
      { notes: search },
    ];
  }
  return filter;
}

function sortFor(input: ExpenseQueryInput): Record<string, SortOrder> {
  if (input.sort === 'oldest') return { expenseDate: 1 };
  if (input.sort === 'amount_desc') return { totalInPaise: -1 };
  if (input.sort === 'amount_asc') return { totalInPaise: 1 };
  return { expenseDate: -1 };
}

function buildSummary(items: ExpenseDto[]): ExpenseSummaryDto {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthItems = items.filter((item) => new Date(item.expenseDate) >= monthStart);
  return {
    monthTotalInPaise: monthItems.reduce((sum, item) => sum + item.totalInPaise, 0),
    marketingInPaise: monthItems
      .filter((item) => item.category.toLowerCase().includes('marketing'))
      .reduce((sum, item) => sum + item.totalInPaise, 0),
    packagingInPaise: monthItems
      .filter((item) => item.category.toLowerCase().includes('pack'))
      .reduce((sum, item) => sum + item.totalInPaise, 0),
    approved: items.filter((item) => item.status === 'Approved').length,
    totalExpenses: items.length,
    draft: items.filter((item) => item.status === 'Draft').length,
    rejected: items.filter((item) => item.status === 'Rejected').length,
  };
}

export class ExpenseService {
  async list(input: ExpenseQueryInput): Promise<ExpenseListDto> {
    const filter = filterFor(input);
    const [total, rows, allRows] = await Promise.all([
      ExpenseModel.countDocuments(filter),
      ExpenseModel.find(filter)
        .sort(sortFor(input))
        .skip((input.page - 1) * input.pageSize)
        .limit(input.pageSize),
      ExpenseModel.find(),
    ]);
    return {
      items: rows.map((row) => toDto(row)),
      total,
      page: input.page,
      pageSize: input.pageSize,
      summary: buildSummary(allRows.map((row) => toDto(row))),
    };
  }

  async create(input: CreateExpenseInput, userId?: string): Promise<ExpenseDto> {
    const expense = await ExpenseModel.create({
      ...payload(input),
      totalInPaise: input.amountInPaise + (input.taxAmountInPaise ?? 0),
      expenseDate: dateValue(input.expenseDate),
      createdBy: userId ? new Types.ObjectId(userId) : undefined,
    });
    return toDto(expense);
  }

  async getById(id: string): Promise<ExpenseDto> {
    const expense = await ExpenseModel.findById(id);
    if (!expense) throw new AppError(404, 'EXPENSE_NOT_FOUND', 'Expense was not found.');
    return toDto(expense);
  }

  async update(id: string, input: UpdateExpenseInput): Promise<ExpenseDto> {
    const existing = await ExpenseModel.findById(id);
    if (!existing) throw new AppError(404, 'EXPENSE_NOT_FOUND', 'Expense was not found.');
    const nextAmount = input.amountInPaise ?? existing.amountInPaise;
    const nextTax = input.taxAmountInPaise ?? existing.taxAmountInPaise;
    const expense = await ExpenseModel.findByIdAndUpdate(
      id,
      { $set: { ...payload(input), totalInPaise: nextAmount + nextTax } },
      { new: true },
    );
    if (!expense) throw new AppError(404, 'EXPENSE_NOT_FOUND', 'Expense was not found.');
    return toDto(expense);
  }

  async cancel(id: string): Promise<ExpenseDto> {
    return this.update(id, { status: 'Cancelled' });
  }

  async exportCsv(input: ExpenseQueryInput): Promise<string> {
    const rows = await ExpenseModel.find(filterFor(input)).sort(sortFor(input));
    const header = [
      'Expense',
      'Category',
      'Amount',
      'Tax',
      'Total',
      'Method',
      'Status',
      'Date',
      'Vendor',
      'Reference',
    ];
    const escape = (value: string | number | undefined) =>
      `"${String(value ?? '').replace(/"/g, '""')}"`;
    return [
      header.map(escape).join(','),
      ...rows.map((expense) =>
        [
          expense.title,
          expense.category,
          (expense.amountInPaise / 100).toFixed(2),
          (expense.taxAmountInPaise / 100).toFixed(2),
          (expense.totalInPaise / 100).toFixed(2),
          expense.paymentMethod,
          expense.status,
          expense.expenseDate.toISOString(),
          expense.vendor,
          expense.referenceNumber,
        ]
          .map(escape)
          .join(','),
      ),
    ].join('\n');
  }
}
