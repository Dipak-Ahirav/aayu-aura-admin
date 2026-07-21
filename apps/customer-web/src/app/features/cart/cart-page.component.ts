import { Component, DestroyRef, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { debounceTime } from 'rxjs';
import type { PublicCartQuoteDto, PublicCartQuoteLineDto } from '@aayu-aura/shared-types';
import { formatPrice } from '../../shared/utilities/storefront-demo-data';
import { CartStore } from '../../state/cart/cart.store';
import type { CartLine } from '../../state/cart/cart.store';
import { WishlistStore } from '../../state/wishlist/wishlist.store';
import { CartQuoteService } from './cart-quote.service';

@Component({
  selector: 'aac-cart-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <section class="checkout-layout">
      <div class="cart-panel">
        <p class="eyebrow">Cart</p>
        <h1>Your cart</h1>
        <p class="cart-intro">Live pricing, stock, delivery, and discounts are checked against the backend before checkout.</p>

        @if (cart.items().length === 0) {
          <div class="empty-state cart-empty-state">
            <strong>Your cart is empty</strong>
            <span>Explore fresh sarees, save favourites, and come back to checkout when ready.</span>
            <a class="button primary" routerLink="/shop">Continue shopping</a>
          </div>
        } @else {
          @if (loading()) {
            <div class="cart-message-list">
              <span>Refreshing live price and stock...</span>
            </div>
          }

          @if (quote(); as cartQuote) {
          @if (cartQuote.messages.length > 0) {
            <div class="cart-message-list">
              @for (message of cartQuote.messages; track message) {
                <span>{{ message }}</span>
              }
            </div>
          }

          @if (cartQuote.items.length > 0) {
          <div class="cart-line-list">
            @for (line of cartQuote.items; track line.productSlug) {
              <article class="cart-line">
                <a class="mini-media product-media-{{ line.imageTone ?? 'wine' }}" [routerLink]="['/saree', line.productSlug]">
                  <img [src]="line.image?.url || fallbackImage(line.imageTone)" [alt]="line.name" loading="lazy">
                </a>
                <div class="cart-line-copy">
                  <span class="stock-badge inline">{{ line.stockMessage }}</span>
                  <h2><a [routerLink]="['/saree', line.productSlug]">{{ line.name }}</a></h2>
                  <p>{{ line.category || 'Boutique saree' }} | {{ line.productCode }}</p>
                  @if (line.isQuantityAdjusted) {
                    <small>Quantity adjusted to available stock.</small>
                  }
                  <div class="cart-line-actions">
                    <button type="button" (click)="moveToWishlist(line)">Move to wishlist</button>
                    <button type="button" (click)="cart.remove(line.productSlug)">Remove</button>
                  </div>
                </div>
                <div class="quantity-stepper" aria-label="Quantity">
                  <button type="button" (click)="decrease(line)">-</button>
                  <span>{{ line.quantity }}</span>
                  <button type="button" [disabled]="line.quantity >= line.availableStock" (click)="increase(line)">+</button>
                </div>
                <div class="cart-line-price">
                  <strong>{{ price(line.lineTotalInPaise) }}</strong>
                  @if (line.lineDiscountInPaise > 0) {
                    <span>You save {{ price(line.lineDiscountInPaise) }}</span>
                  }
                </div>
              </article>
            }
          </div>
          } @else {
            <div class="cart-line-list">
              @for (line of cart.items(); track line.productSlug) {
                <article class="cart-line">
                  <a class="mini-media product-media-{{ line.imageTone ?? 'wine' }}" [routerLink]="['/saree', line.productSlug]">
                    <img [src]="line.imageUrl || fallbackImage(line.imageTone)" [alt]="line.name" loading="lazy">
                  </a>
                  <div class="cart-line-copy">
                    <span class="stock-badge inline">{{ line.stock || 'Added to cart' }}</span>
                    <h2><a [routerLink]="['/saree', line.productSlug]">{{ line.name }}</a></h2>
                    <p>{{ line.productCode || 'Product details pending live quote' }}</p>
                    <small>Live quote unavailable for this item. You can remove it or refresh after the API syncs.</small>
                    <div class="cart-line-actions">
                      <button type="button" (click)="cart.remove(line.productSlug)">Remove</button>
                    </div>
                  </div>
                  <div class="quantity-stepper" aria-label="Quantity">
                    <button type="button" (click)="decreaseLocal(line)">-</button>
                    <span>{{ line.quantity }}</span>
                    <button type="button" (click)="increaseLocal(line)">+</button>
                  </div>
                  <div class="cart-line-price">
                    <strong>{{ price(localLineTotal(line)) }}</strong>
                    <span>Local cart price</span>
                  </div>
                </article>
              }
            </div>
          }

          @if (cartQuote.unavailableItems.length > 0) {
            <div class="empty-state">
              <strong>{{ cartQuote.unavailableItems.length }} unavailable item(s)</strong>
              <span>These products are no longer available in the live catalogue and were excluded from totals.</span>
            </div>
          }
          } @else {
            <div class="cart-message-list">
              <span>Live cart quote is unavailable. Showing saved cart items.</span>
            </div>
            <div class="cart-line-list">
              @for (line of cart.items(); track line.productSlug) {
                <article class="cart-line">
                  <a class="mini-media product-media-{{ line.imageTone ?? 'wine' }}" [routerLink]="['/saree', line.productSlug]">
                    <img [src]="line.imageUrl || fallbackImage(line.imageTone)" [alt]="line.name" loading="lazy">
                  </a>
                  <div class="cart-line-copy">
                    <span class="stock-badge inline">{{ line.stock || 'Added to cart' }}</span>
                    <h2><a [routerLink]="['/saree', line.productSlug]">{{ line.name }}</a></h2>
                    <p>{{ line.productCode || 'Product details pending live quote' }}</p>
                    <div class="cart-line-actions">
                      <button type="button" (click)="cart.remove(line.productSlug)">Remove</button>
                      <button type="button" (click)="quoteCart()">Refresh quote</button>
                    </div>
                  </div>
                  <div class="quantity-stepper" aria-label="Quantity">
                    <button type="button" (click)="decreaseLocal(line)">-</button>
                    <span>{{ line.quantity }}</span>
                    <button type="button" (click)="increaseLocal(line)">+</button>
                  </div>
                  <div class="cart-line-price">
                    <strong>{{ price(localLineTotal(line)) }}</strong>
                    <span>Local cart price</span>
                  </div>
                </article>
              }
            </div>
          }
        }
      </div>

      <aside class="summary-panel">
        <h2>Price breakdown</h2>
        @if (hasPricedQuote()) {
          @if (quote(); as cartQuote) {
          <dl>
            <div><dt>MRP total</dt><dd>{{ price(cartQuote.subtotalInPaise) }}</dd></div>
            <div><dt>Product discount</dt><dd>- {{ price(cartQuote.productDiscountInPaise) }}</dd></div>
            <div><dt>Coupon discount</dt><dd>- {{ price(cartQuote.couponDiscountInPaise) }}</dd></div>
            <div><dt>Shipping</dt><dd>{{ cartQuote.shippingChargeInPaise === 0 ? 'Free' : price(cartQuote.shippingChargeInPaise) }}</dd></div>
            <div><dt>Tax</dt><dd>Included {{ price(cartQuote.taxIncludedInPaise) }}</dd></div>
            <div><dt>Total</dt><dd>{{ price(cartQuote.totalInPaise) }}</dd></div>
          </dl>
          <p>{{ cartQuote.deliveryEstimate }}</p>
          <p>{{ cartQuote.codAvailable ? 'COD available for this cart where serviceable.' : 'COD may not be available for this cart.' }}</p>
          }
        } @else {
          <dl>
            <div><dt>MRP total</dt><dd>{{ price(localTotal()) }}</dd></div>
            <div><dt>Product discount</dt><dd>- {{ price(0) }}</dd></div>
            <div><dt>Coupon discount</dt><dd>- {{ price(0) }}</dd></div>
            <div><dt>Shipping</dt><dd>Calculated after live quote</dd></div>
            <div><dt>Tax</dt><dd>Included after live quote</dd></div>
            <div><dt>Total</dt><dd>{{ price(localTotal()) }}</dd></div>
          </dl>
          <p>Saved cart details are shown locally. Refresh quote for live stock and checkout totals.</p>
        }
        <label class="field">
          <span>Coupon code</span>
          <input [formControl]="couponCode" placeholder="AAURA10">
        </label>
        <label class="field">
          <span>Delivery PIN code</span>
          <input [formControl]="pinCode" inputmode="numeric" placeholder="400001">
        </label>
        <button type="button" (click)="quoteCart()">Apply / refresh</button>
        <a class="button primary" [class.is-disabled]="!canCheckout()" routerLink="/checkout">Guest checkout</a>
        <a class="button secondary" routerLink="/login">Login and checkout</a>
        <button type="button" [disabled]="cart.items().length === 0" (click)="cart.clear()">Clear cart</button>
      </aside>
    </section>
  `,
})
export class CartPageComponent {
  protected readonly cart = inject(CartStore);
  private readonly wishlist = inject(WishlistStore);
  private readonly quoteService = inject(CartQuoteService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly couponCode = new FormControl('', { nonNullable: true });
  protected readonly pinCode = new FormControl('', { nonNullable: true });
  protected readonly quote = signal<PublicCartQuoteDto | null>(null);
  protected readonly loading = signal(false);

  constructor() {
    effect(() => {
      this.cart.items();
      queueMicrotask(() => this.quoteCart());
    });

    this.couponCode.valueChanges
      .pipe(debounceTime(300), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.quoteCart());
    this.pinCode.valueChanges
      .pipe(debounceTime(300), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.quoteCart());
  }

  protected price(value: number): string {
    return formatPrice(value);
  }

  protected quoteCart(): void {
    const items = this.cart.items();
    if (items.length === 0) {
      this.quote.set(null);
      return;
    }

    this.loading.set(true);
    this.quoteService
      .quote({
        items: items.map((item) => ({
          productId: item.productId,
          productSlug: item.productSlug,
          productCode: item.productCode,
          quantity: item.quantity,
        })),
        couponCode: this.couponCode.value || undefined,
        pinCode: this.pinCode.value || undefined,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((quote) => {
        this.loading.set(false);
        this.quote.set(quote);
        if (quote?.items.length) {
          this.cart.syncQuotedLines(quote.items);
        }
      });
  }

  protected increase(line: PublicCartQuoteLineDto): void {
    this.cart.updateQuantity(line.productSlug, line.quantity + 1);
  }

  protected decrease(line: PublicCartQuoteLineDto): void {
    this.cart.updateQuantity(line.productSlug, line.quantity - 1);
  }

  protected increaseLocal(line: CartLine): void {
    this.cart.updateQuantity(line.productSlug, line.quantity + 1);
  }

  protected decreaseLocal(line: CartLine): void {
    this.cart.updateQuantity(line.productSlug, line.quantity - 1);
  }

  protected localLineTotal(line: CartLine): number {
    return line.quantity * line.unitPriceInPaise;
  }

  protected localTotal(): number {
    return this.cart.items().reduce((total, line) => total + this.localLineTotal(line), 0);
  }

  protected moveToWishlist(line: PublicCartQuoteLineDto): void {
    this.wishlist.toggle({
      id: line.productId,
      productCode: line.productCode,
      slug: line.productSlug,
      name: line.name,
      category: line.category ?? 'Sarees',
      sareeType: line.category ?? 'Saree',
      fabric: 'Premium fabric',
      colour: 'Boutique colour',
      pattern: 'Elegant border',
      occasion: 'Occasion wear',
      priceInPaise: line.unitPriceInPaise,
      mrpInPaise: line.mrpInPaise ?? line.unitPriceInPaise,
      discount: line.discountPercentage ?? 0,
      rating: 4.6,
      reviews: 0,
      stock: line.stockMessage.includes('Out') ? 'Out of stock' : 'In stock',
      imageUrl: line.image?.url,
      imageTone: line.imageTone ?? 'wine',
      colours: ['#7a1f32', '#b98b2d', '#fffaf1'],
    });
    this.cart.remove(line.productSlug);
  }

  protected canCheckout(): boolean {
    return this.hasPricedQuote();
  }

  protected hasPricedQuote(): boolean {
    return Boolean(this.quote()?.items.length);
  }

  protected fallbackImage(tone?: string): string {
    const images: Record<string, string> = {
      emerald: '/images/home/emerald-saree-model.png',
      ivory: '/images/home/ivory-saree-model.png',
      plum: '/images/home/plum-saree-model.png',
      wine: '/images/home/hero-saree-model.png',
    };
    return images[tone ?? 'wine'] ?? images['wine'];
  }
}
