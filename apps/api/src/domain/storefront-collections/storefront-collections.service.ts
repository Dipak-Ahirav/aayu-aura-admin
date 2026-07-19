import type {
  PublicCollectionDto,
  PublicCollectionListResponseDto,
  PublicProductCardDto,
  PublicProductFilterGroupDto,
} from '@aayu-aura/shared-types';
import { listStorefrontProducts } from '../storefront-products/storefront-products.service.js';

type CollectionQuery = {
  collectionSlug?: string;
  page?: string;
  pageSize?: string;
  sort?: string;
  fabric?: string | string[];
  colour?: string | string[];
  occasion?: string | string[];
  availability?: string | string[];
  minPrice?: string;
  maxPrice?: string;
};

type CollectionDefinition = {
  slug: string;
  title: string;
  description: string;
  imageTone: PublicCollectionDto['imageTone'];
  badge: string;
  match: (product: PublicProductCardDto) => boolean;
  filters: string[];
};

const collectionDefinitions: CollectionDefinition[] = [
  {
    slug: 'wedding-edit',
    title: 'Wedding Edit',
    description: 'Rich silk, zari borders, heirloom tones, and festive drapes for ceremony days.',
    imageTone: 'wine',
    badge: 'Ceremony ready',
    filters: ['Wedding', 'Silk', 'Zari'],
    match: (product) =>
      includes(product.occasion, 'wedding') ||
      includes(product.category, 'banarasi') ||
      includes(product.sareeType, 'kanjivaram'),
  },
  {
    slug: 'festive-favourites',
    title: 'Festive Favourites',
    description: 'Light-catching sarees for puja, gifting, family functions, and seasonal moments.',
    imageTone: 'ivory',
    badge: 'Festive picks',
    filters: ['Festive', 'Chanderi', 'Gold'],
    match: (product) =>
      includes(product.occasion, 'festive') ||
      includes(product.fabric, 'chanderi') ||
      includes(product.primaryColour, 'gold'),
  },
  {
    slug: 'silk-classics',
    title: 'Silk Classics',
    description: 'Pure silk, Banarasi, Kanjivaram, and soft silk sarees curated by fabric and fall.',
    imageTone: 'emerald',
    badge: 'Premium silk',
    filters: ['Pure silk', 'Banarasi', 'Kanjivaram'],
    match: (product) =>
      includes(product.fabric, 'silk') ||
      includes(product.category, 'silk') ||
      includes(product.sareeType, 'silk'),
  },
  {
    slug: 'party-evening',
    title: 'Party & Evening',
    description: 'Modern georgette, organza, embroidered, and reception-ready sarees.',
    imageTone: 'plum',
    badge: 'Evening wear',
    filters: ['Reception', 'Georgette', 'Organza'],
    match: (product) =>
      includes(product.occasion, 'reception') ||
      includes(product.fabric, 'georgette') ||
      includes(product.fabric, 'organza'),
  },
  {
    slug: 'under-5000',
    title: 'Under Rs. 5,000',
    description: 'Premium-looking sarees for gifting and everyday elegance at accessible prices.',
    imageTone: 'ivory',
    badge: 'Value edit',
    filters: ['Gifting', 'Daily wear', 'Under 5000'],
    match: (product) => product.sellingPriceInPaise <= 500000,
  },
  {
    slug: 'best-sellers',
    title: 'Best Sellers',
    description: 'Customer-loved sarees with strong ratings, clear stock, and versatile styling.',
    imageTone: 'wine',
    badge: 'Customer loved',
    filters: ['Rated', 'In stock', 'Popular'],
    match: (product) => Boolean(product.isBestSeller) || (product.averageRating ?? 0) >= 4.7,
  },
];

function includes(value: string | undefined, term: string): boolean {
  return (value ?? '').toLowerCase().includes(term.toLowerCase());
}

function toList(value: string | string[] | undefined): string[] {
  if (!value) return [];
  const values = Array.isArray(value) ? value : [value];
  return values.flatMap((item) => item.split(',')).map((item) => item.trim()).filter(Boolean);
}

function matchesAny(value: string | undefined, selected: string[]): boolean {
  if (!selected.length) return true;
  return selected.some((item) => item.toLowerCase() === (value ?? '').toLowerCase());
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

function collectionProducts(
  definition: CollectionDefinition,
  products: PublicProductCardDto[],
): PublicProductCardDto[] {
  const matched = products.filter(definition.match);
  return matched.length > 0 ? matched : products.slice(0, 8);
}

function collectionCard(
  definition: CollectionDefinition,
  products: PublicProductCardDto[],
): PublicCollectionDto {
  const items = collectionProducts(definition, products);
  const prices = items.map((item) => item.sellingPriceInPaise).filter((price) => price > 0);
  return {
    slug: definition.slug,
    title: definition.title,
    description: definition.description,
    imageTone: definition.imageTone,
    productCount: items.length,
    startingPriceInPaise: prices.length ? Math.min(...prices) : undefined,
    badge: definition.badge,
    filters: definition.filters.map((value) => ({ value, label: value, count: items.length })),
  };
}

function applyFilters(items: PublicProductCardDto[], query: CollectionQuery): PublicProductCardDto[] {
  const minPrice = Number(query.minPrice || 0) * 100;
  const maxPrice = Number(query.maxPrice || 0) * 100;
  return items.filter(
    (item) =>
      matchesAny(item.fabric, toList(query.fabric)) &&
      matchesAny(item.primaryColour, toList(query.colour)) &&
      matchesAny(item.occasion, toList(query.occasion)) &&
      matchesAny(item.availability, toList(query.availability)) &&
      (!minPrice || item.sellingPriceInPaise >= minPrice) &&
      (!maxPrice || item.sellingPriceInPaise <= maxPrice),
  );
}

function sortItems(items: PublicProductCardDto[], sort = 'featured'): PublicProductCardDto[] {
  const sorted = [...items];
  switch (sort) {
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

function buildFilters(items: PublicProductCardDto[]): PublicProductFilterGroupDto[] {
  return [
    filterGroup('fabric', 'Fabric', items, (item) => item.fabric),
    filterGroup('colour', 'Colour', items, (item) => item.primaryColour),
    filterGroup('occasion', 'Occasion', items, (item) => item.occasion),
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
      ].filter((item) => item.count > 0),
    },
  ].filter((group) => group.values.length > 0);
}

export async function getStorefrontCollections(
  query: CollectionQuery,
): Promise<PublicCollectionListResponseDto> {
  const page = Math.max(Number(query.page) || 1, 1);
  const pageSize = Math.min(Math.max(Number(query.pageSize) || 12, 1), 36);
  const productResponse = await listStorefrontProducts({ page: '1', pageSize: '48', sort: 'featured' });
  const allProducts = productResponse.items;
  const collections = collectionDefinitions.map((definition) => collectionCard(definition, allProducts));
  const selectedDefinition =
    collectionDefinitions.find((definition) => definition.slug === query.collectionSlug) ??
    collectionDefinitions[0];
  const selectedCollection = collectionCard(selectedDefinition, allProducts);
  const collectionItems = collectionProducts(selectedDefinition, allProducts);
  const filteredItems = sortItems(applyFilters(collectionItems, query), query.sort);
  const start = (page - 1) * pageSize;

  return {
    hero: {
      eyebrow: 'Curated collections',
      title: 'Shop sarees by mood, moment, and fabric.',
      description:
        'Explore dynamic edits built from live catalogue products with boutique filters for occasion, fabric, colour, price, and availability.',
      imageTone: selectedCollection.imageTone,
    },
    collections,
    selectedCollection,
    products: filteredItems.slice(start, start + pageSize),
    total: filteredItems.length,
    page,
    pageSize,
    filters: buildFilters(collectionItems),
  };
}
