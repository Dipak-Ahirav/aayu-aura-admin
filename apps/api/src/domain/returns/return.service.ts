import { Types, type SortOrder } from 'mongoose';
import type {
  OrderDto,
  ReturnRequestDto,
  ReturnsListDto,
  ReturnsSummaryDto,
} from '@aayu-aura/shared-types';
import { CounterModel } from '../counters/counter.model.js';
import { OrderModel, type OrderDocument } from '../orders/order.model.js';
import { AppError } from '../../infrastructure/http/app-error.js';
import { ReturnRequestModel, type ReturnRequestDocument } from './return-request.model.js';
import type { CreateReturnInput, ReturnsQueryInput, UpdateReturnInput } from './return.schemas.js';

function cleanEmpty(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function dateValue(value: string | undefined): Date | undefined {
  return value ? new Date(value) : undefined;
}

async function nextReturnNumber(): Promise<string> {
  const now = new Date();
  const financialYearStart = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  const sequence = await CounterModel.findOneAndUpdate(
    { _id: `returns-${financialYearStart}` },
    { $inc: { sequence: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
  const yearLabel = `${financialYearStart}-${String(financialYearStart + 1).slice(-2)}`;
  return `AA/RET/${yearLabel}/${String(sequence.sequence).padStart(6, '0')}`;
}

function orderToDto(order: OrderDocument & { _id: Types.ObjectId }): OrderDto {
  return {
    id: order._id.toString(),
    orderNumber: order.orderNumber,
    source: order.source,
    customer: { id: order.customerId?.toString(), ...order.customer },
    items: order.items.map((item) => ({
      productName: item.productName,
      sku: item.sku,
      hsn: item.hsn,
      quantity: item.quantity,
      unitPriceInPaise: item.unitPriceInPaise,
      discountInPaise: item.discountInPaise,
      gstRate: item.gstRate,
      taxableAmountInPaise: item.taxableAmountInPaise,
      taxAmountInPaise: item.taxAmountInPaise,
      lineTotalInPaise: item.lineTotalInPaise,
    })),
    subtotalInPaise: order.subtotalInPaise,
    itemDiscountInPaise: order.itemDiscountInPaise,
    taxableAmountInPaise: order.taxableAmountInPaise,
    taxAmountInPaise: order.taxAmountInPaise,
    shippingChargeInPaise: order.shippingChargeInPaise,
    packagingChargeInPaise: order.packagingChargeInPaise,
    otherChargeInPaise: order.otherChargeInPaise,
    totalInPaise: order.totalInPaise,
    advancePaidInPaise: order.advancePaidInPaise,
    dueAmountInPaise: order.dueAmountInPaise,
    paymentStatus: order.paymentStatus,
    fulfilmentStatus: order.fulfilmentStatus,
    notes: order.notes,
    internalNotes: order.internalNotes,
    createdAt: order.createdAt.toISOString(),
  };
}

function toDto(row: ReturnRequestDocument & { _id: Types.ObjectId }): ReturnRequestDto {
  return {
    id: row._id.toString(),
    returnNumber: row.returnNumber,
    orderId: row.orderId.toString(),
    orderNumber: row.orderNumber,
    customer: row.customer,
    items: row.items,
    reason: row.reason,
    status: row.status,
    inspectionResult: row.inspectionResult,
    resolution: row.resolution,
    refundAmountInPaise: row.refundAmountInPaise,
    exchangeProductName: row.exchangeProductName,
    exchangeSku: row.exchangeSku,
    exchangeAmountInPaise: row.exchangeAmountInPaise,
    requestedDate: row.requestedDate.toISOString(),
    inspectedAt: row.inspectedAt?.toISOString(),
    closedAt: row.closedAt?.toISOString(),
    notes: row.notes,
    createdAt: row.createdAt.toISOString(),
  };
}

function filterFor(input: ReturnsQueryInput): Record<string, unknown> {
  const filter: Record<string, unknown> = {};
  if (input.status !== 'all') filter['status'] = input.status;
  if (input.inspectionResult !== 'all') filter['inspectionResult'] = input.inspectionResult;
  if (input.segment === 'inspection') filter['status'] = 'Inspection';
  if (input.segment === 'refunds') filter['status'] = 'Refund due';
  if (input.segment === 'closed') filter['status'] = { $in: ['Closed', 'Rejected', 'Cancelled'] };
  if (input.search) {
    const search = new RegExp(input.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter['$or'] = [
      { returnNumber: search },
      { orderNumber: search },
      { 'customer.name': search },
      { 'customer.mobile': search },
      { reason: search },
      { exchangeProductName: search },
      { exchangeSku: search },
    ];
  }
  return filter;
}

function sortFor(input: ReturnsQueryInput): Record<string, SortOrder> {
  if (input.sort === 'oldest') return { requestedDate: 1 };
  if (input.sort === 'refund_desc') return { refundAmountInPaise: -1 };
  return { requestedDate: -1 };
}

function buildSummary(items: ReturnRequestDto[]): ReturnsSummaryDto {
  return {
    returnRequests: items.filter((item) => item.status === 'Requested').length,
    awaitingInspect: items.filter((item) => item.status === 'Inspection').length,
    refundDueInPaise: items
      .filter((item) => item.status === 'Refund due')
      .reduce((sum, item) => sum + item.refundAmountInPaise, 0),
    exchanges: items.filter((item) => item.resolution === 'Exchange').length,
    closed: items.filter((item) => ['Closed', 'Rejected', 'Cancelled'].includes(item.status))
      .length,
  };
}

function payload(input: CreateReturnInput | UpdateReturnInput): Partial<ReturnRequestDocument> {
  return {
    ...(input.reason !== undefined ? { reason: input.reason.trim() } : {}),
    ...(input.status !== undefined ? { status: input.status } : {}),
    ...(input.inspectionResult !== undefined ? { inspectionResult: input.inspectionResult } : {}),
    ...(input.resolution !== undefined ? { resolution: input.resolution } : {}),
    ...(input.refundAmountInPaise !== undefined
      ? { refundAmountInPaise: input.refundAmountInPaise }
      : {}),
    ...(input.exchangeProductName !== undefined
      ? { exchangeProductName: cleanEmpty(input.exchangeProductName) }
      : {}),
    ...(input.exchangeSku !== undefined ? { exchangeSku: cleanEmpty(input.exchangeSku) } : {}),
    ...(input.exchangeAmountInPaise !== undefined
      ? { exchangeAmountInPaise: input.exchangeAmountInPaise }
      : {}),
    ...(input.requestedDate !== undefined
      ? { requestedDate: dateValue(input.requestedDate) ?? new Date() }
      : {}),
    ...(input.inspectedAt !== undefined ? { inspectedAt: dateValue(input.inspectedAt) } : {}),
    ...(input.closedAt !== undefined ? { closedAt: dateValue(input.closedAt) } : {}),
    ...(input.notes !== undefined ? { notes: cleanEmpty(input.notes) } : {}),
  };
}

export class ReturnService {
  async list(input: ReturnsQueryInput): Promise<ReturnsListDto> {
    const filter = filterFor(input);
    const [total, rows, allRows, orders] = await Promise.all([
      ReturnRequestModel.countDocuments(filter),
      ReturnRequestModel.find(filter)
        .sort(sortFor(input))
        .skip((input.page - 1) * input.pageSize)
        .limit(input.pageSize),
      ReturnRequestModel.find(),
      OrderModel.find().sort({ createdAt: -1 }).limit(100),
    ]);
    return {
      items: rows.map((row) => toDto(row)),
      orders: orders.map((order) => orderToDto(order)),
      total,
      page: input.page,
      pageSize: input.pageSize,
      summary: buildSummary(allRows.map((row) => toDto(row))),
    };
  }

  async create(input: CreateReturnInput, userId?: string): Promise<ReturnRequestDto> {
    const order = await OrderModel.findById(input.orderId);
    if (!order) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order was not found.');
    const row = await ReturnRequestModel.create({
      returnNumber: await nextReturnNumber(),
      orderId: order._id,
      orderNumber: order.orderNumber,
      customer: order.customer,
      items: order.items,
      reason: input.reason.trim(),
      status: input.status,
      inspectionResult: input.inspectionResult,
      resolution: input.resolution,
      refundAmountInPaise: input.refundAmountInPaise,
      exchangeProductName: cleanEmpty(input.exchangeProductName),
      exchangeSku: cleanEmpty(input.exchangeSku),
      exchangeAmountInPaise: input.exchangeAmountInPaise,
      requestedDate: dateValue(input.requestedDate) ?? new Date(),
      inspectedAt: dateValue(input.inspectedAt),
      closedAt: dateValue(input.closedAt),
      notes: cleanEmpty(input.notes),
      createdBy: userId ? new Types.ObjectId(userId) : undefined,
    });
    return toDto(row);
  }

  async getById(id: string): Promise<ReturnRequestDto> {
    const row = await ReturnRequestModel.findById(id);
    if (!row) throw new AppError(404, 'RETURN_NOT_FOUND', 'Return request was not found.');
    return toDto(row);
  }

  async update(id: string, input: UpdateReturnInput): Promise<ReturnRequestDto> {
    const row = await ReturnRequestModel.findByIdAndUpdate(
      id,
      { $set: payload(input) },
      { new: true },
    );
    if (!row) throw new AppError(404, 'RETURN_NOT_FOUND', 'Return request was not found.');
    return toDto(row);
  }

  async cancel(id: string): Promise<ReturnRequestDto> {
    return this.update(id, { status: 'Cancelled', closedAt: new Date().toISOString() });
  }

  async createExchange(id: string, input: UpdateReturnInput): Promise<ReturnRequestDto> {
    return this.update(id, {
      ...input,
      resolution: 'Exchange',
      status: input.status ?? 'Exchange pending',
    });
  }
}
