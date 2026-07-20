import type {
  CustomerFriendlyOrderStatus,
  OrderFulfilmentStatus,
  PublicOrderTrackingDto,
  PublicOrderTrackingTimelineStepDto,
} from '@aayu-aura/shared-types';
import { AppError } from '../../infrastructure/http/app-error.js';
import { InvoiceModel } from '../invoices/invoice.model.js';
import { InvoiceService } from '../invoices/invoice.service.js';
import { OrderModel, type OrderDocument } from '../orders/order.model.js';
import { ReturnRequestModel } from '../returns/return-request.model.js';
import { ShipmentModel } from '../shipping/shipment.model.js';
import type { PublicOrderTrackingInput } from './storefront-tracking.schemas.js';

const invoiceService = new InvoiceService();

const fulfilmentOrder: OrderFulfilmentStatus[] = [
  'Pending',
  'Confirmed',
  'Packed',
  'Ready to ship',
  'Shipped',
  'Delivered',
];

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalisePhone(value: string): string {
  return value.replace(/\D/g, '').slice(-10);
}

function normaliseEmail(value?: string): string {
  return (value ?? '').trim().toLowerCase();
}

function identifierMatches(order: OrderDocument, identifier: string): boolean {
  const inputEmail = normaliseEmail(identifier);
  const inputPhone = normalisePhone(identifier);
  const orderEmail = normaliseEmail(order.customer.email);
  const orderPhone = normalisePhone(order.customer.mobile);

  return Boolean(
    (inputEmail.includes('@') && orderEmail && inputEmail === orderEmail) ||
      (inputPhone && orderPhone && inputPhone === orderPhone),
  );
}

function maskIdentifier(order: OrderDocument): string {
  const email = normaliseEmail(order.customer.email);
  if (email) {
    const [name, domain] = email.split('@');
    const visible = name.length <= 2 ? name[0] ?? '*' : `${name.slice(0, 2)}***`;
    return `${visible}@${domain}`;
  }

  const phone = normalisePhone(order.customer.mobile);
  return phone ? `******${phone.slice(-4)}` : 'Verified customer';
}

function mapCustomerStatus(status: OrderFulfilmentStatus): CustomerFriendlyOrderStatus {
  if (status === 'Cancelled') return 'Cancelled';
  if (status === 'Delivered') return 'Delivered';
  if (status === 'Shipped') return 'Shipped';
  if (status === 'Ready to ship' || status === 'Packed') return 'Packed';
  if (status === 'Confirmed') return 'Order confirmed';
  return 'Order placed';
}

function timelineFor(
  status: OrderFulfilmentStatus,
  dates: {
    placedAt: Date;
    dispatchDate?: Date;
    expectedDeliveryDate?: Date;
    deliveredAt?: Date;
  },
): PublicOrderTrackingTimelineStepDto[] {
  if (status === 'Cancelled') {
    return [
      {
        label: 'Cancelled',
        description: 'This order is cancelled. Contact support for payment or refund help.',
        completed: true,
        current: true,
      },
    ];
  }

  const currentIndex = Math.max(fulfilmentOrder.indexOf(status), 0);
  return [
    {
      label: 'Order placed',
      description: 'We received your saree order.',
      date: dates.placedAt.toISOString(),
    },
    {
      label: 'Order confirmed',
      description: 'Stock and payment details are confirmed.',
    },
    {
      label: 'Packed',
      description: 'Your saree is being packed with invoice and care details.',
    },
    {
      label: 'Shipped',
      description: 'Courier pickup is complete.',
      date: dates.dispatchDate?.toISOString(),
    },
    {
      label: 'Out for delivery',
      description: 'Expected delivery date is available once courier updates.',
      date: dates.expectedDeliveryDate?.toISOString(),
    },
    {
      label: 'Delivered',
      description: 'Delivered to the provided address.',
      date: dates.deliveredAt?.toISOString(),
    },
  ].map((step, index) => ({
    ...step,
    completed: index <= currentIndex,
    current: index === currentIndex,
  }));
}

function canCancel(status: OrderFulfilmentStatus): boolean {
  return ['Pending', 'Confirmed'].includes(status);
}

function canReturn(status: OrderFulfilmentStatus): boolean {
  return status === 'Delivered';
}

async function findVerifiedOrder(input: PublicOrderTrackingInput) {
  const order = await OrderModel.findOne({
    orderNumber: new RegExp(`^${escapeRegExp(input.orderNumber)}$`, 'i'),
  });

  if (!order || !identifierMatches(order, input.identifier)) {
    throw new AppError(
      404,
      'ORDER_TRACKING_NOT_FOUND',
      'No order matched this order number and email/mobile.',
    );
  }

  return order;
}

export async function getPublicOrderTracking(
  input: PublicOrderTrackingInput,
): Promise<PublicOrderTrackingDto> {
  const order = await findVerifiedOrder(input);
  const [shipment, invoice, returns] = await Promise.all([
    ShipmentModel.findOne({ orderId: order._id, status: { $ne: 'Cancelled' } }).sort({
      createdAt: -1,
    }),
    InvoiceModel.findOne({ orderId: order._id, status: { $ne: 'Cancelled' } }).sort({
      invoiceDate: -1,
    }),
    ReturnRequestModel.find({ orderId: order._id }).sort({ requestedDate: -1 }).limit(10),
  ]);

  const fulfilmentStatus = order.fulfilmentStatus;
  const encodedOrder = encodeURIComponent(order.orderNumber);
  const encodedIdentifier = encodeURIComponent(input.identifier);

  return {
    order: {
      id: order._id.toString(),
      orderNumber: order.orderNumber,
      placedAt: order.orderDate.toISOString(),
      customerName: order.customer.name,
      maskedIdentifier: maskIdentifier(order),
      status: mapCustomerStatus(fulfilmentStatus),
      fulfilmentStatus,
      paymentStatus: order.paymentStatus,
      totalInPaise: order.totalInPaise,
      paidAmountInPaise: order.advancePaidInPaise,
      dueAmountInPaise: order.dueAmountInPaise,
      itemCount: order.items.reduce((total, item) => total + item.quantity, 0),
      deliveryAddress: order.customer.shippingAddress || order.customer.billingAddress,
      cancellationAllowed: canCancel(fulfilmentStatus),
      returnAllowed: canReturn(fulfilmentStatus),
    },
    items: order.items.map((item) => ({
      productName: item.productName,
      productCode: item.sku,
      quantity: item.quantity,
      unitPriceInPaise: item.unitPriceInPaise,
      discountInPaise: item.discountInPaise,
      taxAmountInPaise: item.taxAmountInPaise,
      lineTotalInPaise: item.lineTotalInPaise,
    })),
    timeline: timelineFor(fulfilmentStatus, {
      placedAt: order.orderDate,
      dispatchDate: shipment?.dispatchDate,
      expectedDeliveryDate: shipment?.expectedDeliveryDate,
      deliveredAt: shipment?.deliveredAt,
    }),
    shipment: shipment
      ? {
          shipmentNumber: shipment.shipmentNumber,
          courier: shipment.courier,
          trackingNumber: shipment.trackingNumber,
          status: shipment.status,
          dispatchDate: shipment.dispatchDate?.toISOString(),
          expectedDeliveryDate: shipment.expectedDeliveryDate?.toISOString(),
          deliveredAt: shipment.deliveredAt?.toISOString(),
        }
      : {
          status: 'Not shipped',
        },
    invoice: invoice
      ? {
          id: invoice._id.toString(),
          invoiceNumber: invoice.invoiceNumber,
          status: invoice.status,
          downloadUrl: `/public/track-order/${encodedOrder}/invoice/${invoice._id.toString()}/pdf?identifier=${encodedIdentifier}`,
        }
      : undefined,
    returns: returns.map((row) => ({
      returnNumber: row.returnNumber,
      status: row.status,
      resolution: row.resolution,
      refundAmountInPaise: row.refundAmountInPaise,
      exchangeProductName: row.exchangeProductName,
      requestedDate: row.requestedDate.toISOString(),
      closedAt: row.closedAt?.toISOString(),
    })),
    support: {
      whatsappUrl: `https://wa.me/?text=${encodeURIComponent(
        `I need help with order ${order.orderNumber}.`,
      )}`,
      message: 'Share this order number on WhatsApp for cancellation, return, exchange, or refund help.',
    },
  };
}

export async function renderPublicOrderInvoicePdf(
  input: PublicOrderTrackingInput,
  invoiceId: string,
) {
  const order = await findVerifiedOrder(input);
  const invoice = await InvoiceModel.findOne({
    _id: invoiceId,
    orderId: order._id,
    status: { $ne: 'Cancelled' },
  });

  if (!invoice) {
    throw new AppError(404, 'INVOICE_NOT_FOUND', 'Invoice was not found for this order.');
  }

  return invoiceService.renderPdf(invoice._id.toString());
}
