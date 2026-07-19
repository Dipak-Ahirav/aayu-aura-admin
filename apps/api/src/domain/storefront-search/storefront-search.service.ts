import type {
  PublicProductCardDto,
  PublicSearchResponseDto,
  PublicSearchSuggestionDto,
} from '@aayu-aura/shared-types';
import { listStorefrontProducts } from '../storefront-products/storefront-products.service.js';

type SearchQuery = {
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
  discount?: string | string[];
  availability?: string | string[];
  minPrice?: string;
  maxPrice?: string;
};

const popularSearches: PublicSearchSuggestionDto[] = [
  { label: 'Wedding silk', query: 'wedding silk', type: 'popular' },
  { label: 'Ivory festive saree', query: 'ivory festive', type: 'popular' },
  { label: 'Banarasi saree', query: 'banarasi', type: 'popular' },
  { label: 'Under Rs. 5,000', query: 'cotton', type: 'popular' },
  { label: 'Reception georgette', query: 'reception georgette', type: 'popular' },
];

function uniqueSuggestions(
  products: PublicProductCardDto[],
  query: string | undefined,
): PublicSearchSuggestionDto[] {
  const term = query?.trim().toLowerCase() ?? '';
  const suggestions = new Map<string, PublicSearchSuggestionDto>();

  for (const product of products) {
    const candidates: PublicSearchSuggestionDto[] = [
      product.fabric ? { label: product.fabric, query: product.fabric, type: 'fabric' } : undefined,
      product.primaryColour
        ? { label: `${product.primaryColour} sarees`, query: product.primaryColour, type: 'colour' }
        : undefined,
      product.occasion
        ? { label: `${product.occasion} sarees`, query: product.occasion, type: 'occasion' }
        : undefined,
      product.category ? { label: product.category, query: product.category, type: 'category' } : undefined,
    ].filter(Boolean) as PublicSearchSuggestionDto[];

    for (const suggestion of candidates) {
      const haystack = `${suggestion.label} ${suggestion.query}`.toLowerCase();
      if (term && !haystack.includes(term)) continue;
      suggestions.set(`${suggestion.type}:${suggestion.query.toLowerCase()}`, suggestion);
    }
  }

  return [...suggestions.values()].slice(0, 8);
}

export async function getStorefrontSearch(query: SearchQuery): Promise<PublicSearchResponseDto> {
  const result = await listStorefrontProducts(query);
  const catalogue = await listStorefrontProducts({ page: '1', pageSize: '48', sort: 'featured' });

  return {
    query: query.q?.trim() || undefined,
    suggestions: uniqueSuggestions(catalogue.items, query.q),
    popularSearches,
    items: result.items,
    total: result.total,
    page: result.page,
    pageSize: result.pageSize,
    filters: result.filters,
  };
}
