import { Injectable, computed, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class WishlistStore {
  private readonly productIds = signal<readonly string[]>([]);

  readonly items = this.productIds.asReadonly();
  readonly count = computed(() => this.productIds().length);
}
