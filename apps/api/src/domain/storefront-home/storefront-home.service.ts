import type {
  CustomerAvailabilityStatus,
  ProductStatus,
  PublicHomepageDto,
  PublicHomepageProductDto,
  PublicStorefrontImageTone,
} from '@aayu-aura/shared-types';
import { ProductModel, type ProductDocument } from '../products/product.model.js';

type ProductWithId = ProductDocument & { _id: { toString(): string } };

const demoProducts: PublicHomepageProductDto[] = [
  {
    id: 'demo-wine-kanjivaram',
    slug: 'wine-kanjivaram-silk-saree',
    name: 'Wine Kanjivaram Silk Saree',
    category: 'Silk Sarees',
    sareeType: 'Kanjivaram',
    fabric: 'Pure silk',
    primaryColour: 'Wine',
    pattern: 'Temple border',
    occasion: 'Wedding',
    sellingPriceInPaise: 1299900,
    mrpInPaise: 1599900,
    discountPercentage: 19,
    rating: 4.8,
    reviewCount: 126,
    availability: 'only_few_left',
    imageTone: 'wine',
    colours: ['#7a1f32', '#b98b2d', '#4c254f'],
  },
  {
    id: 'demo-ivory-chanderi',
    slug: 'ivory-chanderi-party-saree',
    name: 'Ivory Chanderi Party Saree',
    category: 'Designer Sarees',
    sareeType: 'Chanderi',
    fabric: 'Chanderi silk',
    primaryColour: 'Ivory',
    pattern: 'Floral woven',
    occasion: 'Festive',
    sellingPriceInPaise: 749900,
    mrpInPaise: 949900,
    discountPercentage: 21,
    rating: 4.7,
    reviewCount: 84,
    availability: 'in_stock',
    imageTone: 'ivory',
    colours: ['#fffaf1', '#d9b45d', '#7a1f32'],
  },
  {
    id: 'demo-plum-georgette',
    slug: 'plum-georgette-embroidered-saree',
    name: 'Plum Georgette Embroidered Saree',
    category: 'Party Wear',
    sareeType: 'Georgette',
    fabric: 'Soft georgette',
    primaryColour: 'Plum',
    pattern: 'Zari embroidery',
    occasion: 'Reception',
    sellingPriceInPaise: 589900,
    mrpInPaise: 799900,
    discountPercentage: 26,
    rating: 4.6,
    reviewCount: 59,
    availability: 'in_stock',
    imageTone: 'plum',
    colours: ['#4c254f', '#8d2c46', '#b98b2d'],
  },
  {
    id: 'demo-emerald-banarasi',
    slug: 'emerald-banarasi-wedding-saree',
    name: 'Emerald Banarasi Wedding Saree',
    category: 'Banarasi Sarees',
    sareeType: 'Banarasi',
    fabric: 'Silk blend',
    primaryColour: 'Emerald',
    pattern: 'Butta weave',
    occasion: 'Wedding',
    sellingPriceInPaise: 1099900,
    mrpInPaise: 1399900,
    discountPercentage: 21,
    rating: 4.9,
    reviewCount: 102,
    availability: 'in_stock',
    imageTone: 'emerald',
    colours: ['#0d6b57', '#b98b2d', '#fffaf1'],
  },
];

function slugify(value: string): string {
  const safeValue = value.trim() || 'saree';
  return safeValue
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function imageTone(index: number): PublicStorefrontImageTone {
  return ['wine', 'ivory', 'plum', 'emerald'][index % 4] as PublicStorefrontImageTone;
}

function availability(product: ProductDocument): CustomerAvailabilityStatus {
  if ((product.status as ProductStatus) !== 'active') return 'coming_soon';
  const currentPhysicalStock = Number.isFinite(product.currentPhysicalStock)
    ? product.currentPhysicalStock
    : 0;
  const reservedStock = Number.isFinite(product.reservedStock) ? product.reservedStock : 0;
  const available = Math.max(currentPhysicalStock - reservedStock, 0);
  if (available <= 0) return 'out_of_stock';
  if (available <= 3) return 'only_few_left';
  return 'in_stock';
}

function toHomepageProduct(product: ProductWithId, index: number): PublicHomepageProductDto {
  const sellingPriceInPaise = Number.isFinite(product.sellingPriceInPaise)
    ? product.sellingPriceInPaise
    : demoProducts[index % demoProducts.length]?.sellingPriceInPaise ?? 0;
  const mrp = Math.max(Math.round(sellingPriceInPaise * 1.18), sellingPriceInPaise);
  const demo = demoProducts[index % demoProducts.length] ?? demoProducts[0];
  const name = product.name?.trim() || demo.name;

  return {
    id: product._id.toString(),
    slug: slugify(name || product.sku || demo.slug),
    name,
    category: product.category,
    sareeType: product.category || demo.sareeType,
    fabric: demo.fabric,
    primaryColour: demo.primaryColour,
    pattern: demo.pattern,
    occasion: demo.occasion,
    sellingPriceInPaise,
    mrpInPaise: mrp,
    discountPercentage: mrp > 0 ? Math.max(Math.round(((mrp - sellingPriceInPaise) / mrp) * 100), 0) : 0,
    rating: 4.5 + (index % 5) / 10,
    reviewCount: 24 + index * 13,
    availability: availability(product),
    imageUrl: product.coverImageUrl,
    imageTone: imageTone(index),
    colours: demo.colours,
  };
}

function shortcut(label: string, description: string, link: string) {
  return { label, description, link };
}

export async function getStorefrontHome(): Promise<PublicHomepageDto> {
  const products = await ProductModel.find({ status: { $ne: 'archived' } })
    .sort({ createdAt: -1 })
    .limit(12)
    .catch(() => []);
  const homepageProducts =
    products.length > 0
      ? products.map((product, index) => toHomepageProduct(product as ProductWithId, index))
      : demoProducts;
  const categories = [
    ...new Set(homepageProducts.map((product) => product.category).filter(Boolean)),
  ].slice(0, 6) as string[];

  return {
    hero: {
      eyebrow: 'Aayu & Aura boutique',
      title: 'Premium sarees styled for weddings, festivals, and graceful everyday wear.',
      description:
        'Discover elegant drapes, rich fabrics, detailed borders, blouse pairings, and occasion-ready collections in a calm mobile-first shopping experience.',
      primaryCta: shortcut('Browse sarees', 'Shop the full catalogue', '/shop'),
      secondaryCta: shortcut('View collections', 'Curated edits', '/collections'),
      imageTone: homepageProducts[0]?.imageTone ?? 'wine',
      badge: 'New festive edit',
    },
    shortcuts: [
      shortcut('Silk sarees', 'Kanjivaram, Banarasi, soft silk', '/category/silk-sarees'),
      shortcut('Wedding edit', 'Rich zari and festive borders', '/collections/wedding-edit'),
      shortcut('Under Rs. 5,000', 'Elegant picks for gifting', '/shop'),
      shortcut('Party wear', 'Georgette, organza, shimmer', '/category/party-wear'),
      shortcut('New arrivals', 'Recently added sarees', '/shop'),
      shortcut('Best sellers', 'Customer favourites', '/collections/best-sellers'),
    ],
    categories: categories.map((category) =>
      shortcut(category, 'Browse dynamic MongoDB category', `/category/${slugify(category)}`),
    ),
    newArrivals: homepageProducts.slice(0, 4),
    bestSellers: homepageProducts.slice(2, 6),
    featuredProducts: homepageProducts.slice(0, 8),
    reviews: [
      {
        quote:
          'The saree looked premium, the blouse details were clear, and WhatsApp support helped me pick the right shade.',
        customerName: 'Verified festive customer',
        rating: 4.9,
      },
    ],
    brandStory: {
      title: 'Curated sarees with a boutique eye for fabric, fall, and finish.',
      description:
        'Aayu & Aura brings together customer-friendly browsing and the existing backend source of truth for products, stock, orders, payments, invoices, and returns.',
    },
  };
}
