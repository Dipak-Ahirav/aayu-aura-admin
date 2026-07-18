import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'aac-order-result-page',
  standalone: true,
  template: `
    <section class="page-shell">
      <p class="eyebrow">Order</p>
      <h1>{{ route.snapshot.data['result'] === 'success' ? 'Order success' : 'Order failure' }}</h1>
      <p>Payment result handling will be connected after the payment adapter is implemented.</p>
    </section>
  `,
})
export class OrderResultPageComponent {
  protected readonly route = inject(ActivatedRoute);
}
