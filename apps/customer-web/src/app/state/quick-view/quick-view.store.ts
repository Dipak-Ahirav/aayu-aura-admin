import { Injectable, signal } from '@angular/core';
import { StorefrontProduct } from '../../shared/models/storefront-demo.models';

@Injectable({ providedIn: 'root' })
export class QuickViewStore {
  private readonly selectedProduct = signal<StorefrontProduct | null>(null);

  readonly product = this.selectedProduct.asReadonly();

  open(product: StorefrontProduct): void {
    this.selectedProduct.set(product);
  }

  close(): void {
    this.selectedProduct.set(null);
  }
}
