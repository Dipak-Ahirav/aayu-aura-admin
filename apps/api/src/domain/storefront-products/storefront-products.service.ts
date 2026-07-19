import type {
  CustomerAvailabilityStatus,
  PublicProductCardDto,
  PublicProductFilterGroupDto,
  PublicProductListResponseDto,
} from '@aayu-aura/shared-types';
import { ProductModel, type ProductDocument } from '../products/product.model.js';

type ProductWithId = ProductDocument & { _id: { toString(): string } };

type ShopQuery = {
  q?: string;
  page?: string;
  pageSize?: string;
  sort?: string;
  category?: string | string[];
  sareeType?: string | string[];
  fabric?: string | string[];
  colour?: string | string[];
  occasion?: string | string[];
  pattern?: string | string[];
  availability?: string | string[];
  discount?: string | string[];
  minPrice?: string;
  maxPrice?: string;
};

const demoAttributes = [
  {
    category: 'Silk Sarees',
    sareeType: 'Kanjivaram',
    fabric: 'Pure silk',
    primaryColour: 'Wine',
    pattern: 'Temple border',
    occasion: 'Wedding',
    imageTone: 'wine' as const,
    colours: ['#7a1f32', '#b98b2d', '#4c254f'],
  },
  {
    category: 'Designer Sarees',
    sareeType: 'Chanderi',
    fabric: 'Chanderi silk',
    primaryColour: 'Ivory',
    pattern: 'Floral woven',
    occasion: 'Festive',
    imageTone: 'ivory' as const,
    colours: ['#fffaf1', '#d9b45d', '#7a1f32'],
  },
  {
    category: 'Party Wear',
    sareeType: 'Georgette',
    fabric: 'Soft georgette',
    primaryColour: 'Plum',
    pattern: 'Zari embroidery',
    occasion: 'Reception',
    imageTone: 'plum' as const,
    colours: ['#4c254f', '#8d2c46', '#b98b2d'],
  },
  {
    category: 'Banarasi Sarees',
    sareeType: 'Banarasi',
    fabric: 'Silk blend',
    primaryColour: 'Emerald',
    pattern: 'Butta weave',
    occasion: 'Wedding',
    imageTone: 'emerald' as const,
    colours: ['#0d6b57', '#b98b2d', '#fffaf1'],
  },
  {
    category: 'Cotton Sarees',
    sareeType: 'Linen cotton',
    fabric: 'Cotton silk',
    primaryColour: 'Rose',
    pattern: 'Minimal border',
    occasion: 'Daily wear',
    imageTone: 'ivory' as const,
    colours: ['#fff4ec', '#b65a66', '#835f42'],
  },
  {
    category: 'Occasion Wear',
    sareeType: 'Organza',
    fabric: 'Organza silk',
    primaryColour: 'Gold',
    pattern: 'Cutwork border',
    occasion: 'Engagement',
    imageTone: 'wine' as const,
    colours: ['#d9b45d', '#7a1f32', '#fffaf1'],
  },
];

const fallbackProducts = [
  ['demo-wine-kanjivaram', 'Wine Kanjivaram Silk Saree', 'AA-DEMO-001', 1299900],
  ['demo-ivory-chanderi', 'Ivory Chanderi Party Saree', 'AA-DEMO-002', 749900],
  ['demo-plum-georgette', 'Plum Georgette Embroidered Saree', 'AA-DEMO-003', 589900],
  ['demo-emerald-banarasi', 'Emerald Banarasi Wedding Saree', 'AA-DEMO-004', 1099900],
  ['demo-rose-cotton', 'Rose Cotton Silk Everyday Saree', 'AA-DEMO-005', 429900],
  ['demo-gold-organza', 'Gold Organza Engagement Saree', 'AA-DEMO-006', 899900],
];

function slugify(value: string): string {
  return (value.trim() || 'saree')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function toList(value: string | string[] | undefined): string[] {
  if (!value) return [];
  const values = Array.isArray(value) ? value : [value];
  return values.flatMap((item) => item.split(',')).map((item) => item.trim()).filter(Boolean);
}

function availability(
  product: Pick<ProductDocument, 'status' | 'currentPhysicalStock' | 'reservedStock'>,
): CustomerAvailabilityStatus {
  if (product.status !== 'active') return 'coming_soon';
  const available = Math.max((product.currentPhysicalStock ?? 0) - (product.reservedStock ?? 0), 0);
  if (available <= 0) return 'out_of_stock';
  if (available <= 3) return 'only_few_left';
  return 'in_stock';
}

function enrich(
  base: {
    id: string;
    name: string;
    sku: string;
    category?: string;
    sellingPriceInPaise: number;
    currentPhysicalStock: number;
    reservedStock: number;
    status: ProductDocument['status'];
    coverImageUrl?: string;
  },
  index: number,
): PublicProductCardDto {
  const attrs = demoAttributes[index % demoAttributes.length] ?? demoAttributes[0];
  const sellingPriceInPaise = Number.isFinite(base.sellingPriceInPaise) ? base.sellingPriceInPaise : 0;
  const mrpInPaise = Math.max(
    Math.round(sellingPriceInPaise * (1.16 + (index % 3) * 0.04)),
    sellingPriceInPaise,
  );
  const discountPercentage =
    mrpInPaise > sellingPriceInPaise
      ? Math.round(((mrpInPaise - sellingPriceInPaise) / mrpInPaise) * 100)
      : 0;

  return {
    id: base.id,
    slug: slugify(base.name || base.sku),
    name: base.name,
    productCode: base.sku,
    category: base.category || attrs.category,
    sareeType: base.category || attrs.sareeType,
    fabric: attrs.fabric,
    primaryColour: attrs.primaryColour,
    colours: attrs.colours,
    pattern: attrs.pattern,
    occasion: attrs.occasion,
    imageTone: attrs.imageTone,
    coverImage: base.coverImageUrl ? { url: base.coverImageUrl, altText: base.name } : undefined,
    sellingPriceInPaise,
    mrpInPaise,
    discountPercentage,
    availability: availability(base),
    isNewArrival: index < 8,
    isBestSeller: index % 3 === 0,
    variantCount: 1 + (index % 4),
    averageRating: Number((4.4 + (index % 6) / 10).toFixed(1)),
    reviewCount: 18 + index * 11,
  };
}

function fallbackCard(index: number): PublicProductCardDto {
  const [id, name, sku, price] = fallbackProducts[index] ?? fallbackProducts[0];
  return enrich(
    {
      id: String(id),
      name: String(name),
      sku: String(sku),
      sellingPriceInPaise: Number(price),
      currentPhysicalStock: index % 4 === 0 ? 2 : 8,
      reservedStock: 0,
      status: 'active',
    },
    index,
  );
}

function cardToDetail(
  product: PublicProductCardDto,
  relatedProducts: PublicProductCardDto[],
): import('@aayu-aura/shared-types').PublicProductDetailDto {
  const image = product.coverImage ?? {
    url: `/images/home/${product.imageTone ?? 'wine'}-saree-model.png`,
    altText: product.name,
  };

  return {
    ...product,
    category: product.category,
    collection: product.occasion ? `${product.occasion} edit` : 'Aayu & Aura collection',
    colours: product.colours ?? ['#7a1f32', '#b98b2d', '#fffaf1'],
    pattern: product.pattern,
    work: product.pattern?.toLowerCase().includes('zari') ? 'Zari work' : 'Premium woven finish',
    occasion: product.occasion,
    description:
      `${product.name} is curated for a premium boutique saree experience with clear price, stock, blouse, care, and delivery information from the customer storefront API.`,
    careInstructions:
      'Dry clean recommended. Store folded in a breathable saree cover away from direct sunlight.',
    countryOfOrigin: 'India',
    sareeLength: '5.5 m',
    sareeWidth: '1.12 m approx.',
    blouseIncluded: true,
    blouseDetails: '0.8 m blouse piece included. Final blouse styling and tailoring can be confirmed before dispatch.',
    taxInformation: 'Inclusive of applicable GST where configured.',
    images: [
      image,
      { ...image, altText: `${product.name} border detail`, sortOrder: 2 },
      { ...image, altText: `${product.name} fabric close-up`, sortOrder: 3 },
    ],
    variants: [
      {
        id: `${product.id}-default`,
        name: product.primaryColour ?? 'Default colour',
        sku: product.productCode,
        colour: product.primaryColour,
        sellingPriceInPaise: product.sellingPriceInPaise,
        mrpInPaise: product.mrpInPaise,
        offerPriceInPaise: product.offerPriceInPaise,
        availability: product.availability,
        images: [image],
      },
    ],
    relatedProductIds: relatedProducts.map((item) => item.id),
    relatedProducts,
    deliveryEstimate: 'Estimated delivery in 3-7 business days after order confirmation.',
    codAvailable: product.availability !== 'out_of_stock' && product.availability !== 'coming_soon',
    returnWindow: '7 day return or exchange support as per return policy.',
    sizeChart: [
      { label: 'Saree length', value: '5.5 m' },
      { label: 'Blouse piece', value: '0.8 m included' },
      { label: 'Saree width', value: '1.12 m approx.' },
      { label: 'Fit', value: 'Free size drape' },
    ],
  };
}

function matchesAny(value: string | undefined, selected: string[]): boolean {
  if (!selected.length) return true;
  return selected.some((item) => item.toLowerCase() === (value ?? '').toLowerCase());
}

function matchesDiscount(discount: number | undefined, selected: string[]): boolean {
  if (!selected.length) return true;
  return selected.some((value) => Number(discount ?? 0) >= Number(value));
}

function filterItems(items: PublicProductCardDto[], query: ShopQuery): PublicProductCardDto[] {
  const term = query.q?.trim().toLowerCase();
  const minPrice = Number(query.minPrice || 0) * 100;
  const maxPrice = Number(query.maxPrice || 0) * 100;

  return items.filter((item) => {
    const text = [
      item.name,
      item.productCode,
      item.category,
      item.sareeType,
      item.fabric,
      item.primaryColour,
      item.pattern,
      item.occasion,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return (
      (!term || text.includes(term)) &&
      matchesAny(item.category, toList(query.category)) &&
      matchesAny(item.sareeType, toList(query.sareeType)) &&
      matchesAny(item.fabric, toList(query.fabric)) &&
      matchesAny(item.primaryColour, toList(query.colour)) &&
      matchesAny(item.occasion, toList(query.occasion)) &&
      matchesAny(item.pattern, toList(query.pattern)) &&
      matchesAny(item.availability, toList(query.availability)) &&
      matchesDiscount(item.discountPercentage, toList(query.discount)) &&
      (!minPrice || item.sellingPriceInPaise >= minPrice) &&
      (!maxPrice || item.sellingPriceInPaise <= maxPrice)
    );
  });
}

function sortItems(items: PublicProductCardDto[], sort = 'featured'): PublicProductCardDto[] {
  const sorted = [...items];
  switch (sort) {
    case 'newest':
      return sorted.sort((a, b) => Number(Boolean(b.isNewArrival)) - Number(Boolean(a.isNewArrival)));
    case 'price_asc':
      return sorted.sort((a, b) => a.sellingPriceInPaise - b.sellingPriceInPaise);
    case 'price_desc':
      return sorted.sort((a, b) => b.sellingPriceInPaise - a.sellingPriceInPaise);
    case 'highest_discount':
      return sorted.sort((a, b) => (b.discountPercentage ?? 0) - (a.discountPercentage ?? 0));
    case 'highest_rated':
      return sorted.sort((a, b) => (b.averageRating ?? 0) - (a.averageRating ?? 0));
    default:
      return sorted.sort((a, b) => Number(Boolean(b.isBestSeller)) - Number(Boolean(a.isBestSeller)));
  }
}

function filterGroup(
  key: string,
  label: string,
  items: PublicProductCardDto[],
  getValue: (item: PublicProductCardDto) => string | undefined,
): PublicProductFilterGroupDto {
  const counts = new Map<string, number>();
  for (const item of items) {
    const value = getValue(item);
    if (!value) continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return {
    key,
    label,
    values: [...counts.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([value, count]) => ({ value, label: value, count })),
  };
}

function buildFilters(items: PublicProductCardDto[]): PublicProductFilterGroupDto[] {
  return [
    filterGroup('category', 'Category', items, (item) => item.category),
    filterGroup('sareeType', 'Saree type', items, (item) => item.sareeType),
    filterGroup('fabric', 'Fabric', items, (item) => item.fabric),
    filterGroup('colour', 'Colour', items, (item) => item.primaryColour),
    filterGroup('occasion', 'Occasion', items, (item) => item.occasion),
    filterGroup('pattern', 'Pattern', items, (item) => item.pattern),
    {
      key: 'discount',
      label: 'Discount',
      values: [
        {
          value: '10',
          label: '10% and above',
          count: items.filter((item) => (item.discountPercentage ?? 0) >= 10).length,
        },
        {
          value: '20',
          label: '20% and above',
          count: items.filter((item) => (item.discountPercentage ?? 0) >= 20).length,
        },
        {
          value: '30',
          label: '30% and above',
          count: items.filter((item) => (item.discountPercentage ?? 0) >= 30).length,
        },
      ].filter((item) => item.count > 0),
    },
    {
      key: 'availability',
      label: 'Availability',
      values: [
        {
          value: 'in_stock',
          label: 'In stock',
          count: items.filter((item) => item.availability === 'in_stock').length,
        },
        {
          value: 'only_few_left',
          label: 'Only a few left',
          count: items.filter((item) => item.availability === 'only_few_left').length,
        },
        {
          value: 'out_of_stock',
          label: 'Out of stock',
          count: items.filter((item) => item.availability === 'out_of_stock').length,
        },
      ].filter((item) => item.count > 0),
    },
  ].filter((group) => group.values.length > 0);
}

async function loadProducts(): Promise<PublicProductCardDto[]> {
  const products = await ProductModel.find({ status: { $ne: 'archived' } })
    .sort({ createdAt: -1 })
    .limit(240)
    .lean()
    .catch(() => []);

  if (!products.length) {
    return fallbackProducts.map((_, index) => fallbackCard(index));
  }

  return products.map((product, index) =>
    enrich(
      {
        id: (product as ProductWithId)._id.toString(),
        name: product.name,
        sku: product.sku,
        category: product.category,
        sellingPriceInPaise: product.sellingPriceInPaise,
        currentPhysicalStock: product.currentPhysicalStock,
        reservedStock: product.reservedStock,
        status: product.status,
        coverImageUrl: product.coverImageUrl,
      },
      index,
    ),
  );
}

export async function getStorefrontProductDetail(
  slug: string,
): Promise<import('@aayu-aura/shared-types').PublicProductDetailDto | null> {
  const allItems = await loadProducts();
  const product = allItems.find((item) => item.slug === slug || item.id === slug);
  if (!product) return null;

  const relatedProducts = allItems
    .filter((item) => item.slug !== product.slug)
    .filter(
      (item) =>
        item.category === product.category ||
        item.occasion === product.occasion ||
        item.fabric === product.fabric,
    )
    .slice(0, 4);
  const fallbackRelated = allItems.filter((item) => item.slug !== product.slug).slice(0, 4);

  return cardToDetail(product, relatedProducts.length > 0 ? relatedProducts : fallbackRelated);
}

export async function listStorefrontProducts(
  query: ShopQuery,
): Promise<PublicProductListResponseDto> {
  const page = Math.max(Number(query.page) || 1, 1);
  const pageSize = Math.min(Math.max(Number(query.pageSize) || 12, 1), 48);
  const allItems = await loadProducts();
  const filters = buildFilters(allItems);
  const filteredItems = sortItems(filterItems(allItems, query), query.sort);
  const start = (page - 1) * pageSize;

  return {
    items: filteredItems.slice(start, start + pageSize),
    total: filteredItems.length,
    page,
    pageSize,
    filters,
  };
}
