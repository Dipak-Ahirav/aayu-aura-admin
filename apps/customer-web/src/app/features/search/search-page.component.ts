import { Component } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ProductCardComponent } from '../../shared/ui/product-card.component';
import { featuredProducts, storefrontFilters } from '../../shared/utilities/storefront-demo-data';

@Component({
  selector: 'aac-search-page',
  standalone: true,
  imports: [ProductCardComponent, ReactiveFormsModule],
  template: `
    <section class="search-shell">
      <div class="search-hero">
        <p class="eyebrow">Advanced search</p>
        <h1>Find the right fabric, colour, and occasion faster.</h1>
        <label class="search-box">
          <span class="sr-only">Search sarees</span>
          <input [formControl]="query" type="search" placeholder="Search silk, maroon, wedding, Banarasi">
          <button type="button">Search</button>
        </label>
        <div class="suggestion-row" aria-label="Popular searches">
          @for (term of popularSearches; track term) {
            <button type="button">{{ term }}</button>
          }
        </div>
      </div>

      <div class="catalogue-layout">
        <aside class="filter-panel" aria-label="Search filters">
          @for (filter of filters; track filter.label) {
            <section>
              <h3>{{ filter.label }}</h3>
              @for (value of filter.values.slice(0, 4); track value) {
                <label class="check-row">
                  <input type="checkbox">
                  <span>{{ value }}</span>
                </label>
              }
            </section>
          }
        </aside>
        <div class="product-grid">
          @for (product of products; track product.slug) {
            <aac-product-card [product]="product" />
          }
        </div>
      </div>
    </section>
  `,
})
export class SearchPageComponent {
  readonly query = new FormControl('', { nonNullable: true });
  protected readonly filters = storefrontFilters;
  protected readonly products = featuredProducts.slice(0, 3);
  protected readonly popularSearches = ['Wedding silk', 'Ivory saree', 'Under Rs. 5,000', 'COD available'];
}
