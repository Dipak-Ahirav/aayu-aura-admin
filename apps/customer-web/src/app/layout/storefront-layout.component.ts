import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AnnouncementBarComponent } from './announcement-bar/announcement-bar.component';
import { FooterComponent } from './footer/footer.component';
import { HeaderComponent } from './header/header.component';
import { MobileNavigationComponent } from './mobile-navigation/mobile-navigation.component';
import { QuickViewModalComponent } from '../shared/ui/quick-view-modal.component';

@Component({
  selector: 'aac-storefront-layout',
  standalone: true,
  imports: [
    AnnouncementBarComponent,
    HeaderComponent,
    FooterComponent,
    MobileNavigationComponent,
    QuickViewModalComponent,
    RouterOutlet,
  ],
  template: `
    <aac-announcement-bar />
    <aac-header />
    <main class="storefront-main">
      <router-outlet />
    </main>
    <aac-footer />
    <aac-mobile-navigation />
    <aac-quick-view-modal />
  `,
})
export class StorefrontLayoutComponent {}
