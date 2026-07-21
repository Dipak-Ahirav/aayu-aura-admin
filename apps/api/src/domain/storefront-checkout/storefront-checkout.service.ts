import type {
  CustomerOrderDto,
  CustomerOrderAddressSnapshotDto,
  PublicCheckoutResponseDto,
} from '@aayu-aura/shared-types';
import { AppError } from '../../infrastructure/http/app-error.js';
import { OrderService } from '../orders/order.service.js';
import { ProductModel } from '../products/product.model.js';
import { quotePublicCart } from '../storefront-cart/storefront-cart.service.js';
import type { PublicCheckoutInput } from './storefront-checkout.schemas.js';

const orderService = new OrderService();

function clean(value?: string): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function addressText(input: PublicCheckoutInput['customer']): string {
  return [
    input.addressLine1,
    clean(input.addressLine2),
    clean(input.landmark),
    input.city,
    input.state,
    input.pinCode,
  ].filter(Boolean).join(', ');
}

function addressSnapshot(input: PublicCheckoutInput['customer']): CustomerOrderAddressSnapshotDto {
  return {
    fullName: input.fullName,
    mobile: input.mobile,
    addressLine1: input.addressLine1,
    addressLine2: clean(input.addressLine2),
    landmark: clean(input.landmark),
    city: input.city,
    state: input.state,
    stateCode: clean(input.stateCode),
    country: 'India',
    pinCode: input.pinCode,
  };
}

function distributeDiscount(totalDiscount: number, lineTotals: number[]): number[] {
  if (totalDiscount <= 0 || lineTotals.length === 0) return lineTotals.map(() => 0);
  const subtotal = lineTotals.reduce((sum, value) => sum + value, 0);
  let allocated = 0;
  return lineTotals.map((lineTotal, index) => {
    if (index === lineTotals.length - 1) return Math.max(totalDiscount - allocated, 0);
    const discount = Math.min(Math.round((lineTotal / subtotal) * totalDiscount), lineTotal);
    allocated += discount;
    return discount;
  });
}

function paymentMessage(method: PublicCheckoutInput['paymentMethod']): string {
  if (method === 'COD') return 'COD selected. Pay the payable amount during delivery where serviceable.';
  return `${method} selected. Payment gateway capture is pending, so this order is saved as unpaid.`;
}

export async function createPublicCheckoutOrder(
  input: PublicCheckoutInput,
): Promise<PublicCheckoutResponseDto> {
  const quote = await quotePublicCart({
    ...input.cart,
    pinCode: input.customer.pinCode,
  });

  if (quote.items.length === 0) {
    throw new AppError(400, 'EMPTY_CART', 'Add at least one available product before checkout.');
  }

  if (quote.unavailableItems.length > 0 || quote.items.some((item) => item.isQuantityAdjusted)) {
    throw new AppError(
      409,
      'CART_CHANGED',
      'Cart availability changed. Refresh cart before placing the order.',
    );
  }

  if (input.paymentMethod === 'COD' && !quote.codAvailable) {
    throw new AppError(400, 'COD_NOT_AVAILABLE', 'COD is not available for this cart.');
  }

  const lineTotals = quote.items.map((item) => item.lineTotalInPaise);
  const couponDiscounts = distributeDiscount(quote.couponDiscountInPaise, lineTotals);
  const order = await orderService.create({
    source: 'Customer website',
    customer: {
      name: input.customer.fullName,
      mobile: input.customer.mobile,
      email: clean(input.customer.email),
      billingAddress: addressText(input.billingAddress ?? input.customer),
      shippingAddress: addressText(input.customer),
      state: input.customer.state,
      stateCode: clean(input.customer.stateCode),
    },
    items: quote.items.map((item, index) => ({
      productName: item.name,
      sku: item.productCode,
      quantity: item.quantity,
      unitPriceInPaise: item.unitPriceInPaise,
      discountInPaise: couponDiscounts[index] ?? 0,
      gstRate: 0,
    })),
    shippingChargeInPaise: quote.shippingChargeInPaise,
    packagingChargeInPaise: 0,
    otherChargeInPaise: 0,
    advancePaidInPaise: 0,
    notes: [
      `Payment method: ${input.paymentMethod}`,
      quote.couponCode ? `Coupon: ${quote.couponCode}` : undefined,
      clean(input.customerNotes),
    ].filter(Boolean).join(' | '),
  });

  await ProductModel.bulkWrite(
    quote.items.map((item) => ({
      updateOne: {
        filter: { _id: item.productId },
        update: { $inc: { reservedStock: item.quantity } },
      },
    })),
  );

  const shippingAddress = addressSnapshot(input.customer);
  const customerOrder: CustomerOrderDto = {
    id: order.id,
    orderNumber: order.orderNumber,
    customerStatus: 'Order placed',
    paymentStatus: order.paymentStatus,
    placedAt: order.createdAt,
    items: quote.items.map((item) => ({
      productName: item.name,
      productSlug: item.productSlug,
      productCode: item.productCode,
      image: item.image,
      quantity: item.quantity,
      unitPriceInPaise: item.unitPriceInPaise,
      discountInPaise: item.lineDiscountInPaise,
      taxAmountInPaise: 0,
      lineTotalInPaise: item.lineTotalInPaise,
    })),
    shippingAddress,
    billingAddress: input.billingAddress ? addressSnapshot(input.billingAddress) : shippingAddress,
    subtotalInPaise: order.subtotalInPaise,
    discountInPaise: order.itemDiscountInPaise,
    taxAmountInPaise: order.taxAmountInPaise,
    shippingChargeInPaise: order.shippingChargeInPaise,
    totalInPaise: order.totalInPaise,
    paidAmountInPaise: order.advancePaidInPaise,
    dueAmountInPaise: order.dueAmountInPaise,
    invoiceAvailable: false,
    cancellationAllowed: true,
    returnAllowed: false,
  };

  return {
    order: customerOrder,
    quote,
    payment: {
      method: input.paymentMethod,
      status: order.paymentStatus,
      message: paymentMessage(input.paymentMethod),
    },
    tracking: {
      orderNumber: order.orderNumber,
      identifier: input.customer.email || input.customer.mobile,
      trackUrl: `/track-order?orderNumber=${encodeURIComponent(order.orderNumber)}`,
    },
  };
}
