import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProductCardComponent } from '../../shared/ui/product-card.component';
import { featuredProducts, formatPrice } from '../../shared/utilities/storefront-demo-data';

@Component({
  selector: 'aac-product-detail-page',
  standalone: true,
  imports: [ProductCardComponent, RouterLink],
  template: `
    <section class="product-detail-shell">
      <div class="media-gallery">
        <div class="main-product-media product-media-{{ product.imageTone }}">
          <span>Zoom-ready image area</span>
        </div>
        <div class="thumb-row" aria-label="Product media">
          <button type="button">Front</button>
          <button type="button">Border</button>
          <button type="button">Fabric close-up</button>
          <button type="button">Video</button>
        </div>
      </div>

      <article class="product-info-panel">
        <p class="eyebrow">{{ product.category }}</p>
        <h1>{{ product.name }}</h1>
        <div class="rating-row">
          <span aria-hidden="true">★★★★★</span>
          <strong>{{ product.rating }}</strong>
          <small>{{ product.reviews }} reviews</small>
        </div>
        <div class="detail-price-row">
          <strong>{{ price(product.priceInPaise) }}</strong>
          <span>{{ price(product.mrpInPaise) }}</span>
          <em>{{ product.discount }}% off</em>
        </div>
        <p class="stock-line">{{ product.stock }} • Delivery estimate available by PIN code • COD availability checked at checkout</p>

        <div class="option-section">
          <h2>Colour options</h2>
          <div class="colour-row">
            @for (colour of product.colours; track colour) {
              <button class="colour-swatch large" type="button" [style.background]="colour" aria-label="Colour option"></button>
            }
          </div>
        </div>

        <div class="detail-grid">
          <div><span>Fabric</span><strong>{{ product.fabric }}</strong></div>
          <div><span>Saree length</span><strong>5.5 m</strong></div>
          <div><span>Blouse</span><strong>0.8 m included</strong></div>
          <div><span>Pattern</span><strong>{{ product.pattern }}</strong></div>
        </div>

        <div class="product-cta">
          <button class="button primary" type="button">Add to cart</button>
          <button class="button secondary" type="button">Wishlist</button>
          <a class="button whatsapp" href="https://wa.me/" target="_blank" rel="noreferrer">WhatsApp enquiry</a>
        </div>
      </article>
    </section>

    <section class="boutique-section detail-tabs">
      <article>
        <h2>Details</h2>
        <p>Soft drape, premium finish, elegant border, and occasion-ready styling.</p>
      </article>
      <article>
        <h2>Care instructions</h2>
        <p>Dry clean recommended. Store folded in a breathable saree cover.</p>
      </article>
      <article>
        <h2>Size chart</h2>
        <p>Standard saree length with blouse piece. Alteration guidance can be shown from backend content.</p>
      </article>
    </section>

    <section class="boutique-section">
      <div class="section-heading row-heading">
        <div>
          <p class="eyebrow">Complete the look</p>
          <h2>Related and recommended sarees.</h2>
        </div>
        <a routerLink="/shop">More options</a>
      </div>
      <div class="product-grid">
        @for (item of relatedProducts; track item.slug) {
          <aac-product-card [product]="item" />
        }
      </div>
    </section>
  `,
})
export class ProductDetailPageComponent {
  readonly productSlug = input<string>();
  protected readonly product = featuredProducts[0];
  protected readonly relatedProducts = featuredProducts.slice(1);

  protected price(value: number): string {
    return formatPrice(value);
  }
}
