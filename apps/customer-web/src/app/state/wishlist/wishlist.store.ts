import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { StorefrontProduct } from '../../shared/models/storefront-demo.models';

const storageKey = 'aayu-aura:wishlist:v1';

@Injectable({ providedIn: 'root' })
export class WishlistStore {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly products = signal<readonly StorefrontProduct[]>(this.readInitialValue());

  readonly items = this.products.asReadonly();
  readonly count = computed(() => this.products().length);
  readonly productSlugs = computed(() => new Set(this.products().map((product) => product.slug)));

  isSaved(slug: string): boolean {
    return this.productSlugs().has(slug);
  }

  add(product: StorefrontProduct): void {
    if (this.isSaved(product.slug)) return;
    this.setItems([product, ...this.products()]);
  }

  remove(slug: string): void {
    this.setItems(this.products().filter((product) => product.slug !== slug));
  }

  toggle(product: StorefrontProduct): boolean {
    if (this.isSaved(product.slug)) {
      this.remove(product.slug);
      return false;
    }

    this.add(product);
    return true;
  }

  clear(): void {
    this.setItems([]);
  }

  private setItems(products: readonly StorefrontProduct[]): void {
    this.products.set(products);
    this.persist(products);
  }

  private readInitialValue(): StorefrontProduct[] {
    if (!isPlatformBrowser(this.platformId)) return [];

    try {
      const rawValue = localStorage.getItem(storageKey);
      if (!rawValue) return [];
      const parsedValue = JSON.parse(rawValue) as StorefrontProduct[];
      return Array.isArray(parsedValue) ? parsedValue : [];
    } catch {
      return [];
    }
  }

  private persist(products: readonly StorefrontProduct[]): void {
    if (!isPlatformBrowser(this.platformId)) return;
    localStorage.setItem(storageKey, JSON.stringify(products));
  }
}
