import { Types } from 'mongoose';
import type { OrderDto, OrderItemDto, OrderPaymentStatus } from '@aayu-aura/shared-types';
import { CounterModel } from '../counters/counter.model.js';
import { CustomerModel } from '../customers/customer.model.js';
import { AppError } from '../../infrastructure/http/app-error.js';
import { OrderModel, type OrderDocument } from './order.model.js';
import type { CreateOrderInput } from './order.schemas.js';

function cleanEmpty(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function calculateItems(input: CreateOrderInput): OrderItemDto[] {
  return input.items.map((item) => {
    const gross = item.quantity * item.unitPriceInPaise;
    const discount = Math.min(item.discountInPaise, gross);
    const taxableAmountInPaise = gross - discount;
    const taxAmountInPaise = Math.round((taxableAmountInPaise * item.gstRate) / 100);
    const lineTotalInPaise = taxableAmountInPaise + taxAmountInPaise;

    return {
      ...item,
      sku: cleanEmpty(item.sku),
      hsn: cleanEmpty(item.hsn),
      discountInPaise: discount,
      taxableAmountInPaise,
      taxAmountInPaise,
      lineTotalInPaise,
    };
  });
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

async function nextOrderNumber(): Promise<string> {
  const now = new Date();
  const financialYearStart = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  const sequenceKey = `orders-${financialYearStart}`;
  const sequence = await CounterModel.findOneAndUpdate(
    { _id: sequenceKey },
    { $inc: { sequence: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
  const yearLabel = `${financialYearStart}-${String(financialYearStart + 1).slice(-2)}`;
  return `AA/ORD/${yearLabel}/${String(sequence.sequence).padStart(6, '0')}`;
}

function toDto(order: OrderDocument & { _id: Types.ObjectId }): OrderDto {
  return {
    id: order._id.toString(),
    orderNumber: order.orderNumber,
    source: order.source,
    customer: {
      id: order.customerId?.toString(),
      ...order.customer,
    },
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

export class OrderService {
  async create(input: CreateOrderInput, userId?: string): Promise<OrderDto> {
    const items = calculateItems(input);
    const subtotalInPaise = items.reduce(
      (sum, item) => sum + item.quantity * item.unitPriceInPaise,
      0,
    );
    const itemDiscountInPaise = items.reduce((sum, item) => sum + item.discountInPaise, 0);
    const taxableAmountInPaise = items.reduce((sum, item) => sum + item.taxableAmountInPaise, 0);
    const taxAmountInPaise = items.reduce((sum, item) => sum + item.taxAmountInPaise, 0);
    const charges =
      input.shippingChargeInPaise + input.packagingChargeInPaise + input.otherChargeInPaise;
    const totalInPaise = taxableAmountInPaise + taxAmountInPaise + charges;
    const advancePaidInPaise = Math.min(input.advancePaidInPaise, totalInPaise);
    const dueAmountInPaise = totalInPaise - advancePaidInPaise;

    const customer = await CustomerModel.findOneAndUpdate(
      { mobile: input.customer.mobile },
      {
        $set: {
          name: input.customer.name,
          mobile: input.customer.mobile,
          email: cleanEmpty(input.customer.email),
          billingAddress: cleanEmpty(input.customer.billingAddress),
          shippingAddress: cleanEmpty(input.customer.shippingAddress),
          state: cleanEmpty(input.customer.state),
          stateCode: cleanEmpty(input.customer.stateCode),
          isActive: true,
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );

    const order = await OrderModel.create({
      orderNumber: await nextOrderNumber(),
      source: input.source,
      customerId: customer._id,
      customer: {
        name: input.customer.name,
        mobile: input.customer.mobile,
        email: cleanEmpty(input.customer.email),
        billingAddress: cleanEmpty(input.customer.billingAddress),
        shippingAddress: cleanEmpty(input.customer.shippingAddress),
        state: cleanEmpty(input.customer.state),
        stateCode: cleanEmpty(input.customer.stateCode),
      },
      items,
      subtotalInPaise,
      itemDiscountInPaise,
      taxableAmountInPaise,
      taxAmountInPaise,
      shippingChargeInPaise: input.shippingChargeInPaise,
      packagingChargeInPaise: input.packagingChargeInPaise,
      otherChargeInPaise: input.otherChargeInPaise,
      totalInPaise,
      advancePaidInPaise,
      dueAmountInPaise,
      paymentStatus: paymentStatus(totalInPaise, advancePaidInPaise),
      fulfilmentStatus: 'Pending',
      status: 'Pending',
      orderDate: new Date(),
      notes: cleanEmpty(input.notes),
      internalNotes: cleanEmpty(input.internalNotes),
      createdBy: userId ? new Types.ObjectId(userId) : undefined,
    });

    return toDto(order);
  }

  async list(): Promise<OrderDto[]> {
    const orders = await OrderModel.find().sort({ createdAt: -1 }).limit(50);
    return orders.map((order) => toDto(order));
  }

  async getById(id: string): Promise<OrderDto> {
    const order = await OrderModel.findById(id);
    if (!order) {
      throw new AppError(404, 'ORDER_NOT_FOUND', 'Order was not found.');
    }
    return toDto(order);
  }
}
