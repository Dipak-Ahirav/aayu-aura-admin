import { Types } from 'mongoose';
import type {
  CustomerAvailabilityStatus,
  PublicCartQuoteDto,
  PublicCartQuoteLineInputDto,
  PublicStorefrontImageTone,
} from '@aayu-aura/shared-types';
import { ProductModel, type ProductDocument } from '../products/product.model.js';
import type { PublicCartQuoteInput } from './storefront-cart.schemas.js';

type ProductWithId = ProductDocument & { _id: Types.ObjectId };

const tones: PublicStorefrontImageTone[] = ['wine', 'ivory', 'plum', 'emerald'];

function slugify(value: string): string {
  return (value.trim() || 'saree')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function availability(product: ProductDocument): CustomerAvailabilityStatus {
  if (product.status !== 'active') return 'coming_soon';
  const available = Math.max((product.currentPhysicalStock ?? 0) - (product.reservedStock ?? 0), 0);
  if (available <= 0) return 'out_of_stock';
  if (available <= 3) return 'only_few_left';
  return 'in_stock';
}

function stockMessage(status: CustomerAvailabilityStatus, stock: number): string {
  if (status === 'out_of_stock') return 'Out of stock';
  if (status === 'coming_soon') return 'Coming soon';
  if (status === 'only_few_left') return `Only ${stock} left`;
  return 'In stock';
}

function toneFor(index: number): PublicStorefrontImageTone {
  return tones[index % tones.length] ?? 'wine';
}

function matchesLine(product: ProductWithId, line: PublicCartQuoteLineInputDto): boolean {
  if (line.productId && Types.ObjectId.isValid(line.productId)) {
    return product._id.equals(line.productId);
  }

  if (line.productCode) {
    return product.sku.toLowerCase() === line.productCode.toLowerCase();
  }

  if (line.productSlug) {
    return slugify(product.name) === line.productSlug;
  }

  return false;
}

function couponDiscount(subtotal: number, code?: string): { discount: number; message?: string } {
  const normalised = (code ?? '').trim().toUpperCase();
  if (!normalised) return { discount: 0 };
  if (normalised === 'AAURA10') {
    return {
      discount: Math.min(Math.round(subtotal * 0.1), 100000),
      message: 'AAURA10 applied: 10% off up to Rs. 1,000.',
    };
  }
  if (normalised === 'FREESHIP') {
    return { discount: 0, message: 'FREESHIP applied: shipping removed at checkout quote.' };
  }
  return { discount: 0, message: 'Coupon code is not valid for this cart.' };
}

export async function quotePublicCart(input: PublicCartQuoteInput): Promise<PublicCartQuoteDto> {
  const products = (await ProductModel.find({
    status: { $ne: 'archived' },
  }).sort({ createdAt: -1 }).limit(500)) as ProductWithId[];

  const items = [];
  const unavailableItems: PublicCartQuoteLineInputDto[] = [];

  for (const line of input.items) {
    const product = products.find((row) => matchesLine(row, line));
    if (!product) {
      unavailableItems.push(line);
      continue;
    }

    const status = availability(product);
    const availableStock = Math.max(product.currentPhysicalStock - product.reservedStock, 0);
    const requestedQuantity = line.quantity;
    const quantity = status === 'in_stock' || status === 'only_few_left'
      ? Math.min(requestedQuantity, Math.max(availableStock, 0))
      : 0;

    if (quantity <= 0) {
      unavailableItems.push(line);
      continue;
    }

    const unitPriceInPaise = product.sellingPriceInPaise;
    const mrpInPaise = Math.max(Math.round(unitPriceInPaise * 1.18), unitPriceInPaise);
    const lineMrp = mrpInPaise * quantity;
    const lineTotalInPaise = unitPriceInPaise * quantity;
    const lineDiscountInPaise = Math.max(lineMrp - lineTotalInPaise, 0);
    const imageTone = toneFor(items.length);

    items.push({
      productId: product._id.toString(),
      productSlug: slugify(product.name),
      productCode: product.sku,
      name: product.name,
      category: product.category,
      image: product.coverImageUrl ? { url: product.coverImageUrl, altText: product.name } : undefined,
      imageTone,
      quantity,
      requestedQuantity,
      unitPriceInPaise,
      mrpInPaise,
      discountPercentage:
        mrpInPaise > unitPriceInPaise
          ? Math.round(((mrpInPaise - unitPriceInPaise) / mrpInPaise) * 100)
          : 0,
      lineSubtotalInPaise: lineMrp,
      lineDiscountInPaise,
      lineTotalInPaise,
      availability: status,
      availableStock,
      stockMessage: stockMessage(status, availableStock),
      isQuantityAdjusted: quantity !== requestedQuantity,
    });
  }

  const subtotalInPaise = items.reduce((total, item) => total + item.lineSubtotalInPaise, 0);
  const productDiscountInPaise = items.reduce((total, item) => total + item.lineDiscountInPaise, 0);
  const afterProductDiscount = items.reduce((total, item) => total + item.lineTotalInPaise, 0);
  const coupon = couponDiscount(afterProductDiscount, input.couponCode);
  const shippingChargeInPaise =
    items.length === 0 ||
    (input.couponCode ?? '').trim().toUpperCase() === 'FREESHIP' ||
    afterProductDiscount >= 299900
      ? 0
      : 9900;
  const totalInPaise = Math.max(afterProductDiscount - coupon.discount + shippingChargeInPaise, 0);
  const taxIncludedInPaise = Math.round(totalInPaise * (5 / 105));
  const itemCount = items.reduce((total, item) => total + item.quantity, 0);
  const messages = [
    ...(coupon.message ? [coupon.message] : []),
    ...(unavailableItems.length ? ['Some items were removed because they are unavailable.'] : []),
    ...(items.some((item) => item.isQuantityAdjusted)
      ? ['Some quantities were adjusted to current stock.']
      : []),
  ];

  return {
    items,
    unavailableItems,
    subtotalInPaise,
    productDiscountInPaise,
    couponCode: (input.couponCode ?? '').trim().toUpperCase() || undefined,
    couponDiscountInPaise: coupon.discount,
    shippingChargeInPaise,
    taxIncludedInPaise,
    totalInPaise,
    payableInPaise: totalInPaise,
    itemCount,
    deliveryEstimate: input.pinCode
      ? `Estimated delivery to ${input.pinCode} in 3-7 business days.`
      : 'Enter PIN code at checkout for delivery estimate.',
    codAvailable: totalInPaise <= 1500000 && items.length > 0,
    messages,
  };
}
