import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

interface FooterLink {
  label: string;
  path: string;
}

@Component({
  selector: 'aac-footer',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <footer class="site-footer">
      <div>
        <h2>Aayu & Aura</h2>
        <p>Premium saree shopping with clear prices, customer-safe order flows, and WhatsApp support.</p>
      </div>
      <nav aria-label="Footer navigation">
        @for (link of links; track link.path) {
          <a
            [routerLink]="link.path"
            routerLinkActive="active"
            [routerLinkActiveOptions]="{ exact: true }"
          >
            {{ link.label }}
          </a>
        }
      </nav>
    </footer>
  `,
})
export class FooterComponent {
  protected readonly links: FooterLink[] = [
    { label: 'About', path: '/about' },
    { label: 'FAQ', path: '/faq' },
    { label: 'Track order', path: '/track-order' },
    { label: 'Shipping', path: '/shipping-policy' },
    { label: 'Returns', path: '/return-policy' },
    { label: 'Privacy', path: '/privacy-policy' },
    { label: 'Terms', path: '/terms-and-conditions' },
  ];
}
