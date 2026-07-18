import { Component, inject } from '@angular/core';
import { WishlistStore } from '../../state/wishlist/wishlist.store';

@Component({
  selector: 'aac-wishlist-page',
  standalone: true,
  template: `
    <section class="page-shell">
      <p class="eyebrow">Wishlist</p>
      <h1>Saved sarees</h1>
      <p>{{ wishlist.count() }} saved item(s). Wishlist sync and merge rules are planned for Phase 5.</p>
    </section>
  `,
})
export class WishlistPageComponent {
  protected readonly wishlist = inject(WishlistStore);
}
