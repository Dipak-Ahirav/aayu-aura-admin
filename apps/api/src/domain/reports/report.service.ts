import { Types, type SortOrder } from 'mongoose';
import type {
  ReportCategory,
  ReportRunDto,
  ReportsListDto,
  ReportsSummaryDto,
} from '@aayu-aura/shared-types';
import { AppError } from '../../infrastructure/http/app-error.js';
import { ExpenseModel } from '../expenses/expense.model.js';
import { InvoiceModel } from '../invoices/invoice.model.js';
import { OrderModel } from '../orders/order.model.js';
import { PaymentModel } from '../payments/payment.model.js';
import { ProductModel } from '../products/product.model.js';
import { PurchaseModel } from '../purchases/purchase.model.js';
import { ReturnRequestModel } from '../returns/return-request.model.js';
import { ReportRunModel, type ReportRunDocument } from './report-run.model.js';
import type {
  CreateReportRunInput,
  ReportQueryInput,
  UpdateReportRunInput,
} from './report.schemas.js';

interface DateRange {
  from: Date;
  to: Date;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function rangeFor(period: Exclude<ReportQueryInput['period'], 'all'>): DateRange {
  const today = startOfDay(new Date());
  if (period === 'today') return { from: today, to: addDays(today, 1) };
  if (period === 'last_7_days') return { from: addDays(today, -6), to: addDays(today, 1) };
  if (period === 'previous_month') {
    return {
      from: new Date(today.getFullYear(), today.getMonth() - 1, 1),
      to: new Date(today.getFullYear(), today.getMonth(), 1),
    };
  }
  if (period === 'financial_year') {
    const startYear = today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1;
    return { from: new Date(startYear, 3, 1), to: addDays(today, 1) };
  }
  return {
    from: new Date(today.getFullYear(), today.getMonth(), 1),
    to: addDays(today, 1),
  };
}

function periodLabel(period: Exclude<ReportQueryInput['period'], 'all'>): string {
  const range = rangeFor(period);
  const formatter = new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  if (period === 'today') return formatter.format(range.from);
  if (period === 'current_month') {
    return new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(range.from);
  }
  return `${formatter.format(range.from)} - ${formatter.format(addDays(range.to, -1))}`;
}

function dateFilter(field: string, range: DateRange): Record<string, unknown> {
  return { [field]: { $gte: range.from, $lt: range.to } };
}

function toDto(report: ReportRunDocument & { _id: Types.ObjectId }): ReportRunDto {
  return {
    id: report._id.toString(),
    reportName: report.reportName,
    category: report.category,
    period: report.period,
    periodLabel: report.periodLabel,
    records: report.records,
    formats: report.formats,
    status: report.status,
    generatedAt: report.generatedAt.toISOString(),
    notes: report.notes,
    createdAt: report.createdAt.toISOString(),
  };
}

function cleanEmpty(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function sortFor(input: ReportQueryInput): Record<string, SortOrder> {
  if (input.sort === 'oldest') return { generatedAt: 1 };
  if (input.sort === 'records_desc') return { records: -1 };
  if (input.sort === 'records_asc') return { records: 1 };
  return { generatedAt: -1 };
}

function filterFor(input: ReportQueryInput): Record<string, unknown> {
  const filter: Record<string, unknown> = {};
  if (input.category !== 'all') filter['category'] = input.category;
  if (input.status !== 'all') filter['status'] = input.status;
  if (input.period !== 'all') filter['period'] = input.period;
  if (input.search) {
    const search = new RegExp(input.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter['$or'] = [
      { reportName: search },
      { category: search },
      { periodLabel: search },
      { notes: search },
    ];
  }
  return filter;
}

async function sum(model: { aggregate: Function }, field: string, filter: Record<string, unknown>) {
  const [result] = await model
    .aggregate([{ $match: filter }, { $group: { _id: null, total: { $sum: `$${field}` } } }])
    .exec();
  return Number(result?.total ?? 0);
}

async function recordsFor(
  category: ReportCategory,
  period: Exclude<ReportQueryInput['period'], 'all'>,
) {
  const range = rangeFor(period);
  if (category === 'Sales') return OrderModel.countDocuments(dateFilter('orderDate', range));
  if (category === 'Inventory') return ProductModel.countDocuments({ status: { $ne: 'archived' } });
  if (category === 'Finance') {
    const [payments, expenses, purchases] = await Promise.all([
      PaymentModel.countDocuments(dateFilter('paymentDate', range)),
      ExpenseModel.countDocuments(dateFilter('expenseDate', range)),
      PurchaseModel.countDocuments(dateFilter('purchaseDate', range)),
    ]);
    return payments + expenses + purchases;
  }
  return InvoiceModel.countDocuments(dateFilter('invoiceDate', range));
}

async function snapshotFor(
  category: ReportCategory,
  period: Exclude<ReportQueryInput['period'], 'all'>,
) {
  const range = rangeFor(period);
  if (category === 'Sales') {
    const filter = dateFilter('orderDate', range);
    const [orders, salesInPaise, returns] = await Promise.all([
      OrderModel.countDocuments(filter),
      sum(OrderModel, 'totalInPaise', filter),
      ReturnRequestModel.countDocuments(dateFilter('requestedDate', range)),
    ]);
    return { orders, salesInPaise, returns };
  }
  if (category === 'Inventory') {
    const [products, lowStock] = await Promise.all([
      ProductModel.countDocuments({ status: { $ne: 'archived' } }),
      ProductModel.countDocuments({
        $expr: { $lte: ['$currentPhysicalStock', { $ifNull: ['$reorderLevel', 5] }] },
      }),
    ]);
    return { products, lowStock };
  }
  if (category === 'Finance') {
    const [paymentsInPaise, expensesInPaise, purchasesInPaise] = await Promise.all([
      sum(PaymentModel, 'amountInPaise', dateFilter('paymentDate', range)),
      sum(ExpenseModel, 'totalInPaise', dateFilter('expenseDate', range)),
      sum(PurchaseModel, 'totalInPaise', dateFilter('purchaseDate', range)),
    ]);
    return { paymentsInPaise, expensesInPaise, purchasesInPaise };
  }
  const filter = dateFilter('invoiceDate', range);
  const [invoices, taxableInPaise, taxInPaise] = await Promise.all([
    InvoiceModel.countDocuments(filter),
    sum(InvoiceModel, 'taxableAmountInPaise', filter),
    sum(InvoiceModel, 'taxAmountInPaise', filter),
  ]);
  return { invoices, taxableInPaise, taxInPaise };
}

async function summaryFor(
  period: Exclude<ReportQueryInput['period'], 'all'>,
): Promise<ReportsSummaryDto> {
  const range = rangeFor(period);
  const orderFilter = dateFilter('orderDate', range);
  const expenseFilter = dateFilter('expenseDate', range);
  const [
    monthSalesInPaise,
    orderCostInPaise,
    expensesInPaise,
    salesReports,
    inventoryReports,
    financeReports,
    gstReports,
  ] = await Promise.all([
    sum(OrderModel, 'totalInPaise', orderFilter),
    sum(OrderModel, 'taxableAmountInPaise', orderFilter),
    sum(ExpenseModel, 'totalInPaise', expenseFilter),
    ReportRunModel.countDocuments({ category: 'Sales', status: { $ne: 'Archived' } }),
    ReportRunModel.countDocuments({ category: 'Inventory', status: { $ne: 'Archived' } }),
    ReportRunModel.countDocuments({ category: 'Finance', status: { $ne: 'Archived' } }),
    ReportRunModel.countDocuments({ category: 'GST', status: { $ne: 'Archived' } }),
  ]);
  const grossProfitInPaise = Math.max(monthSalesInPaise - orderCostInPaise, 0);
  return {
    monthSalesInPaise,
    grossProfitInPaise,
    expensesInPaise,
    netProfitInPaise: grossProfitInPaise - expensesInPaise,
    salesReports,
    inventoryReports,
    financeReports,
    gstReports,
  };
}

export class ReportService {
  async list(input: ReportQueryInput): Promise<ReportsListDto> {
    const filter = filterFor(input);
    const period = input.period === 'all' ? 'current_month' : input.period;
    const [total, rows, summary] = await Promise.all([
      ReportRunModel.countDocuments(filter),
      ReportRunModel.find(filter)
        .sort(sortFor(input))
        .skip((input.page - 1) * input.pageSize)
        .limit(input.pageSize),
      summaryFor(period),
    ]);
    return {
      items: rows.map((row) => toDto(row)),
      total,
      page: input.page,
      pageSize: input.pageSize,
      summary,
    };
  }

  async create(input: CreateReportRunInput, userId?: string): Promise<ReportRunDto> {
    const [records, snapshot] = await Promise.all([
      recordsFor(input.category, input.period),
      snapshotFor(input.category, input.period),
    ]);
    const report = await ReportRunModel.create({
      reportName: input.reportName.trim(),
      category: input.category,
      period: input.period,
      periodLabel: periodLabel(input.period),
      records,
      formats: input.formats,
      status: 'Ready',
      generatedAt: new Date(),
      notes: cleanEmpty(input.notes),
      snapshot,
      createdBy: userId ? new Types.ObjectId(userId) : undefined,
    });
    return toDto(report);
  }

  async getById(id: string): Promise<ReportRunDto> {
    const report = await ReportRunModel.findById(id);
    if (!report) throw new AppError(404, 'REPORT_NOT_FOUND', 'Report run was not found.');
    return toDto(report);
  }

  async update(id: string, input: UpdateReportRunInput): Promise<ReportRunDto> {
    const existing = await ReportRunModel.findById(id);
    if (!existing) throw new AppError(404, 'REPORT_NOT_FOUND', 'Report run was not found.');
    const category = input.category ?? existing.category;
    const period = input.period ?? existing.period;
    const shouldRecalculate = input.category !== undefined || input.period !== undefined;
    const recalculated = shouldRecalculate
      ? {
          records: await recordsFor(category, period),
          snapshot: await snapshotFor(category, period),
          periodLabel: periodLabel(period),
          generatedAt: new Date(),
        }
      : {};
    const report = await ReportRunModel.findByIdAndUpdate(
      id,
      {
        $set: {
          ...(input.reportName !== undefined ? { reportName: input.reportName.trim() } : {}),
          ...(input.category !== undefined ? { category: input.category } : {}),
          ...(input.period !== undefined ? { period: input.period } : {}),
          ...(input.formats !== undefined ? { formats: input.formats } : {}),
          ...(input.status !== undefined ? { status: input.status } : {}),
          ...(input.notes !== undefined ? { notes: cleanEmpty(input.notes) } : {}),
          ...recalculated,
        },
      },
      { new: true },
    );
    if (!report) throw new AppError(404, 'REPORT_NOT_FOUND', 'Report run was not found.');
    return toDto(report);
  }

  async archive(id: string): Promise<ReportRunDto> {
    return this.update(id, { status: 'Archived' });
  }

  async exportCsv(input: ReportQueryInput): Promise<string> {
    const rows = await ReportRunModel.find(filterFor(input)).sort(sortFor(input));
    const header = [
      'Report',
      'Category',
      'Period',
      'Records',
      'Export formats',
      'Status',
      'Generated at',
    ];
    const escape = (value: string | number | undefined) =>
      `"${String(value ?? '').replace(/"/g, '""')}"`;
    return [
      header.map(escape).join(','),
      ...rows.map((report) =>
        [
          report.reportName,
          report.category,
          report.periodLabel,
          report.records,
          report.formats.join(', '),
          report.status,
          report.generatedAt.toISOString(),
        ]
          .map(escape)
          .join(','),
      ),
    ].join('\n');
  }
}
