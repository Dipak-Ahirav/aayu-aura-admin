import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProductCardComponent } from '../../shared/ui/product-card.component';
import { featuredProducts } from '../../shared/utilities/storefront-demo-data';

@Component({
  selector: 'aac-home-page',
  standalone: true,
  imports: [ProductCardComponent, RouterLink],
  template: `
    <section class="hero-section">
      <div class="hero-copy">
        <p class="eyebrow">Aayu & Aura boutique</p>
        <h1>Premium sarees styled for weddings, festivals, and graceful everyday wear.</h1>
        <p>
          Discover elegant drapes, rich fabrics, detailed borders, blouse pairings,
          and occasion-ready collections in a calm mobile-first shopping experience.
        </p>
        <div class="hero-actions">
          <a class="button primary" routerLink="/shop">Browse sarees</a>
          <a class="button secondary" routerLink="/collections">View collections</a>
        </div>
        <dl class="trust-strip">
          <div><dt>COD</dt><dd>where available</dd></div>
          <div><dt>Easy help</dt><dd>WhatsApp support</dd></div>
          <div><dt>Secure</dt><dd>clear checkout</dd></div>
        </dl>
      </div>
      <div class="hero-media" aria-label="Premium saree showcase">
        <span class="hero-badge">New festive edit</span>
        <span class="hero-caption">Large catalogue images and video slots are ready for backend content.</span>
      </div>
    </section>

    <section class="boutique-section">
      <div class="section-heading">
        <p class="eyebrow">Shop your way</p>
        <h2>Browse by category, saree type, occasion, and budget.</h2>
      </div>
      <div class="pill-grid" aria-label="Shopping shortcuts">
        @for (item of shoppingShortcuts; track item.label) {
          <a [routerLink]="item.link">
            <span>{{ item.label }}</span>
            <small>{{ item.description }}</small>
          </a>
        }
      </div>
    </section>

    <section class="boutique-section">
      <div class="section-heading row-heading">
        <div>
          <p class="eyebrow">New arrivals</p>
          <h2>Fresh drapes with rich detail and easy comparisons.</h2>
        </div>
        <a routerLink="/shop">View all</a>
      </div>
      <div class="product-grid">
        @for (product of products; track product.slug) {
          <aac-product-card [product]="product" />
        }
      </div>
    </section>

    <section class="story-reviews-grid">
      <article class="brand-story">
        <p class="eyebrow">Brand story</p>
        <h2>Curated sarees with a boutique eye for fabric, fall, and finish.</h2>
        <p>
          The customer storefront keeps the layout spacious and product-led, while
          preserving existing backend ownership of products, orders, payments, invoices,
          returns, and customer records.
        </p>
      </article>
      <article class="review-card">
        <p class="eyebrow">Customer review</p>
        <blockquote>
          The saree looked premium, the blouse details were clear, and WhatsApp support
          helped me pick the right shade for a family function.
        </blockquote>
        <span>Rated 4.9 for the festive collection</span>
      </article>
    </section>
  `,
})
export class HomePageComponent {
  protected readonly products = featuredProducts;
  protected readonly shoppingShortcuts = [
    { label: 'Silk sarees', description: 'Kanjivaram, Banarasi, soft silk', link: '/category/silk-sarees' },
    { label: 'Wedding edit', description: 'Rich zari and festive borders', link: '/collections/wedding-edit' },
    { label: 'Under Rs. 5,000', description: 'Elegant picks for gifting', link: '/shop' },
    { label: 'Party wear', description: 'Georgette, organza, shimmer', link: '/category/party-wear' },
    { label: 'New arrivals', description: 'Recently added sarees', link: '/shop' },
    { label: 'Best sellers', description: 'Customer favourites', link: '/collections/best-sellers' },
  ];
}
