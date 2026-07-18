import { Component, inject } from '@angular/core';
import { StorefrontStore } from '../../state/storefront/storefront.store';

@Component({
  selector: 'aac-announcement-bar',
  standalone: true,
  template: `
    @if (storefront.brand().announcement; as announcement) {
      <section class="announcement-bar">{{ announcement }}</section>
    }
  `,
})
export class AnnouncementBarComponent {
  protected readonly storefront = inject(StorefrontStore);
}
