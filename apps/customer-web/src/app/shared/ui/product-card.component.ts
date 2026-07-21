import { Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { QuickViewStore } from '../../state/quick-view/quick-view.store';
import { WishlistStore } from '../../state/wishlist/wishlist.store';
import { CartStore } from '../../state/cart/cart.store';
import { StorefrontProduct } from '../models/storefront-demo.models';
import { formatPrice } from '../utilities/storefront-demo-data';

@Component({
  selector: 'aac-product-card',
  standalone: true,
  imports: [RouterLink],
  template: `
    <article class="product-card">
      <a class="product-media product-media-{{ product().imageTone }}" [routerLink]="['/saree', product().slug]">
        <img [src]="product().imageUrl || fallbackImage(product().imageTone)" [alt]="product().name" loading="lazy">
        <span class="saree-fold fold-one"></span>
        <span class="saree-fold fold-two"></span>
        <span class="saree-border"></span>
        <span class="stock-badge">{{ product().stock }}</span>
        <span class="discount-badge">{{ product().discount }}% off</span>
        <span class="quick-view-overlay">View details</span>
      </a>

      <div class="product-card-body">
        <p class="product-meta">{{ product().sareeType }} · {{ product().fabric }}</p>
        <h3>
          <a [routerLink]="['/saree', product().slug]">{{ product().name }}</a>
        </h3>

        <div class="price-row">
          <strong>{{ price(product().priceInPaise) }}</strong>
          <span>{{ price(product().mrpInPaise) }}</span>
        </div>

        <div class="rating-row" aria-label="Rating and reviews">
          <span aria-hidden="true">★★★★★</span>
          <strong>{{ product().rating }}</strong>
          <small>({{ product().reviews }})</small>
        </div>

        <div class="colour-row" aria-label="Available colours">
          @for (colour of product().colours; track colour) {
            <span class="colour-swatch" [style.background]="colour"></span>
          }
        </div>

        <div class="product-actions">
          <button type="button" [attr.aria-label]="wishlist.isSaved(product().slug) ? 'Remove from wishlist' : 'Add to wishlist'" (click)="toggleWishlist()">
            {{ wishlist.isSaved(product().slug) ? '♥ Saved' : '♡ Wishlist' }}
          </button>
          <button type="button" [disabled]="product().stock === 'Out of stock'" (click)="addToCart($event)">
            {{ product().stock === 'Out of stock' ? 'Sold out' : 'Add cart' }}
          </button>
          <button type="button" (click)="openQuickView()">Quick view</button>
        </div>
      </div>
    </article>
  `,
})
export class ProductCardComponent {
  readonly product = input.required<StorefrontProduct>();
  protected readonly wishlist = inject(WishlistStore);
  protected readonly cart = inject(CartStore);
  private readonly quickView = inject(QuickViewStore);

  protected price(value: number): string {
    return formatPrice(value);
  }

  protected fallbackImage(tone: string): string {
    const images: Record<string, string> = {
      emerald: '/images/home/emerald-saree-model.png',
      ivory: '/images/home/ivory-saree-model.png',
      plum: '/images/home/plum-saree-model.png',
      wine: '/images/home/hero-saree-model.png',
    };

    return images[tone] ?? images['wine'];
  }

  protected toggleWishlist(): void {
    this.wishlist.toggle(this.product());
  }

  protected openQuickView(): void {
    this.quickView.open(this.product());
  }

  protected addToCart(event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    this.cart.add(this.product());
  }
}
