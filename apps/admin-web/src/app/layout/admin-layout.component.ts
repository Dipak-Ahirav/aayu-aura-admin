import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../core/services/auth.service';

interface NavItem {
  label: string;
  route: string;
  icon: string;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', route: '/dashboard', icon: 'dashboard' },
  { label: 'Products', route: '/products', icon: 'inventory_2' },
  { label: 'Master Data', route: '/master-data', icon: 'category' },
  { label: 'Suppliers', route: '/suppliers', icon: 'store' },
  { label: 'Purchases', route: '/purchases', icon: 'receipt_long' },
  { label: 'Inventory', route: '/inventory', icon: 'warehouse' },
  { label: 'Customers', route: '/customers', icon: 'groups' },
  { label: 'Orders', route: '/orders', icon: 'shopping_bag' },
  { label: 'Payments', route: '/payments', icon: 'payments' },
  { label: 'Invoices', route: '/invoices', icon: 'description' },
  { label: 'Shipping', route: '/shipping', icon: 'local_shipping' },
  { label: 'Returns', route: '/returns', icon: 'assignment_return' },
  { label: 'Expenses', route: '/expenses', icon: 'account_balance_wallet' },
  { label: 'Reports', route: '/reports', icon: 'query_stats' },
  { label: 'Tally Export', route: '/accounting-exports', icon: 'ios_share' },
  { label: 'Users', route: '/users', icon: 'admin_panel_settings' },
  { label: 'Audit Logs', route: '/audit-logs', icon: 'history' },
  { label: 'Settings', route: '/settings', icon: 'settings' },
];

@Component({
  selector: 'aa-admin-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatButtonModule, MatIconModule],
  template: `
    <div class="shell" [class.nav-open]="navOpen()">
      <aside class="sidebar" aria-label="Primary navigation">
        <div class="brand">
          <div class="logo">A&A</div>
          <div>
            <strong>Aayu & Aura</strong>
            <span>Admin Portal</span>
          </div>
        </div>

        <nav>
          @for (item of navItems; track item.route) {
            <a
              [routerLink]="item.route"
              routerLinkActive="active"
              [routerLinkActiveOptions]="{ exact: item.route === '/dashboard' }"
            >
              <mat-icon>{{ item.icon }}</mat-icon>
              <span>{{ item.label }}</span>
            </a>
          }
        </nav>
      </aside>

      <div class="workspace">
        <header class="topbar">
          <button
            mat-icon-button
            type="button"
            class="menu-button"
            (click)="toggleNav()"
            aria-label="Toggle navigation"
          >
            <mat-icon>menu</mat-icon>
          </button>
          <div>
            <strong>{{ greeting() }}</strong>
            <span class="muted">Financial year Apr-Mar</span>
          </div>
          <button mat-stroked-button type="button" (click)="logout()">Logout</button>
        </header>

        <main>
          <router-outlet />
        </main>
      </div>
    </div>
  `,
  styles: [
    `
      .shell {
        min-height: 100vh;
        display: grid;
        grid-template-columns: 280px minmax(0, 1fr);
      }

      .sidebar {
        position: sticky;
        top: 0;
        height: 100vh;
        padding: 24px 18px;
        background: #2a1729;
        color: #fffaf2;
        overflow-y: auto;
      }

      .brand {
        display: flex;
        gap: 12px;
        align-items: center;
        margin-bottom: 32px;
      }

      .brand span {
        display: block;
        color: rgba(255, 250, 242, 0.7);
        font-size: 0.82rem;
        margin-top: 3px;
      }

      .logo {
        width: 48px;
        height: 48px;
        display: grid;
        place-items: center;
        border: 1px solid rgba(255, 250, 242, 0.35);
        color: #f4d69c;
        font-family: 'Playfair Display', Georgia, serif;
        font-weight: 700;
      }

      nav {
        display: grid;
        gap: 6px;
      }

      nav a {
        min-height: 40px;
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 0 12px;
        color: rgba(255, 250, 242, 0.78);
        text-decoration: none;
        border-radius: 8px;
        font-weight: 600;
      }

      nav mat-icon {
        flex: 0 0 auto;
      }

      nav a.active,
      nav a:hover {
        color: #fffaf2;
        background: rgba(255, 255, 255, 0.1);
      }

      .workspace {
        min-width: 0;
      }

      .topbar {
        position: sticky;
        top: 0;
        z-index: 2;
        min-height: 72px;
        display: flex;
        align-items: center;
        gap: 16px;
        justify-content: space-between;
        padding: 0 28px;
        background: rgba(251, 247, 240, 0.88);
        backdrop-filter: blur(16px);
        border-bottom: 1px solid var(--aa-border);
      }

      .topbar div {
        margin-right: auto;
      }

      .topbar span {
        display: block;
        margin-top: 2px;
        font-size: 0.84rem;
      }

      .menu-button {
        display: none;
      }

      main {
        padding: 28px;
      }

      @media (max-width: 900px) {
        .shell {
          grid-template-columns: 1fr;
        }

        .sidebar {
          position: fixed;
          inset: 0 auto 0 0;
          width: min(82vw, 300px);
          transform: translateX(-100%);
          transition: transform 180ms ease;
          z-index: 5;
        }

        .shell.nav-open .sidebar {
          transform: translateX(0);
        }

        .menu-button {
          display: inline-grid;
        }

        main,
        .topbar {
          padding-inline: 16px;
        }
      }
    `,
  ],
})
export class AdminLayoutComponent {
  private readonly auth = inject(AuthService);
  readonly navItems = navItems;
  readonly navOpen = signal(false);
  readonly greeting = computed(() => {
    const profile = this.auth.profile();
    return profile ? `Welcome, ${profile.name}` : 'Welcome';
  });

  toggleNav(): void {
    this.navOpen.update((value) => !value);
  }

  logout(): void {
    this.auth.logout();
  }
}
