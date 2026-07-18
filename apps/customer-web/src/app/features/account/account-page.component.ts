import { Component, input } from '@angular/core';

@Component({
  selector: 'aac-account-page',
  standalone: true,
  template: `
    <section class="page-shell">
      <p class="eyebrow">Account</p>
      <h1>{{ section() || 'Dashboard' }}</h1>
      <p>Profile, addresses, orders, payments, invoices, returns, wishlist, reviews, and notifications are planned after customer authentication.</p>
    </section>
  `,
})
export class AccountPageComponent {
  readonly section = input<string>();
}
