import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { debounceTime } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type {
  CustomerAvailabilityStatus,
  PublicProductCardDto,
  PublicProductFilterGroupDto,
  PublicSearchResponseDto,
  PublicSearchSuggestionDto,
} from '@aayu-aura/shared-types';
import { ProductCardComponent } from '../../shared/ui/product-card.component';
import { StorefrontProduct } from '../../shared/models/storefront-demo.models';
import { SearchQuery, SearchService } from './search.service';

@Component({
  selector: 'aac-search-page',
  standalone: true,
  imports: [ProductCardComponent, ReactiveFormsModule],
  template: `
    <section class="search-shell">
      <div class="search-hero search-hero-dynamic">
        <div>
          <p class="eyebrow">Advanced search</p>
          <h1>Find the right fabric, colour, and occasion faster.</h1>
          <p>Search live MongoDB products by saree name, SKU, fabric, colour, occasion, category, pattern, and availability.</p>
        </div>

        <div class="search-control-card">
          <label class="search-box">
            <span class="sr-only">Search sarees</span>
            <input
              [formControl]="query"
              type="search"
              placeholder="Search silk, maroon, wedding, Banarasi"
              (keydown.enter)="submitSearch()"
            >
            <button type="button" (click)="submitSearch()">Search</button>
          </label>

          <div class="suggestion-row" aria-label="Popular searches">
            @for (term of popularSearches(); track term.query) {
              <button type="button" (click)="applySuggestion(term)">{{ term.label }}</button>
            }
          </div>

          @if (suggestions().length > 0) {
            <div class="search-suggestion-panel" aria-label="Search suggestions">
              @for (suggestion of suggestions(); track suggestion.type + suggestion.query) {
                <button type="button" (click)="applySuggestion(suggestion)">
                  <span>{{ suggestion.type }}</span>
                  {{ suggestion.label }}
                </button>
              }
            </div>
          }
        </div>
      </div>

      @if (categoryFilter()) {
        <section class="search-category-section" aria-label="Search by category">
          <div class="section-heading">
            <div>
              <p class="eyebrow">Search by category</p>
              <h2>Choose a saree category</h2>
            </div>
            @if (isAnyCategorySelected()) {
              <button type="button" (click)="clearCategory()">Clear category</button>
            }
          </div>
          <div class="search-category-grid">
            @for (category of categoryFilter()?.values ?? []; track category.value) {
              <button
                type="button"
                class="search-category-card"
                [class.is-active]="isSelected('category', category.value)"
                (click)="toggleFilter('category', category.value)"
              >
                <span>{{ category.count }}</span>
                <strong>{{ category.label }}</strong>
                <small>Browse matching sarees</small>
              </button>
            }
          </div>
        </section>
      }

      <div class="shop-toolbar" aria-label="Search controls">
        <div class="compact-field">
          <span>Sort</span>
          <details class="custom-select">
            <summary>{{ sortLabel() }}</summary>
            <div class="custom-select-menu" role="listbox" aria-label="Sort search results">
              @for (option of sortOptions; track option.value) {
                <button
                  type="button"
                  role="option"
                  [attr.aria-selected]="sort.value === option.value"
                  [class.is-selected]="sort.value === option.value"
                  (click)="selectSort(option.value, $event)"
                >
                  {{ option.label }}
                </button>
              }
            </div>
          </details>
        </div>
        <div class="price-fields">
          <label>
            <span>Min price</span>
            <input [formControl]="minPrice" inputmode="numeric" type="number" min="0" placeholder="0">
          </label>
          <label>
            <span>Max price</span>
            <input [formControl]="maxPrice" inputmode="numeric" type="number" min="0" placeholder="15000">
          </label>
        </div>
      </div>

      <div class="catalogue-layout">
        <aside class="filter-panel" aria-label="Search filters">
          <div class="filter-panel-title">
            <h2>Filters</h2>
            <button type="button" (click)="clearFilters()">Clear all</button>
          </div>

          @for (filter of filters(); track filter.key) {
            <section class="filter-group" [class.category-filter-group]="filter.key === 'category'">
              <h3>{{ filter.label }}</h3>
              <div class="filter-chip-grid" [class.category-filter-grid]="filter.key === 'category'">
                @for (value of filter.values; track value.value) {
                  <label class="filter-option" [class.is-active]="isSelected(filter.key, value.value)">
                    <input
                      type="checkbox"
                      [checked]="isSelected(filter.key, value.value)"
                      (change)="toggleFilter(filter.key, value.value)"
                    >
                    <span>{{ value.label }}</span>
                    <small>{{ value.count }}</small>
                  </label>
                }
              </div>
            </section>
          }
        </aside>

        <div class="shop-results">
          <div class="applied-row">
            <span>{{ total() }} results</span>
            @if (currentQuery()) {
              <span>For "{{ currentQuery() }}"</span>
            } @else {
              <span>All searchable sarees</span>
            }
            <span>Live stock</span>
            @if (activeFilterCount() > 0) {
              <button type="button" (click)="clearFilters()">Clear {{ activeFilterCount() }} filters</button>
            }
          </div>

          @if (activeChips().length > 0) {
            <div class="applied-filter-row" aria-label="Applied filters">
              @for (chip of activeChips(); track chip.key + chip.value) {
                <button class="applied-filter-chip" type="button" (click)="toggleFilter(chip.key, chip.value)">
                  {{ chip.label }} x
                </button>
              }
            </div>
          }

          @if (loading()) {
            <div class="loading-grid" aria-label="Loading search results">
              @for (item of skeletons; track item) {
                <div class="skeleton-card"></div>
              }
            </div>
          } @else if (error()) {
            <div class="shop-empty">
              <p class="eyebrow">Loading issue</p>
              <h2>Search is unavailable</h2>
              <p>Start the API and MongoDB connection, then refresh the storefront.</p>
              <button type="button" (click)="load()">Try again</button>
            </div>
          } @else if (products().length === 0) {
            <div class="shop-empty">
              <p class="eyebrow">No match</p>
              <h2>No sarees found</h2>
              <p>Try a fabric, colour, occasion, or product code. You can also remove filters.</p>
              <button type="button" (click)="clearFilters()">Clear filters</button>
            </div>
          } @else {
            <div class="product-grid">
              @for (product of products(); track product.slug) {
                <aac-product-card [product]="product" />
              }
            </div>
            <div class="pagination-row" aria-label="Search pagination">
              <button type="button" [disabled]="page() <= 1" (click)="previousPage()">Previous</button>
              <span>Page {{ page() }} of {{ totalPages() }}</span>
              <button type="button" [disabled]="page() >= totalPages()" (click)="nextPage()">Next</button>
            </div>
          }
        </div>
      </div>
    </section>
  `,
})
export class SearchPageComponent {
  private readonly searchService = inject(SearchService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly query = new FormControl('', { nonNullable: true });
  protected readonly sort = new FormControl('featured', { nonNullable: true });
  protected readonly sortOptions = [
    { value: 'featured', label: 'Featured' },
    { value: 'newest', label: 'Newest' },
    { value: 'price_asc', label: 'Price: low to high' },
    { value: 'price_desc', label: 'Price: high to low' },
    { value: 'highest_discount', label: 'Highest discount' },
    { value: 'highest_rated', label: 'Highest rated' },
  ];
  protected readonly minPrice = new FormControl<number | null>(null);
  protected readonly maxPrice = new FormControl<number | null>(null);
  protected readonly page = signal(1);
  protected readonly pageSize = 12;
  protected readonly loading = signal(false);
  protected readonly error = signal(false);
  protected readonly currentQuery = signal('');
  protected readonly products = signal<StorefrontProduct[]>([]);
  protected readonly filters = signal<PublicProductFilterGroupDto[]>([]);
  protected readonly selected = signal<Record<string, string[]>>({});
  protected readonly suggestions = signal<PublicSearchSuggestionDto[]>([]);
  protected readonly popularSearches = signal<PublicSearchSuggestionDto[]>([]);
  protected readonly total = signal(0);
  protected readonly skeletons = Array.from({ length: 8 }, (_, index) => index);
  protected readonly totalPages = computed(() =>
    Math.max(Math.ceil(this.total() / this.pageSize), 1),
  );
  protected readonly categoryFilter = computed(() =>
    this.filters().find((filter) => filter.key === 'category'),
  );
  protected readonly activeFilterCount = computed(() =>
    Object.values(this.selected()).reduce((count, values) => count + values.length, 0),
  );
  protected readonly activeChips = computed(() => {
    const labels = new Map<string, string>();
    for (const group of this.filters()) {
      for (const value of group.values) {
        labels.set(`${group.key}:${value.value}`, value.label);
      }
    }
    return Object.entries(this.selected()).flatMap(([key, values]) =>
      values.map((value) => ({ key, value, label: labels.get(`${key}:${value}`) ?? value })),
    );
  });

  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const incomingQuery = params.get('q') ?? '';
      this.query.setValue(incomingQuery, { emitEvent: false });
      this.currentQuery.set(incomingQuery);
      this.page.set(Number(params.get('page')) || 1);
      this.load();
    });

    this.query.valueChanges
      .pipe(debounceTime(300), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.resetAndLoad());
    this.sort.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.resetAndLoad());
    this.minPrice.valueChanges
      .pipe(debounceTime(350), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.resetAndLoad());
    this.maxPrice.valueChanges
      .pipe(debounceTime(350), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.resetAndLoad());
  }

  protected submitSearch(): void {
    this.currentQuery.set(this.query.value.trim());
    this.router.navigate([], {
      queryParams: { q: this.currentQuery() || null, page: null },
      queryParamsHandling: 'merge',
    });
    this.resetAndLoad();
  }

  protected applySuggestion(suggestion: PublicSearchSuggestionDto): void {
    this.query.setValue(suggestion.query, { emitEvent: false });
    this.currentQuery.set(suggestion.query);
    this.router.navigate([], {
      queryParams: { q: suggestion.query, page: null },
      queryParamsHandling: 'merge',
    });
    this.resetAndLoad();
  }

  protected toggleFilter(key: string, value: string): void {
    const current = this.selected();
    const values = current[key] ?? [];
    const nextValues = values.includes(value)
      ? values.filter((item) => item !== value)
      : [...values, value];
    this.selected.set({ ...current, [key]: nextValues });
    this.resetAndLoad();
  }

  protected isSelected(key: string, value: string): boolean {
    return this.selected()[key]?.includes(value) ?? false;
  }

  protected isAnyCategorySelected(): boolean {
    return (this.selected()['category']?.length ?? 0) > 0;
  }

  protected clearCategory(): void {
    const { category: _category, ...remaining } = this.selected();
    this.selected.set(remaining);
    this.resetAndLoad();
  }

  protected clearFilters(): void {
    this.selected.set({});
    this.minPrice.setValue(null, { emitEvent: false });
    this.maxPrice.setValue(null, { emitEvent: false });
    this.resetAndLoad();
  }

  protected sortLabel(): string {
    return this.sortOptions.find((option) => option.value === this.sort.value)?.label ?? 'Featured';
  }

  protected selectSort(value: string, event: Event): void {
    this.sort.setValue(value);
    (event.currentTarget as HTMLElement).closest('details')?.removeAttribute('open');
  }

  protected previousPage(): void {
    if (this.page() <= 1) return;
    this.page.update((page) => page - 1);
    this.load();
  }

  protected nextPage(): void {
    if (this.page() >= this.totalPages()) return;
    this.page.update((page) => page + 1);
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(false);
    this.searchService
      .search(this.searchQuery())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((response) => this.applyResponse(response));
  }

  private resetAndLoad(): void {
    this.page.set(1);
    this.currentQuery.set(this.query.value.trim());
    this.load();
  }

  private searchQuery(): SearchQuery {
    return {
      ...this.selected(),
      q: this.currentQuery() || this.query.value || undefined,
      page: this.page(),
      pageSize: this.pageSize,
      sort: this.sort.value,
      minPrice: this.minPrice.value || undefined,
      maxPrice: this.maxPrice.value || undefined,
    };
  }

  private applyResponse(response: PublicSearchResponseDto | null): void {
    this.loading.set(false);
    if (!response) {
      this.error.set(true);
      return;
    }
    this.filters.set(response.filters);
    this.products.set(response.items.map((item) => this.toStorefrontProduct(item)));
    this.suggestions.set(response.suggestions);
    this.popularSearches.set(response.popularSearches);
    this.total.set(response.total);
  }

  private toStorefrontProduct(product: PublicProductCardDto): StorefrontProduct {
    return {
      id: product.id,
      productCode: product.productCode,
      slug: product.slug,
      name: product.name,
      category: product.category ?? product.sareeType ?? 'Sarees',
      sareeType: product.sareeType ?? product.category ?? 'Designer saree',
      fabric: product.fabric ?? 'Premium fabric',
      colour: product.primaryColour ?? 'Boutique colour',
      pattern: product.pattern ?? 'Elegant border',
      occasion: product.occasion ?? 'Occasion wear',
      priceInPaise: product.offerPriceInPaise ?? product.sellingPriceInPaise,
      mrpInPaise: product.mrpInPaise ?? product.sellingPriceInPaise,
      discount: product.discountPercentage ?? 0,
      rating: product.averageRating ?? 4.6,
      reviews: product.reviewCount ?? 0,
      stock: this.stockLabel(product.availability),
      imageUrl: product.coverImage?.url,
      imageTone: product.imageTone ?? 'wine',
      colours: product.colours ?? ['#7a1f32', '#b98b2d', '#fffaf1'],
    };
  }

  private stockLabel(status: CustomerAvailabilityStatus): StorefrontProduct['stock'] {
    if (status === 'out_of_stock' || status === 'coming_soon') return 'Out of stock';
    if (status === 'only_few_left') return 'Only a few left';
    return 'In stock';
  }
}
