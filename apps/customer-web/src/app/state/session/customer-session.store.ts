import { Injectable, computed, signal } from '@angular/core';

export interface CustomerSessionSnapshot {
  id: string;
  name: string;
  email?: string;
}

@Injectable({ providedIn: 'root' })
export class CustomerSessionStore {
  private readonly customer = signal<CustomerSessionSnapshot | null>(null);

  readonly currentCustomer = this.customer.asReadonly();
  readonly isAuthenticated = computed(() => this.customer() !== null);

  setCustomer(customer: CustomerSessionSnapshot): void {
    this.customer.set(customer);
  }

  clear(): void {
    this.customer.set(null);
  }
}
