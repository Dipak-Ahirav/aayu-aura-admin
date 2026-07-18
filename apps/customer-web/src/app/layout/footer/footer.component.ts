import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'aac-footer',
  standalone: true,
  imports: [RouterLink],
  template: `
    <footer class="site-footer">
      <div>
        <h2>Aayu & Aura</h2>
        <p>Premium saree shopping with clear prices, customer-safe order flows, and WhatsApp support.</p>
      </div>
      <nav aria-label="Footer navigation">
        <a routerLink="/about">About</a>
        <a routerLink="/faq">FAQ</a>
        <a routerLink="/track-order">Track order</a>
        <a routerLink="/shipping-policy">Shipping</a>
        <a routerLink="/return-policy">Returns</a>
        <a routerLink="/privacy-policy">Privacy</a>
        <a routerLink="/terms-and-conditions">Terms</a>
      </nav>
    </footer>
  `,
})
export class FooterComponent {}
