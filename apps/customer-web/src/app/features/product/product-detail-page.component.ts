import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map, switchMap } from 'rxjs';
import type {
  CustomerAvailabilityStatus,
  PublicProductCardDto,
  PublicProductDetailDto,
} from '@aayu-aura/shared-types';
import { ProductCardComponent } from '../../shared/ui/product-card.component';
import { StorefrontProduct } from '../../shared/models/storefront-demo.models';
import { formatPrice } from '../../shared/utilities/storefront-demo-data';
import { WishlistStore } from '../../state/wishlist/wishlist.store';
import { ProductDetailService } from './product-detail.service';

@Component({
  selector: 'aac-product-detail-page',
  standalone: true,
  imports: [AsyncPipe, ProductCardComponent, RouterLink],
  template: `
    @if (product$ | async; as product) {
      @if (product) {
        <section class="product-detail-shell premium-product-detail">
          <div class="media-gallery">
            <div class="main-product-media product-media-{{ product.imageTone ?? 'wine' }}">
              @if (product.images[0]?.url; as imageUrl) {
                <img [src]="imageUrl" [alt]="product.images[0]?.altText ?? product.name">
              }
              <span class="media-badge">Zoom-ready gallery</span>
            </div>
            <div class="thumb-row" aria-label="Product media">
              @for (image of product.images; track image.altText) {
                <button type="button">{{ image.sortOrder === 3 ? 'Fabric close-up' : image.sortOrder === 2 ? 'Border' : 'Front' }}</button>
              }
              <button type="button">Video</button>
            </div>
          </div>

          <article class="product-info-panel">
            <p class="eyebrow">{{ product.category ?? product.sareeType }}</p>
            <h1>{{ product.name }}</h1>
            <div class="rating-row">
              <span aria-hidden="true">★★★★★</span>
              <strong>{{ product.averageRating ?? 4.6 }}</strong>
              <small>{{ product.reviewCount ?? 0 }} reviews</small>
            </div>
            <div class="detail-price-row">
              <strong>{{ price(product.offerPriceInPaise ?? product.sellingPriceInPaise) }}</strong>
              @if (product.mrpInPaise) {
                <span>{{ price(product.mrpInPaise) }}</span>
              }
              @if (product.discountPercentage) {
                <em>{{ product.discountPercentage }}% off</em>
              }
            </div>
            <p class="stock-line">
              {{ stockText(product.availability) }} • {{ product.deliveryEstimate }} •
              {{ product.codAvailable ? 'COD available where serviceable' : 'COD not available' }}
            </p>

            <div class="option-section">
              <h2>Colour options</h2>
              <div class="colour-row">
                @for (colour of product.colours; track colour) {
                  <button class="colour-swatch large" type="button" [style.background]="colour" aria-label="Colour option"></button>
                }
              </div>
            </div>

            <div class="detail-grid">
              <div><span>Fabric</span><strong>{{ product.fabric ?? 'Premium fabric' }}</strong></div>
              <div><span>Saree length</span><strong>{{ product.sareeLength }}</strong></div>
              <div><span>Blouse</span><strong>{{ product.blouseDetails }}</strong></div>
              <div><span>Pattern</span><strong>{{ product.pattern ?? product.work }}</strong></div>
              <div><span>Occasion</span><strong>{{ product.occasion ?? 'Festive' }}</strong></div>
              <div><span>Return</span><strong>{{ product.returnWindow }}</strong></div>
            </div>

            <div class="product-cta">
              <button class="button primary" type="button">Add to cart</button>
              <button class="button secondary" type="button" (click)="wishlist.toggle(cardFromDetail(product))">
                {{ wishlist.isSaved(product.slug) ? 'Remove wishlist' : 'Add wishlist' }}
              </button>
              <a class="button whatsapp" [href]="whatsappLink(product)" target="_blank" rel="noreferrer">WhatsApp enquiry</a>
            </div>
          </article>
        </section>

        <section class="boutique-section product-story-grid">
          <article class="product-story-card">
            <p class="eyebrow">Product details</p>
            <h2>Fabric, fall, and finish</h2>
            <p>{{ product.description }}</p>
          </article>
          <article class="product-story-card">
            <p class="eyebrow">Care</p>
            <h2>Keep it beautiful</h2>
            <p>{{ product.careInstructions }}</p>
          </article>
          <article class="product-story-card">
            <p class="eyebrow">Blouse</p>
            <h2>Included blouse piece</h2>
            <p>{{ product.blouseDetails }}</p>
          </article>
        </section>

        <section class="boutique-section detail-tabs">
          <article>
            <h2>Size chart</h2>
            <div class="size-chart-grid">
              @for (item of product.sizeChart ?? []; track item.label) {
                <div><span>{{ item.label }}</span><strong>{{ item.value }}</strong></div>
              }
            </div>
          </article>
          <article>
            <h2>Delivery & payment</h2>
            <p>{{ product.deliveryEstimate }}</p>
            <p>{{ product.codAvailable ? 'Cash on delivery is available where courier service supports it.' : 'Prepaid payment is required for this saree.' }}</p>
          </article>
          <article>
            <h2>Reviews</h2>
            <p>{{ product.reviewCount ?? 0 }} customers reviewed this saree with an average rating of {{ product.averageRating ?? 4.6 }}.</p>
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
            @for (item of relatedProducts(product); track item.slug) {
              <aac-product-card [product]="item" />
            }
          </div>
        </section>
      } @else {
        <section class="page-shell">
          <p class="eyebrow">Product unavailable</p>
          <h1>This saree is not available</h1>
          <p>The product may be archived or not synced yet. Browse the live shop catalogue for available sarees.</p>
          <a class="button primary" routerLink="/shop">Browse shop</a>
        </section>
      }
    } @else {
      <section class="page-shell">
        <p class="eyebrow">Loading</p>
        <h1>Loading saree details</h1>
        <p>Fetching product, stock, pricing, and delivery details from the API.</p>
      </section>
    }
  `,
})
export class ProductDetailPageComponent {
  private readonly productDetail = inject(ProductDetailService);
  private readonly route = inject(ActivatedRoute);
  protected readonly wishlist = inject(WishlistStore);
  protected readonly product$ = this.route.paramMap.pipe(
    map((params) => params.get('productSlug') ?? ''),
    switchMap((slug) => this.productDetail.get(slug)),
  );

  protected price(value: number): string {
    return formatPrice(value);
  }

  protected stockText(status: CustomerAvailabilityStatus): string {
    if (status === 'out_of_stock' || status === 'coming_soon') return 'Out of stock';
    if (status === 'only_few_left') return 'Only a few left';
    return 'In stock';
  }

  protected whatsappLink(product: PublicProductDetailDto): string {
    return `https://wa.me/?text=${encodeURIComponent(`I want to enquire about ${product.name}`)}`;
  }

  protected relatedProducts(product: PublicProductDetailDto): StorefrontProduct[] {
    return (product.relatedProducts ?? []).map((item) => this.cardFromDto(item));
  }

  protected cardFromDetail(product: PublicProductDetailDto): StorefrontProduct {
    return this.cardFromDto(product);
  }

  private cardFromDto(product: PublicProductCardDto): StorefrontProduct {
    return {
      slug: product.slug,
      name: product.name,
      category: product.category ?? product.sareeType ?? 'Sarees',
      sareeType: product.sareeType ?? product.category ?? 'Designer saree',
      fabric: product.fabric ?? 'Premium fabric',
      colour: product.primaryColour ?? 'Boutique colour',
      pattern: product.pattern ?? 'Elegant border',
      occasion: product.occasion ?? 'Occasion wear',
      priceInPaise: product.offerPriceInPaise ?? product.sellingPriceInPaise,
      mrpInPaise: product.mrpInPaise ?? product.sellingPriceInPaise,
      discount: product.discountPercentage ?? 0,
      rating: product.averageRating ?? 4.6,
      reviews: product.reviewCount ?? 0,
      stock: this.stockText(product.availability) as StorefrontProduct['stock'],
      imageUrl: product.coverImage?.url,
      imageTone: product.imageTone ?? 'wine',
      colours: product.colours ?? ['#7a1f32', '#b98b2d', '#fffaf1'],
    };
  }
}
