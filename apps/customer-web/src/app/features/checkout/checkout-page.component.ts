import { Component, DestroyRef, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { debounceTime } from 'rxjs';
import type {
  PublicCartQuoteDto,
  PublicCheckoutPaymentMethod,
  PublicCheckoutRequestDto,
} from '@aayu-aura/shared-types';
import { formatPrice } from '../../shared/utilities/storefront-demo-data';
import { CartStore } from '../../state/cart/cart.store';
import { CartQuoteService } from '../cart/cart-quote.service';
import { CheckoutService } from './checkout.service';

@Component({
  selector: 'aac-checkout-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <section class="checkout-layout dynamic-checkout">
      <form class="cart-panel checkout-panel" [formGroup]="addressForm" (ngSubmit)="placeOrder()">
        <p class="eyebrow">Checkout</p>
        <h1>Guest checkout</h1>
        <div class="checkout-steps" aria-label="Checkout steps">
          <span class="is-active">Address</span>
          <span>Delivery</span>
          <span>Payment</span>
          <span>Review</span>
        </div>

        @if (cart.items().length === 0) {
          <div class="empty-state">
            <strong>Your cart is empty</strong>
            <span>Add sarees to cart before checkout.</span>
            <a class="button primary" routerLink="/shop">Shop sarees</a>
          </div>
        } @else {
          <div class="checkout-form-grid">
            <label class="field">
              <span>Full name</span>
              <input formControlName="fullName" autocomplete="name">
            </label>
            <label class="field">
              <span>Mobile number</span>
              <input formControlName="mobile" autocomplete="tel" inputmode="tel">
            </label>
            <label class="field">
              <span>Email</span>
              <input formControlName="email" autocomplete="email" type="email">
            </label>
            <label class="field">
              <span>PIN code</span>
              <input formControlName="pinCode" inputmode="numeric">
            </label>
            <label class="field span-2">
              <span>Address line 1</span>
              <input formControlName="addressLine1" autocomplete="address-line1">
            </label>
            <label class="field">
              <span>Address line 2</span>
              <input formControlName="addressLine2" autocomplete="address-line2">
            </label>
            <label class="field">
              <span>Landmark</span>
              <input formControlName="landmark">
            </label>
            <label class="field">
              <span>City</span>
              <input formControlName="city" autocomplete="address-level2">
            </label>
            <label class="field">
              <span>State</span>
              <input formControlName="state" autocomplete="address-level1">
            </label>
          </div>

          <section class="checkout-section">
            <h2>Payment method</h2>
            <div class="payment-grid" aria-label="Payment options">
              @for (method of paymentMethods; track method) {
                <button
                  type="button"
                  [class.is-selected]="paymentMethod() === method"
                  [disabled]="method === 'COD' && quote()?.codAvailable === false"
                  (click)="paymentMethod.set(method)"
                >
                  {{ method }}
                </button>
              }
            </div>
          </section>

          <label class="field">
            <span>Coupon code</span>
            <input formControlName="couponCode" placeholder="AAURA10">
          </label>

          <label class="field">
            <span>Order notes</span>
            <textarea formControlName="customerNotes" rows="3" placeholder="Blouse preference, delivery note, or gift message"></textarea>
          </label>

          @if (error()) {
            <p class="form-error">{{ error() }}</p>
          }

          <button class="button primary" type="submit" [disabled]="placing() || !canPlaceOrder()">
            {{ placing() ? 'Placing order...' : 'Place order securely' }}
          </button>
        }
      </form>

      <aside class="summary-panel checkout-summary">
        <h2>Order summary</h2>
        @if (quote(); as cartQuote) {
          <div class="checkout-item-list">
            @for (item of cartQuote.items; track item.productSlug) {
              <div>
                <span>
                  <strong>{{ item.name }}</strong>
                  <small>Qty {{ item.quantity }} | {{ item.stockMessage }}</small>
                </span>
                <b>{{ price(item.lineTotalInPaise) }}</b>
              </div>
            }
          </div>
          <dl>
            <div><dt>MRP total</dt><dd>{{ price(cartQuote.subtotalInPaise) }}</dd></div>
            <div><dt>Product discount</dt><dd>- {{ price(cartQuote.productDiscountInPaise) }}</dd></div>
            <div><dt>Coupon discount</dt><dd>- {{ price(cartQuote.couponDiscountInPaise) }}</dd></div>
            <div><dt>Shipping</dt><dd>{{ cartQuote.shippingChargeInPaise === 0 ? 'Free' : price(cartQuote.shippingChargeInPaise) }}</dd></div>
            <div><dt>Tax</dt><dd>Included {{ price(cartQuote.taxIncludedInPaise) }}</dd></div>
            <div><dt>Payable</dt><dd>{{ price(cartQuote.payableInPaise) }}</dd></div>
          </dl>
          <p>{{ cartQuote.deliveryEstimate }}</p>
          <p>{{ paymentMethod() === 'COD' ? 'Pay on delivery where courier supports COD.' : 'Order will be created and marked payment pending until payment gateway capture is connected.' }}</p>
        } @else if (cart.items().length > 0) {
          <div class="cart-loading-list"><span></span><span></span></div>
        } @else {
          <p>No items in cart.</p>
        }
        <a class="button secondary" routerLink="/cart">Review cart</a>
      </aside>
    </section>
  `,
})
export class CheckoutPageComponent {
  protected readonly cart = inject(CartStore);
  private readonly cartQuote = inject(CartQuoteService);
  private readonly checkout = inject(CheckoutService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);

  protected readonly paymentMethods: PublicCheckoutPaymentMethod[] = ['UPI', 'Cards', 'Net banking', 'COD'];
  protected readonly paymentMethod = signal<PublicCheckoutPaymentMethod>('COD');
  protected readonly quote = signal<PublicCartQuoteDto | null>(null);
  protected readonly placing = signal(false);
  protected readonly error = signal('');

  protected readonly addressForm = new FormGroup({
    fullName: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    mobile: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(8)] }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.email] }),
    pinCode: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(4)] }),
    addressLine1: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(5)] }),
    addressLine2: new FormControl('', { nonNullable: true }),
    landmark: new FormControl('', { nonNullable: true }),
    city: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    state: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    couponCode: new FormControl('', { nonNullable: true }),
    customerNotes: new FormControl('', { nonNullable: true }),
  });

  constructor() {
    effect(() => {
      this.cart.items();
      queueMicrotask(() => this.refreshQuote());
    });

    this.addressForm.controls.pinCode.valueChanges
      .pipe(debounceTime(300), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.refreshQuote());
    this.addressForm.controls.couponCode.valueChanges
      .pipe(debounceTime(300), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.refreshQuote());
  }

  protected refreshQuote(): void {
    const items = this.cart.items();
    if (items.length === 0) {
      this.quote.set(null);
      return;
    }

    this.cartQuote.quote({
      items: items.map((item) => ({
        productId: item.productId,
        productSlug: item.productSlug,
        productCode: item.productCode,
        quantity: item.quantity,
      })),
      couponCode: this.addressForm.controls.couponCode.value || undefined,
      pinCode: this.addressForm.controls.pinCode.value || undefined,
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe((quote) => {
      this.quote.set(quote);
      if (quote && this.paymentMethod() === 'COD' && !quote.codAvailable) {
        this.paymentMethod.set('UPI');
      }
    });
  }

  protected canPlaceOrder(): boolean {
    const quote = this.quote();
    return Boolean(
      quote?.items.length &&
        this.addressForm.valid &&
        !(this.paymentMethod() === 'COD' && quote.codAvailable === false),
    );
  }

  protected placeOrder(): void {
    this.error.set('');
    if (!this.canPlaceOrder()) {
      this.addressForm.markAllAsTouched();
      this.error.set('Complete address, delivery PIN, and payment method before placing order.');
      return;
    }

    const value = this.addressForm.getRawValue();
    const request: PublicCheckoutRequestDto = {
      cart: {
        items: this.cart.items().map((item) => ({
          productId: item.productId,
          productSlug: item.productSlug,
          productCode: item.productCode,
          quantity: item.quantity,
        })),
        couponCode: value.couponCode || undefined,
        pinCode: value.pinCode,
      },
      customer: {
        fullName: value.fullName,
        mobile: value.mobile,
        email: value.email || undefined,
        addressLine1: value.addressLine1,
        addressLine2: value.addressLine2 || undefined,
        landmark: value.landmark || undefined,
        city: value.city,
        state: value.state,
        pinCode: value.pinCode,
      },
      paymentMethod: this.paymentMethod(),
      customerNotes: value.customerNotes || undefined,
    };

    this.placing.set(true);
    this.checkout.placeOrder(request).pipe(takeUntilDestroyed(this.destroyRef)).subscribe((response) => {
      this.placing.set(false);
      if (!response) {
        this.error.set('Order could not be placed. Refresh cart and try again.');
        this.refreshQuote();
        return;
      }

      this.cart.clear();
      void this.router.navigate(['/order-success'], {
        queryParams: {
          orderNumber: response.order.orderNumber,
          identifier: response.tracking.identifier,
        },
      });
    });
  }

  protected price(value: number): string {
    return formatPrice(value);
  }
}
