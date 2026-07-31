import crypto from 'node:crypto';
import type {
  PublicCheckoutPaymentMethod,
  PublicCheckoutResponseDto,
  PublicVerifyRazorpayPaymentResponseDto,
} from '@aayu-aura/shared-types';
import { Types } from 'mongoose';
import { env } from '../../config/env.js';
import { AppError } from '../../infrastructure/http/app-error.js';
import { OrderModel, type OrderDocument } from '../orders/order.model.js';
import { PaymentService } from '../payments/payment.service.js';
import {
  PaymentGatewayOrderModel,
  type PaymentGatewayOrderDocument,
} from './payment-gateway.model.js';
import type { VerifyRazorpayPaymentInput } from './payment-gateway.schemas.js';

const paymentService = new PaymentService();

interface CreateGatewayOrderInput {
  order: PublicCheckoutResponseDto['order'];
  paymentMethod: Exclude<PublicCheckoutPaymentMethod, 'COD'>;
  customerUpiId?: string;
}

interface RazorpayOrderResponse {
  id: string;
  amount: number;
  currency: 'INR';
  status: string;
}

function razorpayConfigured(): boolean {
  return Boolean(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET);
}

export function assertRazorpayConfigured(): void {
  if (!razorpayConfigured()) {
    throw new AppError(
      503,
      'PAYMENT_GATEWAY_NOT_CONFIGURED',
      'Online payment gateway is not configured. Add Razorpay keys or choose COD.',
    );
  }
}

function hmacSha256(value: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(value).digest('hex');
}

function signaturesMatch(expected: string, received: string): boolean {
  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(received);
  return expectedBuffer.length === receivedBuffer.length &&
    crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
}

async function createRazorpayOrder(order: PublicCheckoutResponseDto['order']): Promise<RazorpayOrderResponse> {
  const credentials = Buffer.from(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`).toString('base64');
  const response = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: order.totalInPaise,
      currency: 'INR',
      receipt: order.orderNumber.slice(0, 40),
      notes: {
        internalOrderId: order.id,
        orderNumber: order.orderNumber,
      },
    }),
  });

  if (!response.ok) {
    throw new AppError(
      502,
      'PAYMENT_GATEWAY_ERROR',
      'Unable to create online payment request. Try again or choose COD.',
    );
  }

  return response.json() as Promise<RazorpayOrderResponse>;
}

export async function createCheckoutGateway(
  input: CreateGatewayOrderInput,
): Promise<NonNullable<PublicCheckoutResponseDto['payment']['gateway']>> {
  assertRazorpayConfigured();
  const razorpayOrder = await createRazorpayOrder(input.order);
  await PaymentGatewayOrderModel.create({
    provider: 'razorpay',
    providerOrderId: razorpayOrder.id,
    orderId: new Types.ObjectId(input.order.id),
    orderNumber: input.order.orderNumber,
    amountInPaise: input.order.totalInPaise,
    currency: 'INR',
    paymentMethod: input.paymentMethod,
    customerUpiId: input.customerUpiId,
    status: 'created',
  });

  return {
    provider: 'razorpay',
    keyId: env.RAZORPAY_KEY_ID,
    orderId: razorpayOrder.id,
    amountInPaise: input.order.totalInPaise,
    currency: 'INR',
    name: 'Aayu & Aura',
    description: input.order.orderNumber,
    prefill: {
      name: input.order.shippingAddress.fullName,
      contact: input.order.shippingAddress.mobile,
    },
  };
}

function trackingIdentifier(order: OrderDocument): string {
  return order.customer.email || order.customer.mobile;
}

async function recordVerifiedPayment(
  gatewayOrder: (PaymentGatewayOrderDocument & { _id: Types.ObjectId }) | null,
  providerPaymentId: string,
  signature?: string,
): Promise<OrderDocument> {
  if (!gatewayOrder) {
    throw new AppError(404, 'PAYMENT_REQUEST_NOT_FOUND', 'Payment request was not found.');
  }

  const order = await OrderModel.findById(gatewayOrder.orderId);
  if (!order) {
    throw new AppError(404, 'ORDER_NOT_FOUND', 'Order was not found for this payment.');
  }

  if (order.paymentStatus !== 'Paid' && order.dueAmountInPaise > 0) {
    await paymentService.create({
      direction: 'Customer receipt',
      orderId: order._id.toString(),
      amountInPaise: Math.min(gatewayOrder.amountInPaise, order.dueAmountInPaise),
      method: gatewayOrder.paymentMethod,
      referenceNumber: providerPaymentId,
      notes: `Razorpay verified payment for ${gatewayOrder.orderNumber}.`,
    });
  }

  await PaymentGatewayOrderModel.findByIdAndUpdate(gatewayOrder._id, {
    $set: {
      status: 'paid',
      providerPaymentId,
      ...(signature ? { signature } : {}),
    },
  });

  const updatedOrder = await OrderModel.findById(gatewayOrder.orderId);
  if (!updatedOrder) {
    throw new AppError(404, 'ORDER_NOT_FOUND', 'Order was not found after payment verification.');
  }
  return updatedOrder;
}

export async function verifyRazorpayPayment(
  input: VerifyRazorpayPaymentInput,
): Promise<PublicVerifyRazorpayPaymentResponseDto> {
  assertRazorpayConfigured();
  const gatewayOrder = await PaymentGatewayOrderModel.findOne({
    provider: 'razorpay',
    providerOrderId: input.razorpayOrderId,
  });

  if (!gatewayOrder) {
    throw new AppError(404, 'PAYMENT_REQUEST_NOT_FOUND', 'Payment request was not found.');
  }

  const expected = hmacSha256(
    `${input.razorpayOrderId}|${input.razorpayPaymentId}`,
    env.RAZORPAY_KEY_SECRET,
  );
  if (!signaturesMatch(expected, input.razorpaySignature)) {
    await PaymentGatewayOrderModel.findByIdAndUpdate(gatewayOrder._id, { $set: { status: 'failed' } });
    throw new AppError(400, 'PAYMENT_SIGNATURE_INVALID', 'Payment verification failed.');
  }

  const updatedOrder = await recordVerifiedPayment(
    gatewayOrder,
    input.razorpayPaymentId,
    input.razorpaySignature,
  );

  return {
    orderNumber: updatedOrder.orderNumber,
    identifier: trackingIdentifier(updatedOrder),
    paymentStatus: updatedOrder.paymentStatus,
    message: 'Payment verified successfully. Your order is now marked paid.',
  };
}

export async function handleRazorpayWebhook(rawBody: string, signature?: string): Promise<void> {
  if (!env.RAZORPAY_WEBHOOK_SECRET) return;
  if (!signature) {
    throw new AppError(400, 'WEBHOOK_SIGNATURE_MISSING', 'Razorpay webhook signature is missing.');
  }

  const expected = hmacSha256(rawBody, env.RAZORPAY_WEBHOOK_SECRET);
  if (!signaturesMatch(expected, signature)) {
    throw new AppError(400, 'WEBHOOK_SIGNATURE_INVALID', 'Razorpay webhook verification failed.');
  }

  const event = JSON.parse(rawBody) as {
    event?: string;
    payload?: {
      payment?: { entity?: { id?: string; order_id?: string } };
      order?: { entity?: { id?: string } };
    };
  };

  if (!['payment.captured', 'payment.authorized', 'order.paid'].includes(event.event ?? '')) {
    return;
  }

  const providerOrderId =
    event.payload?.payment?.entity?.order_id ?? event.payload?.order?.entity?.id;
  const providerPaymentId = event.payload?.payment?.entity?.id;
  if (!providerOrderId || !providerPaymentId) return;

  const gatewayOrder = await PaymentGatewayOrderModel.findOne({
    provider: 'razorpay',
    providerOrderId,
  });
  await recordVerifiedPayment(gatewayOrder, providerPaymentId);
}
