import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { debounceTime } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type {
  CustomerAvailabilityStatus,
  PublicCollectionDto,
  PublicCollectionListResponseDto,
  PublicProductCardDto,
  PublicProductFilterGroupDto,
} from '@aayu-aura/shared-types';
import { ProductCardComponent } from '../../shared/ui/product-card.component';
import { StorefrontProduct } from '../../shared/models/storefront-demo.models';
import { featuredProducts, formatPrice } from '../../shared/utilities/storefront-demo-data';
import { CollectionsQuery, CollectionsService } from './collections.service';

@Component({
  selector: 'aac-collections-page',
  standalone: true,
  imports: [ProductCardComponent, ReactiveFormsModule, RouterLink],
  template: `
    <section class="collections-shell">
      <header class="collections-hero">
        <div>
          <p class="eyebrow">{{ hero().eyebrow }}</p>
          <h1>{{ hero().title }}</h1>
          <p>{{ hero().description }}</p>
        </div>
        <div
          class="collection-hero-card"
          [class.tone-wine]="hero().imageTone === 'wine'"
          [class.tone-ivory]="hero().imageTone === 'ivory'"
          [class.tone-plum]="hero().imageTone === 'plum'"
          [class.tone-emerald]="hero().imageTone === 'emerald'"
        >
          <span>{{ selectedCollection()?.badge ?? 'Curated edit' }}</span>
          <strong>{{ selectedCollection()?.title ?? 'Aayu & Aura' }}</strong>
          <small>{{ total() }} sarees available</small>
        </div>
      </header>

      <section class="collection-card-grid" aria-label="Collections">
        @for (collection of collections(); track collection.slug) {
          <a
            class="collection-card"
            [class.is-active]="collection.slug === collectionSlug()"
            [routerLink]="['/collections', collection.slug]"
          >
            <div
              class="collection-card-media"
              [class.tone-wine]="collection.imageTone === 'wine'"
              [class.tone-ivory]="collection.imageTone === 'ivory'"
              [class.tone-plum]="collection.imageTone === 'plum'"
              [class.tone-emerald]="collection.imageTone === 'emerald'"
            >
              <span>{{ collection.badge }}</span>
            </div>
            <div>
              <h2>{{ collection.title }}</h2>
              <p>{{ collection.description }}</p>
              <div class="collection-meta">
                <span>{{ collection.productCount }} sarees</span>
                @if (collection.startingPriceInPaise) {
                  <span>From {{ price(collection.startingPriceInPaise) }}</span>
                }
              </div>
            </div>
          </a>
        }
      </section>

      <div class="shop-toolbar" aria-label="Collection controls">
        <div class="compact-field">
          <span>Sort</span>
          <details class="custom-select">
            <summary>{{ sortLabel() }}</summary>
            <div class="custom-select-menu" role="listbox" aria-label="Sort collection products">
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
        <aside class="filter-panel" aria-label="Collection filters">
          <div class="filter-panel-title">
            <h2>Refine</h2>
            <button type="button" (click)="clearFilters()">Clear all</button>
          </div>

          @for (filter of filters(); track filter.key) {
            <section class="filter-group">
              <h3>{{ filter.label }}</h3>
              <div class="filter-chip-grid">
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
            <span>{{ selectedCollection()?.title ?? 'Collection' }}</span>
            <span>{{ total() }} sarees</span>
            <span>Live catalogue</span>
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
            <div class="loading-grid" aria-label="Loading collection products">
              @for (item of skeletons; track item) {
                <div class="skeleton-card"></div>
              }
            </div>
          } @else if (error()) {
            <div class="shop-empty">
              <p class="eyebrow">Loading issue</p>
              <h2>Collections are unavailable</h2>
              <p>Start the API and MongoDB connection, then refresh the storefront.</p>
              <button type="button" (click)="load()">Try again</button>
            </div>
          } @else if (products().length === 0) {
            <div class="shop-empty">
              <p class="eyebrow">No match</p>
              <h2>No sarees found in this collection</h2>
              <p>Remove a filter or choose another curated edit.</p>
              <button type="button" (click)="clearFilters()">Clear filters</button>
            </div>
          } @else {
            <div class="product-grid">
              @for (product of products(); track product.slug) {
                <aac-product-card [product]="product" />
              }
            </div>
            <div class="pagination-row" aria-label="Collection pagination">
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
export class CollectionsPageComponent {
  private readonly collectionsService = inject(CollectionsService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly sort = new FormControl('featured', { nonNullable: true });
  protected readonly sortOptions = [
    { value: 'featured', label: 'Featured' },
    { value: 'price_asc', label: 'Price: low to high' },
    { value: 'price_desc', label: 'Price: high to low' },
    { value: 'highest_discount', label: 'Highest discount' },
    { value: 'highest_rated', label: 'Highest rated' },
  ];
  protected readonly minPrice = new FormControl<number | null>(null);
  protected readonly maxPrice = new FormControl<number | null>(null);
  protected readonly page = signal(1);
  protected readonly pageSize = 12;
  protected readonly collectionSlug = signal<string | null>(null);
  protected readonly loading = signal(false);
  protected readonly error = signal(false);
  protected readonly collections = signal<PublicCollectionDto[]>([]);
  protected readonly selectedCollection = signal<PublicCollectionDto | undefined>(undefined);
  protected readonly filters = signal<PublicProductFilterGroupDto[]>([]);
  protected readonly selected = signal<Record<string, string[]>>({});
  protected readonly products = signal<StorefrontProduct[]>(featuredProducts);
  protected readonly total = signal(featuredProducts.length);
  protected readonly skeletons = Array.from({ length: 8 }, (_, index) => index);
  protected readonly hero = signal({
    eyebrow: 'Curated collections',
    title: 'Shop sarees by mood, moment, and fabric.',
    description: 'Browse boutique edits from the live catalogue.',
    imageTone: 'wine',
  });
  protected readonly totalPages = computed(() =>
    Math.max(Math.ceil(this.total() / this.pageSize), 1),
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
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.collectionSlug.set(params.get('collectionSlug'));
      this.selected.set({});
      this.page.set(1);
      this.load();
    });
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

  protected price(paise: number): string {
    return formatPrice(paise);
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(false);
    this.collectionsService
      .get(this.collectionSlug(), this.query())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((response) => this.applyResponse(response));
  }

  private resetAndLoad(): void {
    this.page.set(1);
    this.load();
  }

  private query(): CollectionsQuery {
    return {
      ...this.selected(),
      page: this.page(),
      pageSize: this.pageSize,
      sort: this.sort.value,
      minPrice: this.minPrice.value || undefined,
      maxPrice: this.maxPrice.value || undefined,
    };
  }

  private applyResponse(response: PublicCollectionListResponseDto | null): void {
    this.loading.set(false);
    if (!response) {
      this.error.set(true);
      return;
    }
    this.hero.set(response.hero);
    this.collections.set(response.collections);
    this.selectedCollection.set(response.selectedCollection);
    this.filters.set(response.filters);
    this.products.set(response.products.map((item) => this.toStorefrontProduct(item)));
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
