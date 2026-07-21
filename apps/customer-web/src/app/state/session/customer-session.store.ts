import { Injectable, computed, signal } from '@angular/core';

export interface CustomerSessionSnapshot {
  id: string;
  name: string;
  mobile?: string;
  email?: string;
  accessToken?: string;
}

@Injectable({ providedIn: 'root' })
export class CustomerSessionStore {
  private readonly storageKey = 'aayu-aura-customer-session';
  private readonly customer = signal<CustomerSessionSnapshot | null>(this.read());

  readonly currentCustomer = this.customer.asReadonly();
  readonly isAuthenticated = computed(() => this.customer() !== null);
  readonly accessToken = computed(() => this.customer()?.accessToken ?? '');

  setCustomer(customer: CustomerSessionSnapshot): void {
    this.customer.set(customer);
    this.write(customer);
  }

  clear(): void {
    this.customer.set(null);
    try {
      globalThis.localStorage?.removeItem(this.storageKey);
    } catch {
      // Ignore disabled storage.
    }
  }

  private read(): CustomerSessionSnapshot | null {
    try {
      const raw = globalThis.localStorage?.getItem(this.storageKey);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  private write(customer: CustomerSessionSnapshot): void {
    try {
      globalThis.localStorage?.setItem(this.storageKey, JSON.stringify(customer));
    } catch {
      // Ignore disabled storage.
    }
  }
}
