import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PublicHomepageProductDto } from '@aayu-aura/shared-types';
import { StorefrontProduct } from '../../shared/models/storefront-demo.models';
import { ProductCardComponent } from '../../shared/ui/product-card.component';
import { featuredProducts } from '../../shared/utilities/storefront-demo-data';
import { HomeService } from './home.service';

@Component({
  selector: 'aac-home-page',
  standalone: true,
  imports: [AsyncPipe, ProductCardComponent, RouterLink],
  template: `
    @if (homepage$ | async; as homepage) {
    <section class="hero-section">
      <div class="hero-copy">
        <p class="eyebrow">{{ homepage.hero.eyebrow }}</p>
        <h1>{{ homepage.hero.title }}</h1>
        <p>{{ homepage.hero.description }}</p>
        <div class="hero-actions">
          <a class="button primary" [routerLink]="homepage.hero.primaryCta.link">
            {{ homepage.hero.primaryCta.label }}
          </a>
          <a class="button secondary" [routerLink]="homepage.hero.secondaryCta.link">
            {{ homepage.hero.secondaryCta.label }}
          </a>
        </div>
        <dl class="trust-strip">
          <div><dt>COD</dt><dd>where available</dd></div>
          <div><dt>Easy help</dt><dd>WhatsApp support</dd></div>
          <div><dt>Secure</dt><dd>clear checkout</dd></div>
        </dl>
      </div>
      <div class="hero-media product-media-{{ homepage.hero.imageTone }}" aria-label="Premium saree showcase">
        <img class="hero-model-image" src="/images/home/hero-saree-model.png" alt="Model wearing a wine silk saree" fetchpriority="high">
        <span class="hero-badge">{{ homepage.hero.badge }}</span>
        <span class="hero-caption">Silk textures, rich borders, and standout product imagery.</span>
      </div>
    </section>

    <section class="boutique-section">
      <div class="section-heading">
        <p class="eyebrow">Shop your way</p>
        <h2>Browse by category, saree type, occasion, and budget.</h2>
      </div>
      <div class="pill-grid" aria-label="Shopping shortcuts">
        @for (item of homepage.shortcuts; track item.label) {
          <a [routerLink]="item.link">
            <span>{{ item.label }}</span>
            <small>{{ item.description }}</small>
          </a>
        }
      </div>
    </section>

    @if (homepage.categories.length > 0) {
      <section class="boutique-section">
        <div class="section-heading">
          <p class="eyebrow">Curated categories</p>
          <h2>Shop the latest saree categories from the live catalogue.</h2>
        </div>
        <div class="pill-grid category-pills" aria-label="Dynamic categories">
          @for (category of homepage.categories; track category.label) {
            <a [routerLink]="category.link">
              <span>{{ category.label }}</span>
              <small>{{ category.description }}</small>
            </a>
          }
        </div>
      </section>
    }

    <section class="boutique-section">
      <div class="section-heading row-heading">
        <div>
          <p class="eyebrow">New arrivals</p>
          <h2>Fresh drapes with rich detail and easy comparisons.</h2>
        </div>
        <a routerLink="/shop">View all</a>
      </div>
      <div class="product-grid">
        @for (product of productCards(homepage.newArrivals); track product.slug) {
          <aac-product-card [product]="product" />
        }
      </div>
    </section>

    <section class="boutique-section">
      <div class="section-heading row-heading">
        <div>
          <p class="eyebrow">Best sellers</p>
          <h2>Customer favourites with bold product imagery and clear stock badges.</h2>
        </div>
        <a routerLink="/collections/best-sellers">View collection</a>
      </div>
      <div class="product-grid">
        @for (product of productCards(homepage.bestSellers); track product.slug) {
          <aac-product-card [product]="product" />
        }
      </div>
    </section>

    <section class="story-reviews-grid">
      <article class="brand-story">
        <p class="eyebrow">Brand story</p>
        <h2>{{ homepage.brandStory.title }}</h2>
        <p>{{ homepage.brandStory.description }}</p>
      </article>
      <article class="review-card">
        <p class="eyebrow">Customer review</p>
        @for (review of homepage.reviews; track review.customerName) {
          <blockquote>{{ review.quote }}</blockquote>
          <span>{{ review.customerName }} • Rated {{ review.rating }}</span>
        }
      </article>
    </section>
    } @else {
      <section class="page-shell">
        <p class="eyebrow">Loading issue</p>
        <h1>Homepage data is unavailable</h1>
        <p>Start the API and MongoDB connection, then refresh the storefront.</p>
      </section>
    }
  `,
})
export class HomePageComponent {
  private readonly homeService = inject(HomeService);
  protected readonly homepage$ = this.homeService.getHomepage();

  protected productCards(products: PublicHomepageProductDto[]): StorefrontProduct[] {
    const source = products.length > 0 ? products : [];
    return source.map((product, index) => ({
      slug: product.slug,
      name: product.name,
      category: product.category ?? 'Sarees',
      sareeType: product.sareeType ?? product.category ?? 'Saree',
      fabric: product.fabric ?? 'Premium fabric',
      colour: product.primaryColour ?? 'Boutique colour',
      pattern: product.pattern ?? 'Elegant drape',
      occasion: product.occasion ?? 'Festive',
      priceInPaise: product.sellingPriceInPaise,
      mrpInPaise: product.mrpInPaise ?? product.sellingPriceInPaise,
      discount: product.discountPercentage ?? 0,
      rating: product.rating,
      reviews: product.reviewCount,
      stock: this.stockLabel(product.availability),
      imageUrl: product.imageUrl,
      imageTone: product.imageTone ?? featuredProducts[index % featuredProducts.length].imageTone,
      colours: product.colours,
    }));
  }

  private stockLabel(value: PublicHomepageProductDto['availability']): StorefrontProduct['stock'] {
    if (value === 'out_of_stock') return 'Out of stock';
    if (value === 'only_few_left') return 'Only a few left';
    return 'In stock';
  }
}
