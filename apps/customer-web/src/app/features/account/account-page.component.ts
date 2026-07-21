import { Component, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CustomerAuthService } from '../authentication/customer-auth.service';
import { CustomerSessionStore } from '../../state/session/customer-session.store';

@Component({
  selector: 'aac-account-page',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="page-shell account-dashboard">
      <p class="eyebrow">Account</p>
      <h1>{{ section() || 'Dashboard' }}</h1>
      @if (session.currentCustomer(); as customer) {
        <div class="account-profile-card">
          <span>{{ initials(customer.name) }}</span>
          <div>
            <h2>{{ customer.name }}</h2>
            <p>{{ customer.email || customer.mobile }}</p>
          </div>
        </div>
        <div class="action-grid">
          <a routerLink="/track-order">Track order</a>
          <a routerLink="/wishlist">Wishlist</a>
          <a routerLink="/cart">Cart</a>
          <button type="button" (click)="logout()">Logout</button>
        </div>
      }
    </section>
  `,
})
export class AccountPageComponent {
  readonly section = input<string>();
  protected readonly session = inject(CustomerSessionStore);
  private readonly auth = inject(CustomerAuthService);
  private readonly router = inject(Router);

  protected initials(name: string): string {
    return name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();
  }

  protected logout(): void {
    this.auth.logout();
    void this.router.navigate(['/login']);
  }
}
