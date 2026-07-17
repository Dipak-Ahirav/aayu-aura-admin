import { Types } from 'mongoose';
import type { InvoiceDto } from '@aayu-aura/shared-types';
import { CounterModel } from '../counters/counter.model.js';
import { OrderModel } from '../orders/order.model.js';
import { AppError } from '../../infrastructure/http/app-error.js';
import { recordAudit } from '../audit-logs/audit-recorder.js';
import { InvoiceModel, type InvoiceDocument } from './invoice.model.js';
import { renderInvoicePdf } from './invoice-pdf.service.js';
import type { CreateInvoiceInput } from './invoice.schemas.js';

function cleanEmpty(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

async function nextInvoiceNumber(): Promise<string> {
  const now = new Date();
  const financialYearStart = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  const sequenceKey = `invoices-${financialYearStart}`;
  const sequence = await CounterModel.findOneAndUpdate(
    { _id: sequenceKey },
    { $inc: { sequence: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
  const yearLabel = `${financialYearStart}-${String(financialYearStart + 1).slice(-2)}`;
  return `AA/${yearLabel}/${String(sequence.sequence).padStart(6, '0')}`;
}

function toDto(invoice: InvoiceDocument & { _id: Types.ObjectId }): InvoiceDto {
  return {
    id: invoice._id.toString(),
    invoiceNumber: invoice.invoiceNumber,
    type: invoice.type,
    status: invoice.status,
    orderId: invoice.orderId.toString(),
    orderNumber: invoice.orderNumber,
    customer: invoice.customer,
    items: invoice.items.map((item) => ({
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
    subtotalInPaise: invoice.subtotalInPaise,
    itemDiscountInPaise: invoice.itemDiscountInPaise,
    taxableAmountInPaise: invoice.taxableAmountInPaise,
    taxAmountInPaise: invoice.taxAmountInPaise,
    shippingChargeInPaise: invoice.shippingChargeInPaise,
    packagingChargeInPaise: invoice.packagingChargeInPaise,
    otherChargeInPaise: invoice.otherChargeInPaise,
    grandTotalInPaise: invoice.grandTotalInPaise,
    paidAmountInPaise: invoice.paidAmountInPaise,
    dueAmountInPaise: invoice.dueAmountInPaise,
    invoiceDate: invoice.invoiceDate.toISOString(),
    dueDate: invoice.dueDate?.toISOString(),
    notes: invoice.notes,
    createdAt: invoice.createdAt.toISOString(),
  };
}

export class InvoiceService {
  async create(input: CreateInvoiceInput, userId?: string): Promise<InvoiceDto> {
    const existing = await InvoiceModel.findOne({ orderId: input.orderId, type: input.type });
    if (existing) {
      return toDto(existing);
    }

    const order = await OrderModel.findById(input.orderId);
    if (!order) {
      throw new AppError(404, 'ORDER_NOT_FOUND', 'Order was not found.');
    }

    const invoice = await InvoiceModel.create({
      invoiceNumber: await nextInvoiceNumber(),
      type: input.type,
      status: 'Finalised',
      orderId: order._id,
      orderNumber: order.orderNumber,
      customer: order.customer,
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
      grandTotalInPaise: order.totalInPaise,
      paidAmountInPaise: order.advancePaidInPaise,
      dueAmountInPaise: order.dueAmountInPaise,
      invoiceDate: new Date(),
      dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
      notes: cleanEmpty(input.notes),
      createdBy: userId ? new Types.ObjectId(userId) : undefined,
    });

    const dto = toDto(invoice);
    await recordAudit({
      module: 'Invoices',
      action: 'Create invoice',
      entity: 'Invoice',
      entityId: dto.id,
      userId,
      newValue: dto as unknown as Record<string, unknown>,
      metadata: { orderId: dto.orderId, invoiceNumber: dto.invoiceNumber },
    });
    return dto;
  }

  async list(): Promise<InvoiceDto[]> {
    const invoices = await InvoiceModel.find().sort({ createdAt: -1 }).limit(50);
    return invoices.map((invoice) => toDto(invoice));
  }

  async getById(id: string): Promise<InvoiceDto> {
    const invoice = await InvoiceModel.findById(id);
    if (!invoice) {
      throw new AppError(404, 'INVOICE_NOT_FOUND', 'Invoice was not found.');
    }
    return toDto(invoice);
  }

  async renderPdf(id: string): Promise<{ filename: string; content: Buffer }> {
    const invoice = await this.getById(id);
    const safeNumber = invoice.invoiceNumber.replace(/[^a-zA-Z0-9-]+/g, '-');
    return {
      filename: `${safeNumber}.pdf`,
      content: renderInvoicePdf(invoice),
    };
  }
}
