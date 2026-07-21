import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CartStore } from '../../state/cart/cart.store';
import { StorefrontStore } from '../../state/storefront/storefront.store';
import { WishlistStore } from '../../state/wishlist/wishlist.store';
import { CustomerSessionStore } from '../../state/session/customer-session.store';

@Component({
  selector: 'aac-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <header class="site-header">
      <a class="brand" routerLink="/" aria-label="Aayu & Aura home">
        <span class="brand-mark">AA</span>
        <span>{{ storefront.brand().displayName }}</span>
      </a>

      <nav class="desktop-nav" aria-label="Primary navigation">
        <a routerLink="/shop" routerLinkActive="active">Shop</a>
        <a routerLink="/collections" routerLinkActive="active">Collections</a>
        <a routerLink="/category/silk-sarees" routerLinkActive="active">Silk</a>
        <a routerLink="/search" routerLinkActive="active">Search</a>
        <a routerLink="/track-order" routerLinkActive="active">Track</a>
      </nav>

      <div class="header-actions">
        <a class="whatsapp-link" href="https://wa.me/" target="_blank" rel="noreferrer">WhatsApp</a>
        <a routerLink="/wishlist" aria-label="Wishlist">Wishlist {{ wishlist.count() }}</a>
        <a class="cart-pill" routerLink="/cart" aria-label="Cart">Cart {{ cart.itemCount() }}</a>
        <a routerLink="/account" aria-label="Account">{{ session.currentCustomer()?.name || 'Account' }}</a>
      </div>
    </header>
  `,
})
export class HeaderComponent {
  protected readonly cart = inject(CartStore);
  protected readonly session = inject(CustomerSessionStore);
  protected readonly storefront = inject(StorefrontStore);
  protected readonly wishlist = inject(WishlistStore);
}
