import { Component, HostListener, computed, inject, signal } from '@angular/core';
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
    <div class="shell" [class.nav-open]="navOpen()" [class.nav-collapsed]="navCollapsed()">
      <button
        class="nav-backdrop"
        type="button"
        aria-label="Close navigation"
        (click)="closeNav()"
      ></button>

      <aside class="sidebar" aria-label="Primary navigation">
        <div class="brand">
          <div class="logo">A&A</div>
          <div class="brand-copy">
            <strong>Aayu & Aura</strong>
            <span>Admin Portal</span>
          </div>
          <button
            mat-icon-button
            type="button"
            class="collapse-button"
            (click)="toggleNavCollapse()"
            [attr.aria-label]="navCollapsed() ? 'Expand navigation' : 'Collapse navigation'"
          >
            <mat-icon>{{ navCollapsed() ? 'chevron_right' : 'chevron_left' }}</mat-icon>
          </button>
          <button
            mat-icon-button
            type="button"
            class="mobile-close-button"
            (click)="closeNav()"
            aria-label="Close navigation"
          >
            <mat-icon>close</mat-icon>
          </button>
        </div>

        <nav>
          @for (item of navItems; track item.route) {
            <a
              [routerLink]="item.route"
              routerLinkActive="active"
              [routerLinkActiveOptions]="{ exact: item.route === '/dashboard' }"
              [attr.aria-label]="item.label"
              [attr.title]="navCollapsed() ? item.label : null"
              (click)="closeNav()"
            >
              <mat-icon>{{ item.icon }}</mat-icon>
              <span class="nav-label">{{ item.label }}</span>
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
        grid-template-columns: 264px minmax(0, 1fr);
        transition: grid-template-columns 180ms ease;
      }

      .shell.nav-collapsed {
        grid-template-columns: 84px minmax(0, 1fr);
      }

      .sidebar {
        position: sticky;
        top: 0;
        height: 100vh;
        padding: 20px 16px;
        background: #2a1729;
        color: #fffaf2;
        overflow-y: auto;
        overflow-x: hidden;
      }

      .nav-backdrop,
      .mobile-close-button {
        display: none;
      }

      .brand {
        display: flex;
        gap: 12px;
        align-items: center;
        margin-bottom: 24px;
      }

      .brand-copy,
      .nav-label {
        white-space: nowrap;
        opacity: 1;
        transition:
          opacity 120ms ease,
          width 180ms ease;
      }

      .brand span {
        display: block;
        color: rgba(255, 250, 242, 0.7);
        font-size: 0.78rem;
        margin-top: 3px;
      }

      .logo {
        width: 42px;
        height: 42px;
        display: grid;
        place-items: center;
        border: 1px solid rgba(255, 250, 242, 0.35);
        color: #f4d69c;
        font-family: var(--aa-font-family);
        font-weight: 800;
      }

      .collapse-button {
        margin-left: auto;
        color: #fffaf2;
      }

      .shell.nav-collapsed .sidebar {
        padding-inline: 14px;
      }

      .shell.nav-collapsed .brand {
        justify-content: center;
      }

      .shell.nav-collapsed .logo {
        width: 44px;
        height: 44px;
      }

      .shell.nav-collapsed .brand-copy,
      .shell.nav-collapsed .nav-label {
        width: 0;
        opacity: 0;
        overflow: hidden;
      }

      .shell.nav-collapsed .collapse-button {
        position: absolute;
        top: 62px;
        right: 8px;
        width: 28px;
        height: 28px;
        background: rgba(255, 255, 255, 0.12);
      }

      nav {
        display: grid;
        gap: 6px;
      }

      nav a {
        min-height: 36px;
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 0 12px;
        color: rgba(255, 250, 242, 0.78);
        text-decoration: none;
        border-radius: 8px;
        font-size: 0.9rem;
        font-weight: 600;
      }

      .shell.nav-collapsed nav a {
        justify-content: center;
        padding-inline: 0;
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
        min-height: 62px;
        display: flex;
        align-items: center;
        gap: 16px;
        justify-content: space-between;
        padding: 0 22px;
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
        font-size: 0.78rem;
      }

      .topbar strong {
        font-size: 0.96rem;
      }

      .menu-button {
        display: none;
      }

      main {
        padding: 20px 22px;
      }

      @media (max-width: 900px) {
        .shell {
          grid-template-columns: 1fr;
        }

        .shell.nav-collapsed {
          grid-template-columns: 1fr;
        }

        .sidebar {
          position: fixed;
          inset: 0 auto 0 0;
          width: min(82vw, 300px);
          transform: translateX(-100%);
          transition: transform 180ms ease;
          z-index: 6;
        }

        .nav-backdrop {
          position: fixed;
          inset: 0;
          display: block;
          border: 0;
          padding: 0;
          background: rgba(42, 23, 41, 0.45);
          opacity: 0;
          pointer-events: none;
          transition: opacity 180ms ease;
          z-index: 5;
        }

        .shell.nav-open .nav-backdrop {
          opacity: 1;
          pointer-events: auto;
        }

        .shell.nav-collapsed .sidebar {
          padding: 24px 18px;
        }

        .shell.nav-collapsed .brand {
          justify-content: flex-start;
        }

        .shell.nav-collapsed .brand-copy,
        .shell.nav-collapsed .nav-label {
          width: auto;
          opacity: 1;
          overflow: visible;
        }

        .collapse-button {
          display: none;
        }

        .mobile-close-button {
          display: inline-grid;
          margin-left: auto;
          color: #fffaf2;
        }

        .shell.nav-collapsed nav a {
          justify-content: flex-start;
          padding: 0 12px;
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
  readonly navCollapsed = signal(false);
  readonly greeting = computed(() => {
    const profile = this.auth.profile();
    return profile ? `Welcome, ${profile.name}` : 'Welcome';
  });

  toggleNav(): void {
    this.navOpen.update((value) => !value);
  }

  closeNav(): void {
    this.navOpen.set(false);
  }

  toggleNavCollapse(): void {
    this.navCollapsed.update((value) => !value);
  }

  logout(): void {
    this.auth.logout();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeNav();
  }
}
