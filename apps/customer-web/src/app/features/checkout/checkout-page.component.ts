import { Component, input } from '@angular/core';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { formatPrice } from '../../shared/utilities/storefront-demo-data';

@Component({
  selector: 'aac-checkout-page',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <section class="checkout-layout">
      <form class="cart-panel" [formGroup]="addressForm">
        <p class="eyebrow">Checkout</p>
        <h1>{{ step() || 'Guest checkout' }}</h1>
        <div class="checkout-steps" aria-label="Checkout steps">
          <span>Address</span>
          <span>Delivery</span>
          <span>Payment</span>
          <span>Review</span>
        </div>

        <label class="field">
          <span>Full name</span>
          <input formControlName="fullName" autocomplete="name">
        </label>
        <label class="field">
          <span>Mobile number</span>
          <input formControlName="mobile" autocomplete="tel">
        </label>
        <label class="field">
          <span>PIN code</span>
          <input formControlName="pinCode" inputmode="numeric">
        </label>
        <label class="field">
          <span>Address</span>
          <input formControlName="addressLine1" autocomplete="address-line1">
        </label>

        <div class="payment-grid" aria-label="Payment options">
          @for (method of paymentMethods; track method) {
            <button type="button">{{ method }}</button>
          }
        </div>
      </form>

      <aside class="summary-panel">
        <h2>Order summary</h2>
        <dl>
          <div><dt>Items</dt><dd>{{ price(1299900) }}</dd></div>
          <div><dt>Discount</dt><dd>- {{ price(100000) }}</dd></div>
          <div><dt>Estimated shipping</dt><dd>{{ price(0) }}</dd></div>
          <div><dt>Payable</dt><dd>{{ price(1199900) }}</dd></div>
        </dl>
        <p>No hidden charges. Final totals stay backend-calculated before order placement.</p>
        <button class="button primary" type="button">Place order securely</button>
      </aside>
    </section>
  `,
})
export class CheckoutPageComponent {
  readonly step = input<string>();
  protected readonly paymentMethods = ['UPI', 'Cards', 'Net banking', 'COD'];
  protected readonly addressForm = new FormGroup({
    fullName: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    mobile: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    pinCode: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    addressLine1: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  protected price(value: number): string {
    return formatPrice(value);
  }
}
