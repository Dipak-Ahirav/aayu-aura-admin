import { Injectable, signal } from '@angular/core';

export interface StorefrontBranding {
  displayName: string;
  announcement?: string;
  whatsappNumber?: string;
}

@Injectable({ providedIn: 'root' })
export class StorefrontStore {
  private readonly branding = signal<StorefrontBranding>({
    displayName: 'Aayu & Aura',
    announcement: 'Premium sarees, curated for every celebration.',
  });

  readonly brand = this.branding.asReadonly();
}
