import { Component, DestroyRef, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { debounceTime } from 'rxjs';
import type {
  PublicCartQuoteDto,
  PublicCheckoutPaymentDetailsDto,
  PublicCheckoutPaymentMethod,
  PublicCheckoutRequestDto,
  PublicCheckoutResponseDto,
  PublicVerifyRazorpayPaymentResponseDto,
} from '@aayu-aura/shared-types';
import { formatPrice } from '../../shared/utilities/storefront-demo-data';
import { CartStore } from '../../state/cart/cart.store';
import { CustomerSessionStore } from '../../state/session/customer-session.store';
import { CartQuoteService } from '../cart/cart-quote.service';
import { CheckoutService } from './checkout.service';

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

@Component({
  selector: 'aac-checkout-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <section class="checkout-layout dynamic-checkout">
      <form class="cart-panel checkout-panel" [formGroup]="addressForm" (ngSubmit)="placeOrder()">
        <p class="eyebrow">Checkout</p>
        <h1>{{ session.isAuthenticated() ? 'Checkout' : 'Guest checkout' }}</h1>
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
            <label class="field" [class.is-invalid]="isInvalid('fullName')">
              <span>Full name</span>
              <input formControlName="fullName" autocomplete="name">
              @if (fieldError('fullName')) { <small class="field-error">{{ fieldError('fullName') }}</small> }
            </label>
            <label class="field" [class.is-invalid]="isInvalid('mobile')">
              <span>Mobile number</span>
              <input formControlName="mobile" autocomplete="tel" inputmode="tel">
              @if (fieldError('mobile')) { <small class="field-error">{{ fieldError('mobile') }}</small> }
            </label>
            <label class="field" [class.is-invalid]="isInvalid('email')">
              <span>Email</span>
              <input formControlName="email" autocomplete="email" type="email">
              @if (fieldError('email')) { <small class="field-error">{{ fieldError('email') }}</small> }
            </label>
            <label class="field" [class.is-invalid]="isInvalid('pinCode')">
              <span>PIN code</span>
              <input formControlName="pinCode" inputmode="numeric">
              @if (fieldError('pinCode')) { <small class="field-error">{{ fieldError('pinCode') }}</small> }
            </label>
            <label class="field span-2" [class.is-invalid]="isInvalid('addressLine1')">
              <span>Address line 1</span>
              <input formControlName="addressLine1" autocomplete="address-line1">
              @if (fieldError('addressLine1')) { <small class="field-error">{{ fieldError('addressLine1') }}</small> }
            </label>
            <label class="field">
              <span>Address line 2</span>
              <input formControlName="addressLine2" autocomplete="address-line2">
            </label>
            <label class="field">
              <span>Landmark</span>
              <input formControlName="landmark">
            </label>
            <label class="field" [class.is-invalid]="isInvalid('city')">
              <span>City</span>
              <input formControlName="city" autocomplete="address-level2">
              @if (fieldError('city')) { <small class="field-error">{{ fieldError('city') }}</small> }
            </label>
            <label class="field" [class.is-invalid]="isInvalid('state')">
              <span>State</span>
              <input formControlName="state" autocomplete="address-level1">
              @if (fieldError('state')) { <small class="field-error">{{ fieldError('state') }}</small> }
            </label>
          </div>

          <section class="checkout-section">
            <label class="check-row checkout-check">
              <input formControlName="billingSameAsShipping" type="checkbox">
              <span>Billing address is same as delivery address</span>
            </label>
            @if (!addressForm.controls.billingSameAsShipping.value) {
              <div class="checkout-form-grid">
                <label class="field span-2" [class.is-invalid]="isInvalid('billingAddressLine1')">
                  <span>Billing address line 1</span>
                  <input formControlName="billingAddressLine1" autocomplete="billing address-line1">
                  @if (fieldError('billingAddressLine1')) { <small class="field-error">{{ fieldError('billingAddressLine1') }}</small> }
                </label>
                <label class="field">
                  <span>Billing address line 2</span>
                  <input formControlName="billingAddressLine2" autocomplete="billing address-line2">
                </label>
                <label class="field">
                  <span>Billing landmark</span>
                  <input formControlName="billingLandmark">
                </label>
                <label class="field" [class.is-invalid]="isInvalid('billingCity')">
                  <span>Billing city</span>
                  <input formControlName="billingCity">
                  @if (fieldError('billingCity')) { <small class="field-error">{{ fieldError('billingCity') }}</small> }
                </label>
                <label class="field" [class.is-invalid]="isInvalid('billingState')">
                  <span>Billing state</span>
                  <input formControlName="billingState">
                  @if (fieldError('billingState')) { <small class="field-error">{{ fieldError('billingState') }}</small> }
                </label>
                <label class="field" [class.is-invalid]="isInvalid('billingPinCode')">
                  <span>Billing PIN code</span>
                  <input formControlName="billingPinCode" inputmode="numeric">
                  @if (fieldError('billingPinCode')) { <small class="field-error">{{ fieldError('billingPinCode') }}</small> }
                </label>
              </div>
            }
          </section>

          <section class="checkout-section">
            <h2>Payment method</h2>
            <div class="payment-grid payment-option-grid" aria-label="Payment options">
              @for (option of paymentOptions; track option.method) {
                <button
                  type="button"
                  [class.is-selected]="paymentMethod() === option.method"
                  [disabled]="option.method === 'COD' && quote()?.codAvailable === false"
                  (click)="selectPaymentMethod(option.method)"
                >
                  <strong>{{ option.label }}</strong>
                  <span>{{ option.description }}</span>
                </button>
              }
            </div>
            <div class="payment-detail-card">
              @if (paymentMethod() === 'UPI') {
                <div class="checkout-form-grid single-payment-field">
                  <label class="field" [class.is-invalid]="isInvalid('upiId')">
                    <span>UPI ID</span>
                    <input formControlName="upiId" placeholder="name@bank" autocomplete="off">
                    @if (fieldError('upiId')) { <small class="field-error">{{ fieldError('upiId') }}</small> }
                  </label>
                </div>
                <p class="auth-note">After placing the order, Razorpay opens securely. Choose UPI there to receive the app payment request.</p>
              } @else if (paymentMethod() === 'Cards') {
                <div class="checkout-form-grid">
                  <label class="field" [class.is-invalid]="isInvalid('cardholderName')">
                    <span>Cardholder name</span>
                    <input formControlName="cardholderName" autocomplete="cc-name">
                    @if (fieldError('cardholderName')) { <small class="field-error">{{ fieldError('cardholderName') }}</small> }
                  </label>
                  <label class="field" [class.is-invalid]="isInvalid('cardNumber')">
                    <span>Card number</span>
                    <input formControlName="cardNumber" inputmode="numeric" autocomplete="cc-number" placeholder="16 digit card number">
                    @if (fieldError('cardNumber')) { <small class="field-error">{{ fieldError('cardNumber') }}</small> }
                  </label>
                  <label class="field" [class.is-invalid]="isInvalid('cardExpiry')">
                    <span>Expiry</span>
                    <input formControlName="cardExpiry" autocomplete="cc-exp" placeholder="MM/YY">
                    @if (fieldError('cardExpiry')) { <small class="field-error">{{ fieldError('cardExpiry') }}</small> }
                  </label>
                  <label class="field" [class.is-invalid]="isInvalid('cardCvv')">
                    <span>CVV</span>
                    <input formControlName="cardCvv" inputmode="numeric" autocomplete="cc-csc" placeholder="123">
                    @if (fieldError('cardCvv')) { <small class="field-error">{{ fieldError('cardCvv') }}</small> }
                  </label>
                </div>
                <p class="auth-note">After placing the order, Razorpay opens securely for card payment. Only the last four digits are sent to the API.</p>
              } @else if (paymentMethod() === 'Net banking') {
                <div class="checkout-form-grid">
                  <label class="field" [class.is-invalid]="isInvalid('bankName')">
                    <span>Bank name</span>
                    <input formControlName="bankName" placeholder="Bank name">
                    @if (fieldError('bankName')) { <small class="field-error">{{ fieldError('bankName') }}</small> }
                  </label>
                  <label class="field" [class.is-invalid]="isInvalid('bankAccountHolder')">
                    <span>Account holder name</span>
                    <input formControlName="bankAccountHolder">
                    @if (fieldError('bankAccountHolder')) { <small class="field-error">{{ fieldError('bankAccountHolder') }}</small> }
                  </label>
                </div>
                <p class="auth-note">After placing the order, Razorpay opens securely for net banking payment.</p>
              } @else {
                <p>Cash on delivery will be collected by the courier where the delivery PIN code is serviceable.</p>
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

          <button
            class="button primary checkout-submit-button"
            type="submit"
            [disabled]="placing() || cart.items().length === 0 || !quote()?.items?.length"
          >
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
          <p>{{ paymentSummaryMessage() }}</p>
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
  protected readonly session = inject(CustomerSessionStore);
  private readonly cartQuote = inject(CartQuoteService);
  private readonly checkout = inject(CheckoutService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);

  protected readonly paymentOptions: Array<{
    method: PublicCheckoutPaymentMethod;
    label: string;
    description: string;
  }> = [
    { method: 'UPI', label: 'UPI', description: 'Pay with your UPI ID' },
    { method: 'Cards', label: 'Cards', description: 'Card validation with secure reference' },
    { method: 'Net banking', label: 'Net banking', description: 'Select bank details' },
    { method: 'COD', label: 'COD', description: 'Pay on delivery where available' },
  ];
  protected readonly paymentMethod = signal<PublicCheckoutPaymentMethod>('COD');
  protected readonly quote = signal<PublicCartQuoteDto | null>(null);
  protected readonly placing = signal(false);
  protected readonly error = signal('');
  private razorpayScript?: Promise<void>;

  protected readonly addressForm = new FormGroup({
    fullName: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(2)] }),
    mobile: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(/^\d{10}$/)] }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    pinCode: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(/^\d{6}$/)] }),
    addressLine1: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(5)] }),
    addressLine2: new FormControl('', { nonNullable: true }),
    landmark: new FormControl('', { nonNullable: true }),
    city: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    state: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    billingSameAsShipping: new FormControl(true, { nonNullable: true }),
    billingAddressLine1: new FormControl('', { nonNullable: true }),
    billingAddressLine2: new FormControl('', { nonNullable: true }),
    billingLandmark: new FormControl('', { nonNullable: true }),
    billingCity: new FormControl('', { nonNullable: true }),
    billingState: new FormControl('', { nonNullable: true }),
    billingPinCode: new FormControl('', { nonNullable: true }),
    upiId: new FormControl('', { nonNullable: true }),
    cardholderName: new FormControl('', { nonNullable: true }),
    cardNumber: new FormControl('', { nonNullable: true }),
    cardExpiry: new FormControl('', { nonNullable: true }),
    cardCvv: new FormControl('', { nonNullable: true }),
    bankName: new FormControl('', { nonNullable: true }),
    bankAccountHolder: new FormControl('', { nonNullable: true }),
    couponCode: new FormControl('', { nonNullable: true }),
    customerNotes: new FormControl('', { nonNullable: true }),
  });

  constructor() {
    const customer = this.session.currentCustomer();
    if (customer) {
      this.addressForm.patchValue({
        fullName: customer.name,
        mobile: customer.mobile ?? '',
        email: customer.email ?? '',
      });
    }

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
    this.addressForm.controls.billingSameAsShipping.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.updateBillingValidators());

    this.updateBillingValidators();
    this.updatePaymentValidators();
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
        this.updatePaymentValidators();
      }
    });
  }

  protected canPlaceOrder(): boolean {
    const quote = this.quote();
    return Boolean(
      quote?.items.length &&
        this.addressForm.valid &&
        this.paymentDetailsValid() &&
        !(this.paymentMethod() === 'COD' && quote.codAvailable === false),
    );
  }

  protected placeOrder(): void {
    this.error.set('');
    if (!this.canPlaceOrder()) {
      this.addressForm.markAllAsTouched();
      this.error.set(this.checkoutValidationMessage());
      return;
    }

    const value = this.addressForm.getRawValue();
    const billingAddress = value.billingSameAsShipping
      ? undefined
      : {
          fullName: value.fullName,
          mobile: value.mobile,
          email: value.email || undefined,
          addressLine1: value.billingAddressLine1,
          addressLine2: value.billingAddressLine2 || undefined,
          landmark: value.billingLandmark || undefined,
          city: value.billingCity,
          state: value.billingState,
          pinCode: value.billingPinCode,
        };
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
      billingAddress,
      paymentMethod: this.paymentMethod(),
      paymentDetails: this.paymentDetails(),
      customerNotes: value.customerNotes || undefined,
    };

    this.placing.set(true);
    this.checkout.placeOrder(request).pipe(takeUntilDestroyed(this.destroyRef)).subscribe((response) => {
      this.placing.set(false);
      if (!response) {
        this.error.set(this.checkout.lastError() || 'Order could not be placed. Refresh cart and try again.');
        this.refreshQuote();
        return;
      }

      if (response.payment.gateway?.provider === 'razorpay') {
        this.openRazorpayCheckout(response);
        return;
      }

      this.finishOrder(response);
    });
  }

  protected price(value: number): string {
    return formatPrice(value);
  }

  protected selectPaymentMethod(method: PublicCheckoutPaymentMethod): void {
    this.paymentMethod.set(method);
    this.updatePaymentValidators();
  }

  protected paymentSummaryMessage(): string {
    if (this.paymentMethod() === 'COD') return 'Pay on delivery where courier supports COD.';
    return `${this.paymentMethod()} payment will open in Razorpay and the order will be marked paid only after verification.`;
  }

  protected isInvalid(name: keyof typeof this.addressForm.controls): boolean {
    const control = this.addressForm.controls[name];
    return control.invalid && (control.touched || control.dirty);
  }

  protected fieldError(name: keyof typeof this.addressForm.controls): string {
    const control = this.addressForm.controls[name];
    if (!(control.touched || control.dirty)) return '';
    if (control.hasError('required')) return 'This field is required.';
    if (control.hasError('email')) return 'Enter a valid email address.';
    if (control.hasError('minlength')) return 'Enter a complete value.';
    if (control.hasError('pattern')) {
      if (name === 'mobile') return 'Enter a valid 10 digit mobile number.';
      if (name === 'pinCode' || name === 'billingPinCode') return 'Enter a valid 6 digit PIN code.';
      if (name === 'upiId') return 'Enter a valid UPI ID, for example name@bank.';
      if (name === 'cardNumber') return 'Enter a valid 16 digit card number.';
      if (name === 'cardExpiry') return 'Use MM/YY format.';
      if (name === 'cardCvv') return 'Enter a valid 3 digit CVV.';
    }
    return '';
  }

  private paymentDetailsValid(): boolean {
    if (this.paymentMethod() === 'COD') return true;
    return this.paymentControlNames().every((name) => this.addressForm.controls[name].valid);
  }

  private checkoutValidationMessage(): string {
    const quote = this.quote();
    if (!quote?.items.length) return 'Refresh cart before placing the order.';
    if (this.paymentMethod() === 'COD' && quote.codAvailable === false) {
      return 'COD is not available for this delivery PIN code. Select UPI, card, or net banking.';
    }
    if (this.paymentMethod() === 'UPI' && this.addressForm.controls.upiId.invalid) {
      return 'Enter a valid UPI ID, for example name@bank.';
    }
    if (this.paymentMethod() === 'Cards' && !this.paymentDetailsValid()) {
      return 'Enter valid cardholder name, 16 digit card number, MM/YY expiry, and 3 digit CVV.';
    }
    if (this.paymentMethod() === 'Net banking' && !this.paymentDetailsValid()) {
      return 'Enter bank name and account holder name for net banking.';
    }
    return 'Complete all required address, billing, and payment details before placing order.';
  }

  private paymentDetails(): PublicCheckoutPaymentDetailsDto {
    const value = this.addressForm.getRawValue();
    if (this.paymentMethod() === 'UPI') {
      return {
        method: 'UPI',
        upiId: value.upiId,
      };
    }
    if (this.paymentMethod() === 'Cards') {
      const digits = value.cardNumber.replace(/\D/g, '');
      const [expiryMonth, expiryYear] = value.cardExpiry.split('/');
      return {
        method: 'Cards',
        cardholderName: value.cardholderName,
        cardLast4: digits.slice(-4),
        expiryMonth: expiryMonth ?? '',
        expiryYear: expiryYear ?? '',
        transactionReference: `CARD-${digits.slice(-4)}-${Date.now()}`,
      };
    }
    if (this.paymentMethod() === 'Net banking') {
      return {
        method: 'Net banking',
        bankName: value.bankName,
        accountHolderName: value.bankAccountHolder,
      };
    }
    return { method: 'COD' };
  }

  private updatePaymentValidators(): void {
    const controls = this.addressForm.controls;
    const paymentNames: Array<keyof typeof controls> = [
      'upiId',
      'cardholderName',
      'cardNumber',
      'cardExpiry',
      'cardCvv',
      'bankName',
      'bankAccountHolder',
    ];

    paymentNames.forEach((name) => {
      controls[name].clearValidators();
      controls[name].updateValueAndValidity({ emitEvent: false });
    });

    if (this.paymentMethod() === 'UPI') {
      controls.upiId.setValidators([Validators.required, Validators.pattern(/^[\w.-]+@[\w.-]+$/)]);
    } else if (this.paymentMethod() === 'Cards') {
      controls.cardholderName.setValidators([Validators.required, Validators.minLength(2)]);
      controls.cardNumber.setValidators([Validators.required, Validators.pattern(/^\d{16}$/)]);
      controls.cardExpiry.setValidators([Validators.required, Validators.pattern(/^(0[1-9]|1[0-2])\/\d{2}$/)]);
      controls.cardCvv.setValidators([Validators.required, Validators.pattern(/^\d{3}$/)]);
    } else if (this.paymentMethod() === 'Net banking') {
      controls.bankName.setValidators([Validators.required, Validators.minLength(2)]);
      controls.bankAccountHolder.setValidators([Validators.required, Validators.minLength(2)]);
    }

    this.paymentControlNames().forEach((name) => {
      controls[name].updateValueAndValidity({ emitEvent: false });
    });
  }

  private updateBillingValidators(): void {
    const controls = this.addressForm.controls;
    const billingNames: Array<keyof typeof controls> = [
      'billingAddressLine1',
      'billingCity',
      'billingState',
      'billingPinCode',
    ];
    billingNames.forEach((name) => controls[name].clearValidators());
    if (!controls.billingSameAsShipping.value) {
      controls.billingAddressLine1.setValidators([Validators.required, Validators.minLength(5)]);
      controls.billingCity.setValidators([Validators.required]);
      controls.billingState.setValidators([Validators.required]);
      controls.billingPinCode.setValidators([Validators.required, Validators.pattern(/^\d{6}$/)]);
    }
    billingNames.forEach((name) => controls[name].updateValueAndValidity({ emitEvent: false }));
  }

  private paymentControlNames(): Array<keyof typeof this.addressForm.controls> {
    if (this.paymentMethod() === 'UPI') return ['upiId'];
    if (this.paymentMethod() === 'Cards') return ['cardholderName', 'cardNumber', 'cardExpiry', 'cardCvv'];
    if (this.paymentMethod() === 'Net banking') return ['bankName', 'bankAccountHolder'];
    return [];
  }

  private loadRazorpayScript(): Promise<void> {
    if (window.Razorpay) return Promise.resolve();
    if (this.razorpayScript) return this.razorpayScript;

    this.razorpayScript = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Unable to load Razorpay Checkout.'));
      document.body.appendChild(script);
    });
    return this.razorpayScript;
  }

  private openRazorpayCheckout(response: PublicCheckoutResponseDto): void {
    const gateway = response.payment.gateway;
    if (!gateway) return;

    this.placing.set(true);
    this.loadRazorpayScript()
      .then(() => {
        if (!window.Razorpay) {
          throw new Error('Razorpay Checkout is unavailable.');
        }

        const razorpay = new window.Razorpay({
          key: gateway.keyId,
          amount: gateway.amountInPaise,
          currency: gateway.currency,
          name: gateway.name,
          description: gateway.description,
          order_id: gateway.orderId,
          prefill: gateway.prefill,
          handler: (payment: {
            razorpay_payment_id: string;
            razorpay_order_id: string;
            razorpay_signature: string;
          }) => this.verifyRazorpayPayment(payment, response),
          modal: {
            ondismiss: () => {
              this.placing.set(false);
              this.error.set('Payment was not completed. Your order is placed but remains unpaid.');
            },
          },
        });
        razorpay.open();
      })
      .catch((error: Error) => {
        this.placing.set(false);
        this.error.set(error.message || 'Unable to open payment gateway. Try again or choose COD.');
      });
  }

  private verifyRazorpayPayment(
    payment: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string },
    checkoutResponse: PublicCheckoutResponseDto,
  ): void {
    this.checkout.verifyRazorpayPayment({
      razorpayOrderId: payment.razorpay_order_id,
      razorpayPaymentId: payment.razorpay_payment_id,
      razorpaySignature: payment.razorpay_signature,
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe((verification) => {
      this.placing.set(false);
      if (!verification) {
        this.error.set(this.checkout.lastError() || 'Payment could not be verified. Contact support.');
        return;
      }
      this.finishVerifiedOrder(verification, checkoutResponse);
    });
  }

  private finishOrder(response: PublicCheckoutResponseDto): void {
    this.cart.clear();
    void this.router.navigate(['/order-success'], {
      queryParams: {
        orderNumber: response.order.orderNumber,
        identifier: response.tracking.identifier,
        paymentMethod: response.payment.method,
        paymentStatus: response.payment.status,
        paymentMessage: response.payment.message,
      },
    });
  }

  private finishVerifiedOrder(
    verification: PublicVerifyRazorpayPaymentResponseDto,
    checkoutResponse: PublicCheckoutResponseDto,
  ): void {
    this.cart.clear();
    void this.router.navigate(['/order-success'], {
      queryParams: {
        orderNumber: verification.orderNumber,
        identifier: verification.identifier,
        paymentMethod: checkoutResponse.payment.method,
        paymentStatus: verification.paymentStatus,
        paymentMessage: verification.message,
      },
    });
  }
}
