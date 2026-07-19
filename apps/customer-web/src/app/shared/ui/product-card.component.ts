import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { StorefrontProduct } from '../models/storefront-demo.models';
import { formatPrice } from '../utilities/storefront-demo-data';

@Component({
  selector: 'aac-product-card',
  standalone: true,
  imports: [RouterLink],
  template: `
    <article class="product-card">
      <a class="product-media product-media-{{ product().imageTone }}" [routerLink]="['/saree', product().slug]">
        @if (product().imageUrl) {
          <img [src]="product().imageUrl" [alt]="product().name" loading="lazy">
        }
        <span class="stock-badge">{{ product().stock }}</span>
        <span class="discount-badge">{{ product().discount }}% off</span>
      </a>

      <div class="product-card-body">
        <div>
          <p class="product-meta">{{ product().sareeType }} • {{ product().fabric }}</p>
          <h3>
            <a [routerLink]="['/saree', product().slug]">{{ product().name }}</a>
          </h3>
        </div>

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
          <button type="button" aria-label="Add to wishlist">Wishlist</button>
          <button type="button">Quick view</button>
        </div>
      </div>
    </article>
  `,
})
export class ProductCardComponent {
  readonly product = input.required<StorefrontProduct>();

  protected price(value: number): string {
    return formatPrice(value);
  }
}
