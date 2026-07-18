import { Injectable, computed, signal } from '@angular/core';

export interface CartLine {
  productId: string;
  variantId?: string;
  name: string;
  quantity: number;
  unitPriceInPaise: number;
}

@Injectable({ providedIn: 'root' })
export class CartStore {
  private readonly lines = signal<CartLine[]>([]);

  readonly items = this.lines.asReadonly();
  readonly itemCount = computed(() => this.lines().reduce((total, item) => total + item.quantity, 0));
  readonly subtotalInPaise = computed(() =>
    this.lines().reduce((total, item) => total + item.quantity * item.unitPriceInPaise, 0),
  );
}
