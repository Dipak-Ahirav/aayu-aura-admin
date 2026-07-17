import { Types } from 'mongoose';
import type { OrderPaymentStatus, PaymentDto } from '@aayu-aura/shared-types';
import { CounterModel } from '../counters/counter.model.js';
import { InvoiceModel } from '../invoices/invoice.model.js';
import { OrderModel, type OrderDocument } from '../orders/order.model.js';
import { AppError } from '../../infrastructure/http/app-error.js';
import { recordAudit } from '../audit-logs/audit-recorder.js';
import { PaymentModel, type PaymentDocument } from './payment.model.js';
import type { CreatePaymentInput } from './payment.schemas.js';

function cleanEmpty(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function paymentStatus(totalInPaise: number, paidInPaise: number): OrderPaymentStatus {
  if (paidInPaise <= 0) {
    return 'Unpaid';
  }
  if (paidInPaise >= totalInPaise) {
    return 'Paid';
  }
  return 'Partially paid';
}

async function nextPaymentNumber(): Promise<string> {
  const now = new Date();
  const financialYearStart = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  const sequenceKey = `payments-${financialYearStart}`;
  const sequence = await CounterModel.findOneAndUpdate(
    { _id: sequenceKey },
    { $inc: { sequence: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
  const yearLabel = `${financialYearStart}-${String(financialYearStart + 1).slice(-2)}`;
  return `AA/PAY/${yearLabel}/${String(sequence.sequence).padStart(6, '0')}`;
}

function toDto(payment: PaymentDocument & { _id: Types.ObjectId }): PaymentDto {
  return {
    id: payment._id.toString(),
    paymentNumber: payment.paymentNumber,
    direction: payment.direction,
    status: payment.status,
    orderId: payment.orderId?.toString(),
    orderNumber: payment.orderNumber,
    invoiceId: payment.invoiceId?.toString(),
    invoiceNumber: payment.invoiceNumber,
    customer: payment.customer,
    amountInPaise: payment.amountInPaise,
    method: payment.method,
    paymentDate: payment.paymentDate.toISOString(),
    referenceNumber: payment.referenceNumber,
    notes: payment.notes,
    createdAt: payment.createdAt.toISOString(),
  };
}

async function paidTotalForOrder(orderId: Types.ObjectId): Promise<number> {
  const [result] = await PaymentModel.aggregate<{ total: number }>([
    { $match: { orderId, status: { $ne: 'Cancelled' }, direction: 'Customer receipt' } },
    { $group: { _id: null, total: { $sum: '$amountInPaise' } } },
  ]);
  return result?.total ?? 0;
}

async function paidTotalForInvoice(invoiceId: Types.ObjectId): Promise<number> {
  const [result] = await PaymentModel.aggregate<{ total: number }>([
    { $match: { invoiceId, status: { $ne: 'Cancelled' }, direction: 'Customer receipt' } },
    { $group: { _id: null, total: { $sum: '$amountInPaise' } } },
  ]);
  return result?.total ?? 0;
}

async function updateOrderPayment(order: OrderDocument & { _id: Types.ObjectId }) {
  const paid = Math.min(await paidTotalForOrder(order._id), order.totalInPaise);
  await OrderModel.findByIdAndUpdate(order._id, {
    $set: {
      advancePaidInPaise: paid,
      dueAmountInPaise: Math.max(order.totalInPaise - paid, 0),
      paymentStatus: paymentStatus(order.totalInPaise, paid),
    },
  });
}

export class PaymentService {
  async create(input: CreatePaymentInput, userId?: string): Promise<PaymentDto> {
    const invoice = input.invoiceId ? await InvoiceModel.findById(input.invoiceId) : null;
    const orderId = invoice?.orderId.toString() ?? cleanEmpty(input.orderId);
    const order = orderId ? await OrderModel.findById(orderId) : null;

    if (!order) {
      throw new AppError(404, 'ORDER_NOT_FOUND', 'Select a valid order before recording payment.');
    }

    if (input.invoiceId && !invoice) {
      throw new AppError(404, 'INVOICE_NOT_FOUND', 'Selected invoice was not found.');
    }

    const outstanding = invoice ? invoice.dueAmountInPaise : order.dueAmountInPaise;
    if (input.direction === 'Customer receipt' && input.amountInPaise > outstanding) {
      throw new AppError(
        400,
        'PAYMENT_EXCEEDS_DUE',
        'Payment amount cannot be greater than the selected due amount.',
      );
    }

    const payment = await PaymentModel.create({
      paymentNumber: await nextPaymentNumber(),
      direction: input.direction,
      status: 'Recorded',
      orderId: order._id,
      orderNumber: order.orderNumber,
      invoiceId: invoice?._id,
      invoiceNumber: invoice?.invoiceNumber,
      customer: order.customer,
      amountInPaise: input.amountInPaise,
      method: input.method,
      paymentDate: input.paymentDate ? new Date(input.paymentDate) : new Date(),
      referenceNumber: cleanEmpty(input.referenceNumber),
      notes: cleanEmpty(input.notes),
      createdBy: userId ? new Types.ObjectId(userId) : undefined,
    });

    if (invoice) {
      const invoicePaid = Math.min(
        await paidTotalForInvoice(invoice._id),
        invoice.grandTotalInPaise,
      );
      invoice.paidAmountInPaise = invoicePaid;
      invoice.dueAmountInPaise = Math.max(invoice.grandTotalInPaise - invoicePaid, 0);
      await invoice.save();
    }

    await updateOrderPayment(order);

    const dto = toDto(payment);
    await recordAudit({
      module: 'Payments',
      action: 'Create payment',
      entity: 'Payment',
      entityId: dto.id,
      userId,
      newValue: dto as unknown as Record<string, unknown>,
      metadata: {
        orderId: dto.orderId,
        invoiceId: dto.invoiceId,
        paymentNumber: dto.paymentNumber,
      },
    });
    return dto;
  }

  async list(): Promise<PaymentDto[]> {
    const payments = await PaymentModel.find().sort({ paymentDate: -1, createdAt: -1 }).limit(100);
    return payments.map((payment) => toDto(payment));
  }
}
