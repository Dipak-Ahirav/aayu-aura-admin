import { Types, type SortOrder } from 'mongoose';
import type {
  AccountingExportDto,
  AccountingExportListDto,
  AccountingExportSummaryDto,
  AccountingVoucherType,
  LedgerMappingDto,
} from '@aayu-aura/shared-types';
import { AppError } from '../../infrastructure/http/app-error.js';
import { recordAudit } from '../audit-logs/audit-recorder.js';
import { CounterModel } from '../counters/counter.model.js';
import { ExpenseModel } from '../expenses/expense.model.js';
import { StockMovementModel } from '../inventory/stock-movement.model.js';
import { OrderModel } from '../orders/order.model.js';
import { PaymentModel } from '../payments/payment.model.js';
import { PurchaseModel } from '../purchases/purchase.model.js';
import { ReturnRequestModel } from '../returns/return-request.model.js';
import { AccountingExportModel, type AccountingExportDocument } from './accounting-export.model.js';
import type {
  AccountingExportQueryInput,
  CreateAccountingExportInput,
  CreateLedgerMappingInput,
  UpdateAccountingExportInput,
  UpdateLedgerMappingInput,
} from './accounting-export.schemas.js';
import { LedgerMappingModel, type LedgerMappingDocument } from './ledger-mapping.model.js';

interface DateRange {
  from: Date;
  to: Date;
}

function startOfMonth(): Date {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), 1);
}

function defaultRange(): DateRange {
  const today = new Date();
  return {
    from: startOfMonth(),
    to: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1),
  };
}

function dateValue(value: string | undefined, fallback: Date): Date {
  return value ? new Date(value) : fallback;
}

function cleanEmpty(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function dateFilter(field: string, range: DateRange): Record<string, unknown> {
  return { [field]: { $gte: range.from, $lt: range.to } };
}

function toLedgerDto(mapping: LedgerMappingDocument & { _id: Types.ObjectId }): LedgerMappingDto {
  return {
    id: mapping._id.toString(),
    sourceType: mapping.sourceType,
    sourceValue: mapping.sourceValue,
    tallyLedgerName: mapping.tallyLedgerName,
    voucherType: mapping.voucherType,
    taxLedgerName: mapping.taxLedgerName,
    isActive: mapping.isActive,
    notes: mapping.notes,
    createdAt: mapping.createdAt.toISOString(),
  };
}

function toExportDto(
  record: AccountingExportDocument & { _id: Types.ObjectId },
): AccountingExportDto {
  return {
    id: record._id.toString(),
    exportNumber: record.exportNumber,
    fromDate: record.fromDate.toISOString(),
    toDate: record.toDate.toISOString(),
    format: record.format,
    voucherType: record.voucherType,
    records: record.records,
    status: record.status,
    fileName: record.fileName,
    notes: record.notes,
    generatedAt: record.generatedAt.toISOString(),
    createdAt: record.createdAt.toISOString(),
  };
}

function exportFilter(input: AccountingExportQueryInput): Record<string, unknown> {
  const filter: Record<string, unknown> = {};
  if (input.voucherType !== 'all') filter['voucherType'] = input.voucherType;
  if (input.status !== 'all') filter['status'] = input.status;
  if (input.format !== 'all') filter['format'] = input.format;
  if (input.tab === 'errors') filter['status'] = 'Failed';
  if (input.search) {
    const search = new RegExp(input.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter['$or'] = [{ exportNumber: search }, { fileName: search }, { notes: search }];
  }
  return filter;
}

function mappingFilter(input: AccountingExportQueryInput): Record<string, unknown> {
  const filter: Record<string, unknown> = {};
  if (input.voucherType !== 'all') filter['voucherType'] = input.voucherType;
  if (input.search) {
    const search = new RegExp(input.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter['$or'] = [
      { sourceType: search },
      { sourceValue: search },
      { tallyLedgerName: search },
      { taxLedgerName: search },
      { notes: search },
    ];
  }
  return filter;
}

function sortFor(input: AccountingExportQueryInput): Record<string, SortOrder> {
  if (input.sort === 'oldest') return { generatedAt: 1 };
  if (input.sort === 'records_desc') return { records: -1 };
  if (input.sort === 'records_asc') return { records: 1 };
  return { generatedAt: -1 };
}

async function nextExportNumber(): Promise<string> {
  const counter = await CounterModel.findOneAndUpdate(
    { _id: 'accounting_export' },
    { $inc: { sequence: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
  return `EXP-${String(counter.sequence).padStart(4, '0')}`;
}

async function countReadyRecords(
  range: DateRange,
  voucherType: 'all' | AccountingVoucherType,
): Promise<number> {
  const tasks: Promise<number>[] = [];
  if (voucherType === 'all' || voucherType === 'Sales') {
    tasks.push(OrderModel.countDocuments(dateFilter('orderDate', range)));
  }
  if (voucherType === 'all' || voucherType === 'Purchase') {
    tasks.push(PurchaseModel.countDocuments(dateFilter('purchaseDate', range)));
  }
  if (voucherType === 'all' || voucherType === 'Receipt' || voucherType === 'Payment') {
    tasks.push(PaymentModel.countDocuments(dateFilter('paymentDate', range)));
  }
  if (voucherType === 'all' || voucherType === 'Journal') {
    tasks.push(ExpenseModel.countDocuments(dateFilter('expenseDate', range)));
  }
  if (voucherType === 'all' || voucherType === 'Credit Note' || voucherType === 'Debit Note') {
    tasks.push(ReturnRequestModel.countDocuments(dateFilter('requestedDate', range)));
  }
  if (voucherType === 'all' || voucherType === 'Stock Journal') {
    tasks.push(StockMovementModel.countDocuments(dateFilter('createdAt', range)));
  }
  const counts = await Promise.all(tasks);
  return counts.reduce((sum, count) => sum + count, 0);
}

async function exportPayload(range: DateRange, voucherType: 'all' | AccountingVoucherType) {
  const [orders, purchases, payments, expenses, returns, stockMovements] = await Promise.all([
    voucherType === 'all' || voucherType === 'Sales'
      ? OrderModel.find(dateFilter('orderDate', range)).limit(500)
      : [],
    voucherType === 'all' || voucherType === 'Purchase'
      ? PurchaseModel.find(dateFilter('purchaseDate', range)).limit(500)
      : [],
    voucherType === 'all' || voucherType === 'Receipt' || voucherType === 'Payment'
      ? PaymentModel.find(dateFilter('paymentDate', range)).limit(500)
      : [],
    voucherType === 'all' || voucherType === 'Journal'
      ? ExpenseModel.find(dateFilter('expenseDate', range)).limit(500)
      : [],
    voucherType === 'all' || voucherType === 'Credit Note' || voucherType === 'Debit Note'
      ? ReturnRequestModel.find(dateFilter('requestedDate', range)).limit(500)
      : [],
    voucherType === 'all' || voucherType === 'Stock Journal'
      ? StockMovementModel.find(dateFilter('createdAt', range)).limit(500)
      : [],
  ]);
  return {
    orders: orders.map((order) => ({
      number: order.orderNumber,
      amount: order.totalInPaise,
      date: order.orderDate,
    })),
    purchases: purchases.map((purchase) => ({
      number: purchase.purchaseNumber,
      amount: purchase.totalInPaise,
      date: purchase.purchaseDate,
    })),
    payments: payments.map((payment) => ({
      number: payment.paymentNumber,
      amount: payment.amountInPaise,
      date: payment.paymentDate,
      direction: payment.direction,
    })),
    expenses: expenses.map((expense) => ({
      title: expense.title,
      amount: expense.totalInPaise,
      date: expense.expenseDate,
    })),
    returns: returns.map((item) => ({
      number: item.returnNumber,
      amount: item.refundAmountInPaise,
      date: item.requestedDate,
    })),
    stockMovements: stockMovements.map((movement) => ({
      productName: movement.productName,
      quantity: movement.quantity,
      date: movement.createdAt,
    })),
  };
}

function exportText(record: AccountingExportDocument): string {
  if (record.format === 'JSON') return JSON.stringify(record.payload ?? {}, null, 2);
  const rows = [
    ['Export ID', record.exportNumber],
    ['From', record.fromDate.toISOString()],
    ['To', record.toDate.toISOString()],
    ['Voucher type', record.voucherType],
    ['Records', String(record.records)],
    ['Status', record.status],
  ];
  if (record.format === 'XML') {
    return `<TALLYEXPORT id="${record.exportNumber}" records="${record.records}" status="${record.status}"></TALLYEXPORT>`;
  }
  return rows
    .map((row) => row.map((value) => `"${value.replace(/"/g, '""')}"`).join(','))
    .join('\n');
}

async function summary(): Promise<AccountingExportSummaryDto> {
  const range = defaultRange();
  const [mappedLedgers, sourceValues, exportsCount, readyRecords, errors] = await Promise.all([
    LedgerMappingModel.countDocuments({ isActive: true }),
    LedgerMappingModel.distinct('sourceValue', { isActive: true }),
    AccountingExportModel.countDocuments({ status: { $ne: 'Archived' } }),
    countReadyRecords(range, 'all'),
    AccountingExportModel.countDocuments({ status: 'Failed' }),
  ]);
  return {
    mappedLedgers,
    pendingMappings: Math.max(readyRecords - sourceValues.length, 0),
    exports: exportsCount,
    readyRecords,
    errors,
  };
}

export class AccountingExportService {
  async list(input: AccountingExportQueryInput): Promise<AccountingExportListDto> {
    const skip = (input.page - 1) * input.pageSize;
    const [mappings, exports, totalMappings, totalExports, summaryData] = await Promise.all([
      LedgerMappingModel.find(mappingFilter(input))
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(input.pageSize),
      AccountingExportModel.find(exportFilter(input))
        .sort(sortFor(input))
        .skip(skip)
        .limit(input.pageSize),
      LedgerMappingModel.countDocuments(mappingFilter(input)),
      AccountingExportModel.countDocuments(exportFilter(input)),
      summary(),
    ]);
    return {
      mappings: mappings.map((row) => toLedgerDto(row)),
      exports: exports.map((row) => toExportDto(row)),
      total: input.tab === 'mappings' ? totalMappings : totalExports,
      page: input.page,
      pageSize: input.pageSize,
      summary: summaryData,
    };
  }

  async createMapping(input: CreateLedgerMappingInput, userId?: string): Promise<LedgerMappingDto> {
    const mapping = await LedgerMappingModel.create({
      sourceType: input.sourceType.trim(),
      sourceValue: input.sourceValue.trim(),
      tallyLedgerName: input.tallyLedgerName.trim(),
      voucherType: input.voucherType,
      taxLedgerName: cleanEmpty(input.taxLedgerName),
      isActive: input.isActive ?? true,
      notes: cleanEmpty(input.notes),
      createdBy: userId ? new Types.ObjectId(userId) : undefined,
    });
    const dto = toLedgerDto(mapping);
    await recordAudit({
      module: 'Exports',
      action: 'Create ledger mapping',
      entity: 'LedgerMapping',
      entityId: dto.id,
      userId,
      newValue: dto as unknown as Record<string, unknown>,
    });
    return dto;
  }

  async updateMapping(
    id: string,
    input: UpdateLedgerMappingInput,
    userId?: string,
  ): Promise<LedgerMappingDto> {
    const existing = await LedgerMappingModel.findById(id);
    if (!existing)
      throw new AppError(404, 'LEDGER_MAPPING_NOT_FOUND', 'Ledger mapping was not found.');
    const previous = toLedgerDto(existing);
    const mapping = await LedgerMappingModel.findByIdAndUpdate(
      id,
      {
        $set: {
          ...(input.sourceType !== undefined ? { sourceType: input.sourceType.trim() } : {}),
          ...(input.sourceValue !== undefined ? { sourceValue: input.sourceValue.trim() } : {}),
          ...(input.tallyLedgerName !== undefined
            ? { tallyLedgerName: input.tallyLedgerName.trim() }
            : {}),
          ...(input.voucherType !== undefined ? { voucherType: input.voucherType } : {}),
          ...(input.taxLedgerName !== undefined
            ? { taxLedgerName: cleanEmpty(input.taxLedgerName) }
            : {}),
          ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
          ...(input.notes !== undefined ? { notes: cleanEmpty(input.notes) } : {}),
        },
      },
      { new: true },
    );
    if (!mapping)
      throw new AppError(404, 'LEDGER_MAPPING_NOT_FOUND', 'Ledger mapping was not found.');
    const dto = toLedgerDto(mapping);
    await recordAudit({
      module: 'Exports',
      action: 'Update ledger mapping',
      entity: 'LedgerMapping',
      entityId: dto.id,
      userId,
      previousValue: previous as unknown as Record<string, unknown>,
      newValue: dto as unknown as Record<string, unknown>,
    });
    return dto;
  }

  async deactivateMapping(id: string, userId?: string): Promise<LedgerMappingDto> {
    return this.updateMapping(id, { isActive: false }, userId);
  }

  async createExport(
    input: CreateAccountingExportInput,
    userId?: string,
  ): Promise<AccountingExportDto> {
    const defaults = defaultRange();
    const range = {
      from: dateValue(input.fromDate, defaults.from),
      to: dateValue(input.toDate, defaults.to),
    };
    const records = await countReadyRecords(range, input.voucherType);
    const exportNumber = await nextExportNumber();
    const fileName = `${exportNumber}.${input.format === 'Excel' ? 'csv' : input.format.toLowerCase()}`;
    const record = await AccountingExportModel.create({
      exportNumber,
      fromDate: range.from,
      toDate: range.to,
      format: input.format,
      voucherType: input.voucherType,
      records,
      status: records > 0 ? 'Generated' : 'Validation pending',
      fileName,
      notes: cleanEmpty(input.notes),
      generatedAt: new Date(),
      payload: await exportPayload(range, input.voucherType),
      createdBy: userId ? new Types.ObjectId(userId) : undefined,
    });
    const dto = toExportDto(record);
    await recordAudit({
      module: 'Exports',
      action: 'Generate accounting export',
      entity: 'AccountingExport',
      entityId: dto.id,
      userId,
      newValue: dto as unknown as Record<string, unknown>,
      severity: dto.status === 'Validation pending' ? 'Warning' : 'Info',
      metadata: { exportNumber: dto.exportNumber, format: dto.format, records: dto.records },
    });
    return dto;
  }

  async updateExport(
    id: string,
    input: UpdateAccountingExportInput,
    userId?: string,
  ): Promise<AccountingExportDto> {
    const existing = await AccountingExportModel.findById(id);
    if (!existing)
      throw new AppError(404, 'ACCOUNTING_EXPORT_NOT_FOUND', 'Accounting export was not found.');
    const previous = toExportDto(existing);
    const record = await AccountingExportModel.findByIdAndUpdate(
      id,
      {
        $set: {
          ...(input.status !== undefined ? { status: input.status } : {}),
          ...(input.format !== undefined ? { format: input.format } : {}),
          ...(input.voucherType !== undefined ? { voucherType: input.voucherType } : {}),
          ...(input.notes !== undefined ? { notes: cleanEmpty(input.notes) } : {}),
        },
      },
      { new: true },
    );
    if (!record)
      throw new AppError(404, 'ACCOUNTING_EXPORT_NOT_FOUND', 'Accounting export was not found.');
    const dto = toExportDto(record);
    await recordAudit({
      module: 'Exports',
      action: 'Update accounting export',
      entity: 'AccountingExport',
      entityId: dto.id,
      userId,
      previousValue: previous as unknown as Record<string, unknown>,
      newValue: dto as unknown as Record<string, unknown>,
    });
    return dto;
  }

  async archiveExport(id: string, userId?: string): Promise<AccountingExportDto> {
    return this.updateExport(id, { status: 'Archived' }, userId);
  }

  async file(id: string): Promise<{ fileName: string; contentType: string; content: string }> {
    const record = await AccountingExportModel.findById(id);
    if (!record)
      throw new AppError(404, 'ACCOUNTING_EXPORT_NOT_FOUND', 'Accounting export was not found.');
    const contentType =
      record.format === 'JSON'
        ? 'application/json'
        : record.format === 'XML'
          ? 'application/xml'
          : 'text/csv; charset=utf-8';
    return {
      fileName: record.fileName ?? `${record.exportNumber}.csv`,
      contentType,
      content: exportText(record),
    };
  }
}
