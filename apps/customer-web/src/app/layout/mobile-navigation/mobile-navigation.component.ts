import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CartStore } from '../../state/cart/cart.store';
import { WishlistStore } from '../../state/wishlist/wishlist.store';

@Component({
  selector: 'aac-mobile-navigation',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav class="mobile-nav" aria-label="Mobile navigation">
      <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">Home</a>
      <a routerLink="/shop" routerLinkActive="active">Shop</a>
      <a routerLink="/search" routerLinkActive="active">Search</a>
      <a routerLink="/track-order" routerLinkActive="active">Track</a>
      <a routerLink="/cart" routerLinkActive="active">Cart {{ cart.itemCount() }}</a>
    </nav>
  `,
})
export class MobileNavigationComponent {
  protected readonly cart = inject(CartStore);
  protected readonly wishlist = inject(WishlistStore);
}
