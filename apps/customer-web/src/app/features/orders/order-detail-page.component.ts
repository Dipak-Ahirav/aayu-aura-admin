import { Component, input } from '@angular/core';

@Component({
  selector: 'aac-order-detail-page',
  standalone: true,
  template: `
    <section class="page-shell order-status-shell">
      <p class="eyebrow">Order detail</p>
      <h1>{{ orderNumber() }}</h1>
      <div class="status-timeline">
        @for (status of statuses; track status) {
          <span>{{ status }}</span>
        }
      </div>
      <div class="action-grid">
        <button type="button">Download invoice</button>
        <button type="button">Cancel eligible order</button>
        <button type="button">Request return</button>
        <button type="button">Exchange status</button>
        <button type="button">Refund status</button>
      </div>
    </section>
  `,
})
export class OrderDetailPageComponent {
  readonly orderNumber = input.required<string>();
  protected readonly statuses = ['Placed', 'Confirmed', 'Packed', 'Shipped', 'Delivered'];
}
