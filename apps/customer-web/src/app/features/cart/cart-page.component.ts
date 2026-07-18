import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CartStore } from '../../state/cart/cart.store';
import { formatPrice } from '../../shared/utilities/storefront-demo-data';

@Component({
  selector: 'aac-cart-page',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="checkout-layout">
      <div class="cart-panel">
        <p class="eyebrow">Cart</p>
        <h1>Your cart</h1>
        <div class="cart-line">
          <div class="mini-media product-media-wine"></div>
          <div>
            <h2>Wine Kanjivaram Silk Saree</h2>
            <p>Colour: Wine • Blouse included • Qty 1</p>
            <button type="button">Move to wishlist</button>
          </div>
          <strong>{{ price(1299900) }}</strong>
        </div>
        <div class="empty-state">
          <strong>Empty cart state ready</strong>
          <span>Customers get clear recovery actions when no products are in cart.</span>
        </div>
      </div>

      <aside class="summary-panel">
        <h2>Price breakdown</h2>
        <dl>
          <div><dt>Subtotal</dt><dd>{{ price(1299900) }}</dd></div>
          <div><dt>Coupon discount</dt><dd>- {{ price(100000) }}</dd></div>
          <div><dt>Shipping</dt><dd>Calculated by PIN code</dd></div>
          <div><dt>Total</dt><dd>{{ price(1199900) }}</dd></div>
        </dl>
        <label class="field">
          <span>Coupon code</span>
          <input placeholder="AAURA10">
        </label>
        <a class="button primary" routerLink="/checkout">Guest checkout</a>
        <a class="button secondary" routerLink="/login">Login and checkout</a>
      </aside>
    </section>
  `,
})
export class CartPageComponent {
  protected readonly cart = inject(CartStore);

  protected price(value: number): string {
    return formatPrice(value);
  }
}
