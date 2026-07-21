import { Injectable, computed, signal } from '@angular/core';
import type { StorefrontProduct } from '../../shared/models/storefront-demo.models';

export interface CartLine {
  productId?: string;
  productSlug: string;
  productCode?: string;
  variantId?: string;
  name: string;
  quantity: number;
  unitPriceInPaise: number;
  imageUrl?: string;
  imageTone?: string;
  stock?: string;
}

@Injectable({ providedIn: 'root' })
export class CartStore {
  private readonly storageKey = 'aayu-aura-cart';
  private readonly lines = signal<CartLine[]>(this.read());

  readonly items = this.lines.asReadonly();
  readonly itemCount = computed(() => this.lines().reduce((total, item) => total + item.quantity, 0));
  readonly subtotalInPaise = computed(() =>
    this.lines().reduce((total, item) => total + item.quantity * item.unitPriceInPaise, 0),
  );

  add(product: StorefrontProduct, quantity = 1): void {
    const productSlug = product.slug;
    const current = this.lines();
    const existing = current.find((line) => line.productSlug === productSlug);
    const next = existing
      ? current.map((line) =>
          line.productSlug === productSlug
            ? { ...line, quantity: Math.min(line.quantity + quantity, 20) }
            : line,
        )
      : [
          ...current,
          {
            productId: product.id,
            productSlug,
            productCode: product.productCode,
            name: product.name,
            quantity: Math.min(Math.max(quantity, 1), 20),
            unitPriceInPaise: product.priceInPaise,
            imageUrl: product.imageUrl,
            imageTone: product.imageTone,
            stock: product.stock,
          },
        ];
    this.commit(next);
  }

  updateQuantity(productSlug: string, quantity: number): void {
    if (quantity <= 0) {
      this.remove(productSlug);
      return;
    }
    this.commit(
      this.lines().map((line) =>
        line.productSlug === productSlug ? { ...line, quantity: Math.min(quantity, 20) } : line,
      ),
    );
  }

  remove(productSlug: string): void {
    this.commit(this.lines().filter((line) => line.productSlug !== productSlug));
  }

  clear(): void {
    this.commit([]);
  }

  syncQuotedLines(
    lines: Array<{
      productId: string;
      productSlug: string;
      productCode: string;
      name: string;
      quantity: number;
      unitPriceInPaise: number;
      image?: { url: string };
      imageTone?: string;
      stockMessage: string;
    }>,
  ): void {
    const quotedSlugs = new Set(lines.map((line) => line.productSlug));
    const current = this.lines().filter((line) => quotedSlugs.has(line.productSlug));
    const next = lines.map((line) => {
      const existing = current.find((item) => item.productSlug === line.productSlug);
      return {
        ...existing,
        productId: line.productId,
        productSlug: line.productSlug,
        productCode: line.productCode,
        name: line.name,
        quantity: line.quantity,
        unitPriceInPaise: line.unitPriceInPaise,
        imageUrl: line.image?.url ?? existing?.imageUrl,
        imageTone: line.imageTone ?? existing?.imageTone,
        stock: line.stockMessage,
      };
    });
    this.commit(next);
  }

  private commit(lines: CartLine[]): void {
    this.lines.set(lines);
    this.write(lines);
  }

  private read(): CartLine[] {
    try {
      const raw = globalThis.localStorage?.getItem(this.storageKey);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private write(lines: CartLine[]): void {
    try {
      globalThis.localStorage?.setItem(this.storageKey, JSON.stringify(lines));
    } catch {
      // Ignore private browsing or disabled storage.
    }
  }
}
