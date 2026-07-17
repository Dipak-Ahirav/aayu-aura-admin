import { Types, type SortOrder } from 'mongoose';
import type {
  PurchaseDto,
  PurchaseItemDto,
  PurchaseListDto,
  PurchasePaymentStatus,
  PurchaseStatus,
} from '@aayu-aura/shared-types';
import { CounterModel } from '../counters/counter.model.js';
import { ProductModel } from '../products/product.model.js';
import { SupplierModel } from '../suppliers/supplier.model.js';
import { AppError } from '../../infrastructure/http/app-error.js';
import {
  PurchaseModel,
  type PurchaseDocument,
  type PurchaseItemDocument,
} from './purchase.model.js';
import type {
  CreatePurchaseInput,
  PurchaseQueryInput,
  UpdatePurchaseInput,
} from './purchase.schemas.js';

async function nextPurchaseNumber(): Promise<string> {
  const now = new Date();
  const financialYearStart = now.getMonth() + 1 >= 4 ? now.getFullYear() : now.getFullYear() - 1;
  const yearLabel = `${String(financialYearStart).slice(-2)}-${String(financialYearStart + 1).slice(-2)}`;
  const sequence = await CounterModel.findOneAndUpdate(
    { _id: `purchases-${financialYearStart}` },
    { $inc: { sequence: 1 } },
    { new: true, upsert: true },
  );
  return `AA/PUR/${yearLabel}/${String(sequence.sequence).padStart(6, '0')}`;
}

function cleanEmpty(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function paymentStatus(total: number, paid: number): PurchasePaymentStatus {
  if (paid <= 0) return 'Unpaid';
  if (paid >= total) return 'Paid';
  return 'Partially paid';
}

function calculateItem(item: CreatePurchaseInput['items'][number]): PurchaseItemDocument {
  const gross = item.quantity * item.unitCostInPaise;
  const discount = Math.min(item.discountInPaise ?? 0, gross);
  const taxableAmountInPaise = gross - discount;
  const taxAmountInPaise = Math.round((taxableAmountInPaise * (item.gstRate ?? 0)) / 100);
  return {
    ...(item.productId ? { productId: new Types.ObjectId(item.productId) } : {}),
    productName: item.productName.trim(),
    sku: cleanEmpty(item.sku)?.toUpperCase(),
    hsn: cleanEmpty(item.hsn),
    quantity: item.quantity,
    receivedQuantity: Math.min(item.receivedQuantity ?? 0, item.quantity),
    unitCostInPaise: item.unitCostInPaise,
    discountInPaise: discount,
    gstRate: item.gstRate ?? 0,
    taxableAmountInPaise,
    taxAmountInPaise,
    lineTotalInPaise: taxableAmountInPaise + taxAmountInPaise,
  };
}

function calculatedPayload(input: CreatePurchaseInput | UpdatePurchaseInput) {
  if (!input.items) {
    return {
      ...(input.purchaseDate !== undefined
        ? { purchaseDate: input.purchaseDate ? new Date(input.purchaseDate) : new Date() }
        : {}),
      ...(input.expectedReceiptDate !== undefined
        ? {
            expectedReceiptDate: input.expectedReceiptDate
              ? new Date(input.expectedReceiptDate)
              : undefined,
          }
        : {}),
      ...(input.supplierInvoiceNumber !== undefined
        ? { supplierInvoiceNumber: cleanEmpty(input.supplierInvoiceNumber) }
        : {}),
      ...(input.shippingChargeInPaise !== undefined
        ? { shippingChargeInPaise: input.shippingChargeInPaise }
        : {}),
      ...(input.otherChargeInPaise !== undefined
        ? { otherChargeInPaise: input.otherChargeInPaise }
        : {}),
      ...(input.paidAmountInPaise !== undefined
        ? { paidAmountInPaise: input.paidAmountInPaise }
        : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.notes !== undefined ? { notes: cleanEmpty(input.notes) } : {}),
      ...(input.internalNotes !== undefined
        ? { internalNotes: cleanEmpty(input.internalNotes) }
        : {}),
    };
  }

  const items = input.items.map(calculateItem);
  const subtotalInPaise = items.reduce(
    (sum, item) => sum + item.quantity * item.unitCostInPaise,
    0,
  );
  const itemDiscountInPaise = items.reduce((sum, item) => sum + item.discountInPaise, 0);
  const taxableAmountInPaise = items.reduce((sum, item) => sum + item.taxableAmountInPaise, 0);
  const taxAmountInPaise = items.reduce((sum, item) => sum + item.taxAmountInPaise, 0);
  const shippingChargeInPaise = input.shippingChargeInPaise ?? 0;
  const otherChargeInPaise = input.otherChargeInPaise ?? 0;
  const totalInPaise =
    taxableAmountInPaise + taxAmountInPaise + shippingChargeInPaise + otherChargeInPaise;
  const paidAmountInPaise = Math.min(input.paidAmountInPaise ?? 0, totalInPaise);
  const dueAmountInPaise = Math.max(totalInPaise - paidAmountInPaise, 0);

  return {
    items,
    subtotalInPaise,
    itemDiscountInPaise,
    taxableAmountInPaise,
    taxAmountInPaise,
    shippingChargeInPaise,
    otherChargeInPaise,
    totalInPaise,
    paidAmountInPaise,
    dueAmountInPaise,
    paymentStatus: paymentStatus(totalInPaise, paidAmountInPaise),
    ...(input.purchaseDate !== undefined
      ? { purchaseDate: input.purchaseDate ? new Date(input.purchaseDate) : new Date() }
      : {}),
    ...(input.expectedReceiptDate !== undefined
      ? {
          expectedReceiptDate: input.expectedReceiptDate
            ? new Date(input.expectedReceiptDate)
            : undefined,
        }
      : {}),
    ...(input.supplierInvoiceNumber !== undefined
      ? { supplierInvoiceNumber: cleanEmpty(input.supplierInvoiceNumber) }
      : {}),
    ...(input.status !== undefined ? { status: input.status } : {}),
    ...(input.notes !== undefined ? { notes: cleanEmpty(input.notes) } : {}),
    ...(input.internalNotes !== undefined
      ? { internalNotes: cleanEmpty(input.internalNotes) }
      : {}),
  };
}

function toItemDto(item: PurchaseItemDocument): PurchaseItemDto {
  return {
    productId: item.productId?.toString(),
    productName: item.productName,
    sku: item.sku,
    hsn: item.hsn,
    quantity: item.quantity,
    receivedQuantity: item.receivedQuantity,
    unitCostInPaise: item.unitCostInPaise,
    discountInPaise: item.discountInPaise,
    gstRate: item.gstRate,
    taxableAmountInPaise: item.taxableAmountInPaise,
    taxAmountInPaise: item.taxAmountInPaise,
    lineTotalInPaise: item.lineTotalInPaise,
  };
}

function toDto(purchase: PurchaseDocument & { _id: Types.ObjectId }): PurchaseDto {
  return {
    id: purchase._id.toString(),
    purchaseNumber: purchase.purchaseNumber,
    supplierId: purchase.supplierId.toString(),
    supplierName: purchase.supplierName,
    supplierMobile: purchase.supplierMobile,
    supplierInvoiceNumber: purchase.supplierInvoiceNumber,
    items: purchase.items.map(toItemDto),
    subtotalInPaise: purchase.subtotalInPaise,
    itemDiscountInPaise: purchase.itemDiscountInPaise,
    taxableAmountInPaise: purchase.taxableAmountInPaise,
    taxAmountInPaise: purchase.taxAmountInPaise,
    shippingChargeInPaise: purchase.shippingChargeInPaise,
    otherChargeInPaise: purchase.otherChargeInPaise,
    totalInPaise: purchase.totalInPaise,
    paidAmountInPaise: purchase.paidAmountInPaise,
    dueAmountInPaise: purchase.dueAmountInPaise,
    status: purchase.status,
    paymentStatus: purchase.paymentStatus,
    purchaseDate: purchase.purchaseDate.toISOString(),
    expectedReceiptDate: purchase.expectedReceiptDate?.toISOString(),
    receivedAt: purchase.receivedAt?.toISOString(),
    notes: purchase.notes,
    internalNotes: purchase.internalNotes,
    createdAt: purchase.createdAt.toISOString(),
  };
}

function baseFilter(input: PurchaseQueryInput): Record<string, unknown> {
  const filter: Record<string, unknown> = {};

  if (input.status !== 'all') filter['status'] = input.status;
  if (input.supplierId !== 'all') filter['supplierId'] = input.supplierId;
  if (input.segment === 'draft') filter['status'] = 'Draft';
  if (input.segment === 'ordered') filter['status'] = { $in: ['Ordered', 'Partially received'] };
  if (input.segment === 'received') filter['status'] = 'Received';

  if (input.search) {
    const search = new RegExp(input.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter['$or'] = [
      { purchaseNumber: search },
      { supplierName: search },
      { supplierInvoiceNumber: search },
      { 'items.productName': search },
      { 'items.sku': search },
    ];
  }

  return filter;
}

function sortFor(input: PurchaseQueryInput): Record<string, SortOrder> {
  if (input.sort === 'oldest') return { purchaseDate: 1 };
  if (input.sort === 'amount_desc') return { totalInPaise: -1 };
  if (input.sort === 'due_desc') return { dueAmountInPaise: -1 };
  return { purchaseDate: -1 };
}

async function refreshSupplierPayable(supplierId: Types.ObjectId): Promise<void> {
  const rows = await PurchaseModel.find({
    supplierId,
    status: { $ne: 'Cancelled' },
  });
  const payable = rows.reduce((sum, purchase) => sum + purchase.dueAmountInPaise, 0);
  await SupplierModel.findByIdAndUpdate(supplierId, {
    $set: {
      currentPayableInPaise: payable,
      status: payable > 0 ? 'payment_due' : 'active',
      isActive: true,
    },
  });
}

async function applyReceivedStock(purchase: PurchaseDocument): Promise<void> {
  await Promise.all(
    purchase.items
      .filter((item) => item.productId && item.receivedQuantity > 0)
      .map((item) =>
        ProductModel.findByIdAndUpdate(item.productId, {
          $inc: { currentPhysicalStock: item.receivedQuantity },
          $set: {
            purchasePriceInPaise: item.unitCostInPaise,
            landedCostInPaise: item.unitCostInPaise,
          },
        }),
      ),
  );
}

export class PurchaseService {
  async list(input: PurchaseQueryInput): Promise<PurchaseListDto> {
    const filter = baseFilter(input);
    const total = await PurchaseModel.countDocuments(filter);
    const rows = await PurchaseModel.find(filter)
      .sort(sortFor(input))
      .skip((input.page - 1) * input.pageSize)
      .limit(input.pageSize);
    const allRows = await PurchaseModel.find(
      baseFilter({ ...input, status: 'all', segment: 'all' }),
    );
    return {
      items: rows.map(toDto),
      total,
      page: input.page,
      pageSize: input.pageSize,
      summary: {
        purchaseValueInPaise: allRows.reduce((sum, row) => sum + row.totalInPaise, 0),
        pendingReceipt: allRows.filter((row) =>
          ['Ordered', 'Partially received'].includes(row.status),
        ).length,
        drafts: allRows.filter((row) => row.status === 'Draft').length,
        received: allRows.filter((row) => row.status === 'Received').length,
        payableInPaise: allRows.reduce((sum, row) => sum + row.dueAmountInPaise, 0),
      },
    };
  }

  async create(input: CreatePurchaseInput): Promise<PurchaseDto> {
    const supplier = await SupplierModel.findById(input.supplierId);
    if (!supplier) {
      throw new AppError(404, 'SUPPLIER_NOT_FOUND', 'Supplier was not found.');
    }
    const payload = calculatedPayload(input);
    const purchase = await PurchaseModel.create({
      ...payload,
      purchaseNumber: await nextPurchaseNumber(),
      supplierId: supplier._id,
      supplierName: supplier.name,
      supplierMobile: supplier.mobile,
      purchaseDate: input.purchaseDate ? new Date(input.purchaseDate) : new Date(),
    });
    if (purchase.status === 'Received') {
      purchase.receivedAt = new Date();
      await purchase.save();
      await applyReceivedStock(purchase);
    }
    await refreshSupplierPayable(supplier._id);
    return toDto(purchase);
  }

  async getById(id: string): Promise<PurchaseDto> {
    const purchase = await PurchaseModel.findById(id);
    if (!purchase) throw new AppError(404, 'PURCHASE_NOT_FOUND', 'Purchase was not found.');
    return toDto(purchase);
  }

  async update(id: string, input: UpdatePurchaseInput): Promise<PurchaseDto> {
    const existing = await PurchaseModel.findById(id);
    if (!existing) throw new AppError(404, 'PURCHASE_NOT_FOUND', 'Purchase was not found.');
    if (existing.status === 'Received' && input.status !== 'Received') {
      throw new AppError(
        409,
        'PURCHASE_RECEIVED_LOCKED',
        'Received purchases cannot be moved back.',
      );
    }

    const payload = calculatedPayload(input);
    const nextStatus = (payload as { status?: PurchaseStatus }).status;
    const markReceived = existing.status !== 'Received' && nextStatus === 'Received';
    const purchase = await PurchaseModel.findByIdAndUpdate(
      id,
      {
        $set: {
          ...payload,
          ...(markReceived ? { receivedAt: new Date() } : {}),
        },
      },
      { new: true },
    );
    if (!purchase) throw new AppError(404, 'PURCHASE_NOT_FOUND', 'Purchase was not found.');
    if (markReceived) await applyReceivedStock(purchase);
    await refreshSupplierPayable(purchase.supplierId);
    return toDto(purchase);
  }

  async cancel(id: string): Promise<PurchaseDto> {
    return this.update(id, { status: 'Cancelled' });
  }
}
