import { Types, type SortOrder } from 'mongoose';
import type {
  OrderDto,
  OrderFulfilmentStatus,
  ShipmentDto,
  ShippingListDto,
  ShippingSummaryDto,
} from '@aayu-aura/shared-types';
import { CounterModel } from '../counters/counter.model.js';
import { OrderModel, type OrderDocument } from '../orders/order.model.js';
import { AppError } from '../../infrastructure/http/app-error.js';
import { renderPackingSlipPdf } from './packing-slip-pdf.service.js';
import { ShipmentModel, type ShipmentDocument } from './shipment.model.js';
import type {
  CreateShipmentInput,
  ShippingQueryInput,
  UpdateShipmentInput,
} from './shipping.schemas.js';

function cleanEmpty(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

async function nextShipmentNumber(): Promise<string> {
  const now = new Date();
  const financialYearStart = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  const sequence = await CounterModel.findOneAndUpdate(
    { _id: `shipments-${financialYearStart}` },
    { $inc: { sequence: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
  const yearLabel = `${financialYearStart}-${String(financialYearStart + 1).slice(-2)}`;
  return `AA/SHP/${yearLabel}/${String(sequence.sequence).padStart(6, '0')}`;
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

function toDto(shipment: ShipmentDocument & { _id: Types.ObjectId }): ShipmentDto {
  return {
    id: shipment._id.toString(),
    shipmentNumber: shipment.shipmentNumber,
    orderId: shipment.orderId.toString(),
    orderNumber: shipment.orderNumber,
    customer: shipment.customer,
    items: shipment.items,
    courier: shipment.courier,
    trackingNumber: shipment.trackingNumber,
    status: shipment.status,
    dispatchDate: shipment.dispatchDate?.toISOString(),
    expectedDeliveryDate: shipment.expectedDeliveryDate?.toISOString(),
    deliveredAt: shipment.deliveredAt?.toISOString(),
    packageWeightGrams: shipment.packageWeightGrams,
    packageCount: shipment.packageCount,
    notes: shipment.notes,
    createdAt: shipment.createdAt.toISOString(),
  };
}

function orderStatusFor(status: ShipmentDto['status']): OrderFulfilmentStatus {
  if (status === 'Delivered') return 'Delivered';
  if (status === 'Cancelled') return 'Ready to ship';
  if (status === 'Ready') return 'Ready to ship';
  return 'Shipped';
}

function filterFor(input: ShippingQueryInput): Record<string, unknown> {
  const filter: Record<string, unknown> = {};
  if (input.status !== 'all') filter['status'] = input.status;
  if (input.courier !== 'all') filter['courier'] = input.courier;
  if (input.segment === 'ready') filter['status'] = 'Ready';
  if (input.segment === 'shipped') filter['status'] = { $in: ['Shipped', 'In transit'] };
  if (input.segment === 'delivered') filter['status'] = 'Delivered';
  if (input.segment === 'delayed') filter['status'] = 'Delayed';
  if (input.search) {
    const search = new RegExp(input.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter['$or'] = [
      { shipmentNumber: search },
      { orderNumber: search },
      { courier: search },
      { trackingNumber: search },
      { 'customer.name': search },
      { 'customer.mobile': search },
    ];
  }
  return filter;
}

function sortFor(input: ShippingQueryInput): Record<string, SortOrder> {
  if (input.sort === 'oldest') return { createdAt: 1 };
  if (input.sort === 'expected_asc') return { expectedDeliveryDate: 1 };
  if (input.sort === 'expected_desc') return { expectedDeliveryDate: -1 };
  return { createdAt: -1 };
}

function buildSummary(shipments: ShipmentDto[], readyOrders: OrderDto[]): ShippingSummaryDto {
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return {
    readyToShip:
      readyOrders.length + shipments.filter((shipment) => shipment.status === 'Ready').length,
    inTransit: shipments.filter((shipment) => ['Shipped', 'In transit'].includes(shipment.status))
      .length,
    delayed: shipments.filter((shipment) => shipment.status === 'Delayed').length,
    deliveredWeek: shipments.filter(
      (shipment) =>
        shipment.status === 'Delivered' &&
        shipment.deliveredAt &&
        new Date(shipment.deliveredAt).getTime() >= weekAgo,
    ).length,
    totalShipments: shipments.length,
    shipped: shipments.filter((shipment) => ['Shipped', 'In transit'].includes(shipment.status))
      .length,
    delivered: shipments.filter((shipment) => shipment.status === 'Delivered').length,
  };
}

async function readyOrders(): Promise<OrderDto[]> {
  const shippedOrderIds = await ShipmentModel.distinct('orderId', { status: { $ne: 'Cancelled' } });
  const orders = await OrderModel.find({
    _id: { $nin: shippedOrderIds },
    fulfilmentStatus: { $nin: ['Shipped', 'Delivered', 'Cancelled'] },
  })
    .sort({ createdAt: -1 })
    .limit(100);
  return orders.map((order) => orderToDto(order));
}

function dateValue(value: string | undefined): Date | undefined {
  return value ? new Date(value) : undefined;
}

export class ShippingService {
  async list(input: ShippingQueryInput): Promise<ShippingListDto> {
    const [ready, allShipments] = await Promise.all([readyOrders(), ShipmentModel.find()]);
    const filter = filterFor(input);
    const total = await ShipmentModel.countDocuments(filter);
    const rows = await ShipmentModel.find(filter)
      .sort(sortFor(input))
      .skip((input.page - 1) * input.pageSize)
      .limit(input.pageSize);
    return {
      items: rows.map((shipment) => toDto(shipment)),
      readyOrders: ready,
      total,
      page: input.page,
      pageSize: input.pageSize,
      summary: buildSummary(
        allShipments.map((shipment) => toDto(shipment)),
        ready,
      ),
    };
  }

  async create(input: CreateShipmentInput, userId?: string): Promise<ShipmentDto> {
    const existing = await ShipmentModel.findOne({ orderId: input.orderId });
    if (existing) {
      throw new AppError(409, 'SHIPMENT_EXISTS', 'A shipment already exists for this order.');
    }
    const order = await OrderModel.findById(input.orderId);
    if (!order) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order was not found.');
    const shipment = await ShipmentModel.create({
      shipmentNumber: await nextShipmentNumber(),
      orderId: order._id,
      orderNumber: order.orderNumber,
      customer: order.customer,
      items: order.items,
      courier: input.courier.trim(),
      trackingNumber: cleanEmpty(input.trackingNumber),
      status: input.status,
      dispatchDate: dateValue(input.dispatchDate),
      expectedDeliveryDate: dateValue(input.expectedDeliveryDate),
      deliveredAt: dateValue(input.deliveredAt),
      packageWeightGrams: input.packageWeightGrams,
      packageCount: input.packageCount,
      notes: cleanEmpty(input.notes),
      createdBy: userId ? new Types.ObjectId(userId) : undefined,
    });
    await OrderModel.findByIdAndUpdate(order._id, {
      $set: {
        fulfilmentStatus: orderStatusFor(shipment.status),
        status: orderStatusFor(shipment.status),
      },
    });
    return toDto(shipment);
  }

  async getById(id: string): Promise<ShipmentDto> {
    const shipment = await ShipmentModel.findById(id);
    if (!shipment) throw new AppError(404, 'SHIPMENT_NOT_FOUND', 'Shipment was not found.');
    return toDto(shipment);
  }

  async update(id: string, input: UpdateShipmentInput): Promise<ShipmentDto> {
    const payload: Partial<ShipmentDocument> = {};
    if (input.courier !== undefined) payload.courier = input.courier.trim();
    if (input.trackingNumber !== undefined)
      payload.trackingNumber = cleanEmpty(input.trackingNumber);
    if (input.status !== undefined) payload.status = input.status;
    if (input.dispatchDate !== undefined) payload.dispatchDate = dateValue(input.dispatchDate);
    if (input.expectedDeliveryDate !== undefined)
      payload.expectedDeliveryDate = dateValue(input.expectedDeliveryDate);
    if (input.deliveredAt !== undefined) payload.deliveredAt = dateValue(input.deliveredAt);
    if (input.packageWeightGrams !== undefined)
      payload.packageWeightGrams = input.packageWeightGrams;
    if (input.packageCount !== undefined) payload.packageCount = input.packageCount;
    if (input.notes !== undefined) payload.notes = cleanEmpty(input.notes);

    const shipment = await ShipmentModel.findByIdAndUpdate(id, { $set: payload }, { new: true });
    if (!shipment) throw new AppError(404, 'SHIPMENT_NOT_FOUND', 'Shipment was not found.');
    await OrderModel.findByIdAndUpdate(shipment.orderId, {
      $set: {
        fulfilmentStatus: orderStatusFor(shipment.status),
        status: orderStatusFor(shipment.status),
      },
    });
    return toDto(shipment);
  }

  async cancel(id: string): Promise<ShipmentDto> {
    return this.update(id, { status: 'Cancelled' });
  }

  async packingSlip(id: string): Promise<{ filename: string; content: Buffer }> {
    const shipment = await this.getById(id);
    const safeNumber = shipment.shipmentNumber.replace(/[^a-zA-Z0-9-]+/g, '-');
    return { filename: `${safeNumber}-packing-slip.pdf`, content: renderPackingSlipPdf(shipment) };
  }

  async orderPackingSlip(orderId: string): Promise<{ filename: string; content: Buffer }> {
    const order = await OrderModel.findById(orderId);
    if (!order) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order was not found.');
    const orderDto = orderToDto(order);
    const safeNumber = orderDto.orderNumber.replace(/[^a-zA-Z0-9-]+/g, '-');
    return {
      filename: `${safeNumber}-packing-slip.pdf`,
      content: renderPackingSlipPdf({
        id: orderDto.id,
        shipmentNumber: `PACK/${orderDto.orderNumber}`,
        orderId: orderDto.id,
        orderNumber: orderDto.orderNumber,
        customer: orderDto.customer,
        items: orderDto.items,
        courier: 'Not assigned',
        status: 'Ready',
        packageWeightGrams: 0,
        packageCount: 1,
        createdAt: orderDto.createdAt,
      }),
    };
  }
}
