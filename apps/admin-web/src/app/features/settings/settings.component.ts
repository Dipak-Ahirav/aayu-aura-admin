import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'aa-settings',
  standalone: true,
  imports: [MatButtonModule, MatIconModule],
  template: `
    <section class="settings-page">
      <p class="breadcrumb">Home / Settings</p>
      <h1 class="page-title">Business settings</h1>
      <p class="muted">
        Configure business identity, invoice defaults, communication providers, and data controls.
      </p>

      <div class="settings-grid">
        @for (section of sections; track section.title) {
          <article>
            <mat-icon>{{ section.icon }}</mat-icon>
            <div>
              <h2>{{ section.title }}</h2>
              <p>{{ section.description }}</p>
            </div>
            <button mat-stroked-button type="button">Open</button>
          </article>
        }
      </div>
    </section>
  `,
  styles: [
    `
      .settings-page {
        display: grid;
        gap: 18px;
      }

      .breadcrumb {
        margin: 0;
        color: var(--aa-maroon);
        font-weight: 700;
      }

      .settings-page > .muted {
        max-width: 720px;
        margin: 0 0 10px;
        line-height: 1.7;
      }

      .settings-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 14px;
      }

      article {
        min-height: 150px;
        display: grid;
        grid-template-columns: auto minmax(0, 1fr) auto;
        gap: 16px;
        align-items: start;
        padding: 22px;
        border: 1px solid var(--aa-border);
        border-radius: 8px;
        background: var(--aa-surface-strong);
      }

      mat-icon {
        color: var(--aa-maroon);
      }

      h2 {
        margin: 0 0 8px;
        font-size: 1.05rem;
      }

      p {
        margin: 0;
        color: var(--aa-muted);
        line-height: 1.55;
      }

      @media (max-width: 860px) {
        .settings-grid {
          grid-template-columns: 1fr;
        }

        article {
          grid-template-columns: auto minmax(0, 1fr);
        }

        article button {
          grid-column: 2;
          justify-self: start;
        }
      }
    `,
  ],
})
export class SettingsComponent {
  readonly sections = [
    {
      icon: 'storefront',
      title: 'Business profile',
      description:
        'Logo, legal name, address, GSTIN, PAN, state, timezone, currency, and financial year.',
    },
    {
      icon: 'receipt',
      title: 'Billing and invoice',
      description:
        'GST settings, invoice numbering, bank details, UPI QR code, signatures, and footer text.',
    },
    {
      icon: 'inventory',
      title: 'Inventory rules',
      description:
        'Negative stock, costing method, reservations, low-stock alerts, and return-to-stock behavior.',
    },
    {
      icon: 'forum',
      title: 'Communication',
      description:
        'Email provider, WhatsApp provider, invoice templates, consent-aware messaging, and logs.',
    },
  ];
}
