import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { QuickViewStore } from '../../state/quick-view/quick-view.store';
import { WishlistStore } from '../../state/wishlist/wishlist.store';
import { ProductCardComponent } from '../../shared/ui/product-card.component';

@Component({
  selector: 'aac-wishlist-page',
  standalone: true,
  imports: [ProductCardComponent, RouterLink],
  template: `
    <section class="catalogue-shell">
      <header class="catalogue-header">
        <div>
          <p class="eyebrow">Wishlist</p>
          <h1>Saved sarees</h1>
          <p>{{ wishlist.count() }} saved item(s). Your wishlist is saved in this browser.</p>
        </div>
        @if (wishlist.count() > 0) {
          <button class="button secondary" type="button" (click)="wishlist.clear()">Clear wishlist</button>
        }
      </header>

      @if (wishlist.count() > 0) {
        <div class="product-grid">
          @for (product of wishlist.items(); track product.slug) {
            <aac-product-card [product]="product" />
          }
        </div>
      } @else {
        <div class="empty-state wishlist-empty">
          <strong>No sarees saved yet</strong>
          <span>Use the wishlist button on any product card to save your favourites here.</span>
          <a class="button primary" routerLink="/shop">Browse sarees</a>
        </div>
      }
    </section>
  `,
})
export class WishlistPageComponent {
  protected readonly wishlist = inject(WishlistStore);
  protected readonly quickView = inject(QuickViewStore);
}
