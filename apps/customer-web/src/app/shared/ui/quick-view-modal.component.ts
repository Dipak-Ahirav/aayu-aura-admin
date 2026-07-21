import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { QuickViewStore } from '../../state/quick-view/quick-view.store';
import { WishlistStore } from '../../state/wishlist/wishlist.store';
import { CartStore } from '../../state/cart/cart.store';
import { formatPrice } from '../utilities/storefront-demo-data';

@Component({
  selector: 'aac-quick-view-modal',
  standalone: true,
  imports: [RouterLink],
  template: `
    @if (quickView.product(); as product) {
      <section class="quick-view-backdrop" aria-label="Quick product view" role="dialog" aria-modal="true">
        <article class="quick-view-panel">
          <button class="quick-view-close" type="button" aria-label="Close quick view" (click)="quickView.close()">×</button>

          <div class="quick-view-media product-media-{{ product.imageTone }}">
            <img [src]="product.imageUrl || fallbackImage(product.imageTone)" [alt]="product.name">
          </div>

          <div class="quick-view-copy">
            <p class="eyebrow">{{ product.sareeType }}</p>
            <h2>{{ product.name }}</h2>
            <p>{{ product.fabric }} · {{ product.colour }} · {{ product.occasion }}</p>

            <div class="detail-price-row">
              <strong>{{ price(product.priceInPaise) }}</strong>
              <span>{{ price(product.mrpInPaise) }}</span>
              <em>{{ product.discount }}% off</em>
            </div>

            <div class="rating-row">
              <span aria-hidden="true">★★★★★</span>
              <strong>{{ product.rating }}</strong>
              <small>{{ product.reviews }} reviews</small>
            </div>

            <div class="detail-grid">
              <div><span>Pattern</span><strong>{{ product.pattern }}</strong></div>
              <div><span>Availability</span><strong>{{ product.stock }}</strong></div>
              <div><span>Blouse</span><strong>Included</strong></div>
              <div><span>Delivery</span><strong>PIN code check</strong></div>
            </div>

            <div class="colour-row">
              @for (colour of product.colours; track colour) {
                <span class="colour-swatch large" [style.background]="colour"></span>
              }
            </div>

            <div class="product-cta">
              <button class="button primary" type="button" [disabled]="product.stock === 'Out of stock'" (click)="cart.add(product)">
                {{ product.stock === 'Out of stock' ? 'Sold out' : 'Add to cart' }}
              </button>
              <button class="button secondary" type="button" (click)="wishlist.toggle(product)">
                {{ wishlist.isSaved(product.slug) ? 'Remove wishlist' : 'Add wishlist' }}
              </button>
              <a class="button whatsapp" href="https://wa.me/" target="_blank" rel="noreferrer">WhatsApp enquiry</a>
              <a class="button secondary" [routerLink]="['/saree', product.slug]" (click)="quickView.close()">View full details</a>
            </div>
          </div>
        </article>
      </section>
    }
  `,
})
export class QuickViewModalComponent {
  protected readonly quickView = inject(QuickViewStore);
  protected readonly wishlist = inject(WishlistStore);
  protected readonly cart = inject(CartStore);

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
}
