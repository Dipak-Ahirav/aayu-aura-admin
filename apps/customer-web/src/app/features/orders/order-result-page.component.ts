import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

@Component({
  selector: 'aac-order-result-page',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="page-shell order-result-shell">
      <p class="eyebrow">Order</p>
      @if (isSuccess()) {
        <h1>Order placed successfully</h1>
        <p>Your order has been saved in the backend and is ready for admin processing.</p>
        @if (orderNumber(); as number) {
          <div class="order-result-number">
            <span>Order number</span>
            <strong>{{ number }}</strong>
          </div>
          <div class="action-grid">
            <a class="button primary" [routerLink]="['/track-order']" [queryParams]="trackingParams()">Track order</a>
            <a class="button secondary" routerLink="/shop">Continue shopping</a>
          </div>
        }
      } @else {
        <h1>Order could not be placed</h1>
        <p>Payment or order creation did not complete. Review your cart and try again.</p>
        <div class="action-grid">
          <a class="button primary" routerLink="/cart">Review cart</a>
          <a class="button secondary" routerLink="/checkout">Try checkout again</a>
        </div>
      }
    </section>
  `,
})
export class OrderResultPageComponent {
  protected readonly route = inject(ActivatedRoute);

  protected isSuccess(): boolean {
    return this.route.snapshot.data['result'] === 'success';
  }

  protected orderNumber(): string {
    return this.route.snapshot.queryParamMap.get('orderNumber') ?? '';
  }

  protected trackingParams(): Record<string, string> {
    return {
      orderNumber: this.orderNumber(),
      identifier: this.route.snapshot.queryParamMap.get('identifier') ?? '',
    };
  }
}
