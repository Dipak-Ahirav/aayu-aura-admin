import { Component } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ProductCardComponent } from '../../shared/ui/product-card.component';
import { featuredProducts, storefrontFilters } from '../../shared/utilities/storefront-demo-data';

@Component({
  selector: 'aac-catalogue-page',
  standalone: true,
  imports: [ProductCardComponent, ReactiveFormsModule],
  template: `
    <section class="catalogue-shell">
      <header class="catalogue-header">
        <div>
          <p class="eyebrow">Catalogue</p>
          <h1>Shop sarees</h1>
          <p>Filter by fabric, colour, size, occasion, price, discount, and availability.</p>
        </div>
        <label class="compact-field">
          <span>Sort</span>
          <select [formControl]="sort">
            <option>Featured</option>
            <option>Newest</option>
            <option>Price: low to high</option>
            <option>Price: high to low</option>
            <option>Highest discount</option>
            <option>Highest rated</option>
          </select>
        </label>
      </header>

      <div class="catalogue-layout">
        <aside class="filter-panel" aria-label="Product filters">
          <div class="filter-panel-title">
            <h2>Filters</h2>
            <button type="button">Clear all</button>
          </div>
          @for (filter of filters; track filter.label) {
            <section>
              <h3>{{ filter.label }}</h3>
              @for (value of filter.values; track value) {
                <label class="check-row">
                  <input type="checkbox">
                  <span>{{ value }}</span>
                </label>
              }
            </section>
          }
        </aside>

        <div>
          <div class="applied-row">
            <span>124 sarees</span>
            <span>In stock</span>
            <span>COD available</span>
            <span>Mobile quick filters ready</span>
          </div>
          <div class="product-grid">
            @for (product of products; track product.slug) {
              <aac-product-card [product]="product" />
            }
          </div>
        </div>
      </div>
    </section>
  `,
})
export class CataloguePageComponent {
  protected readonly filters = storefrontFilters;
  protected readonly products = featuredProducts;
  protected readonly sort = new FormControl('Featured', { nonNullable: true });
}
