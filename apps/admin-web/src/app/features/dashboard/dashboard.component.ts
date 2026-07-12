import { Component, computed, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

interface Metric {
  label: string;
  value: string;
  tone: 'maroon' | 'plum' | 'gold' | 'green';
}

@Component({
  selector: 'aa-dashboard',
  standalone: true,
  imports: [MatButtonModule, MatIconModule],
  template: `
    <section class="dashboard">
      <div class="hero">
        <div>
          <p class="breadcrumb">Home / Dashboard</p>
          <h1 class="page-title">Business command center</h1>
          <p class="muted">
            Track saree sales, stock health, payments, and invoice readiness from one place.
          </p>
        </div>
        <div class="hero-actions">
          <button mat-flat-button color="primary" type="button">
            <mat-icon>add</mat-icon>
            New order
          </button>
          <button mat-stroked-button type="button">
            <mat-icon>download</mat-icon>
            Export
          </button>
        </div>
      </div>

      <div class="filters" aria-label="Dashboard period filters">
        @for (filter of filters; track filter) {
          <button
            type="button"
            [class.selected]="filter === selectedFilter()"
            (click)="selectedFilter.set(filter)"
          >
            {{ filter }}
          </button>
        }
      </div>

      <section class="metrics" aria-label="Business summary">
        @for (metric of visibleMetrics(); track metric.label) {
          <article [class]="metric.tone">
            <span>{{ metric.label }}</span>
            <strong>{{ metric.value }}</strong>
          </article>
        }
      </section>

      <section class="panels">
        <article class="chart-panel">
          <div>
            <h2>Daily sales</h2>
            <span class="muted">Current selected period</span>
          </div>
          <div class="bars" aria-label="Sample sales chart">
            @for (bar of bars; track $index) {
              <span [style.height.%]="bar"></span>
            }
          </div>
        </article>

        <article class="task-panel">
          <h2>Operational attention</h2>
          <ul>
            <li><span>Low stock products</span><strong>14</strong></li>
            <li><span>Orders waiting for dispatch</span><strong>8</strong></li>
            <li><span>Customer payments due</span><strong>₹42,800</strong></li>
            <li><span>Supplier payments due</span><strong>₹1,18,400</strong></li>
          </ul>
        </article>
      </section>
    </section>
  `,
  styles: [
    `
      .dashboard {
        display: grid;
        gap: 22px;
      }

      .hero {
        display: flex;
        gap: 24px;
        align-items: flex-end;
        justify-content: space-between;
        padding: clamp(24px, 5vw, 44px);
        border-radius: 8px;
        background:
          linear-gradient(110deg, rgba(255, 253, 249, 0.94), rgba(255, 253, 249, 0.82)),
          linear-gradient(135deg, rgba(123, 31, 53, 0.14), rgba(189, 139, 58, 0.16));
        border: 1px solid var(--aa-border);
      }

      .breadcrumb {
        margin: 0 0 14px;
        color: var(--aa-maroon);
        font-weight: 700;
        font-size: 0.84rem;
      }

      .hero p:last-child {
        max-width: 650px;
        margin: 14px 0 0;
        font-size: 1rem;
        line-height: 1.7;
      }

      .hero-actions {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
      }

      .filters {
        display: flex;
        gap: 8px;
        overflow-x: auto;
        padding-bottom: 2px;
      }

      .filters button {
        border: 1px solid var(--aa-border);
        background: var(--aa-surface);
        color: var(--aa-text);
        min-height: 38px;
        padding: 0 14px;
        border-radius: 999px;
        white-space: nowrap;
        font-weight: 700;
      }

      .filters button.selected {
        background: var(--aa-maroon);
        color: #fff;
        border-color: var(--aa-maroon);
      }

      .metrics {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 14px;
      }

      .metrics article,
      .chart-panel,
      .task-panel {
        background: var(--aa-surface-strong);
        border: 1px solid var(--aa-border);
        border-radius: 8px;
        box-shadow: 0 10px 30px rgba(74, 31, 69, 0.07);
      }

      .metrics article {
        min-height: 126px;
        padding: 20px;
        display: grid;
        align-content: space-between;
      }

      .metrics span {
        color: var(--aa-muted);
        font-size: 0.9rem;
        font-weight: 700;
      }

      .metrics strong {
        font-size: 1.7rem;
      }

      .metrics .maroon {
        border-top: 4px solid var(--aa-maroon);
      }

      .metrics .plum {
        border-top: 4px solid var(--aa-plum);
      }

      .metrics .gold {
        border-top: 4px solid var(--aa-gold);
      }

      .metrics .green {
        border-top: 4px solid var(--aa-success);
      }

      .panels {
        display: grid;
        grid-template-columns: minmax(0, 1.4fr) minmax(320px, 0.6fr);
        gap: 16px;
      }

      .chart-panel,
      .task-panel {
        padding: 22px;
      }

      h2 {
        margin: 0 0 4px;
        font-size: 1.1rem;
      }

      .bars {
        height: 260px;
        display: flex;
        align-items: end;
        gap: 12px;
        margin-top: 28px;
        padding: 16px;
        border-radius: 8px;
        background: #fbf7f0;
      }

      .bars span {
        flex: 1;
        min-width: 14px;
        border-radius: 6px 6px 0 0;
        background: linear-gradient(180deg, var(--aa-gold), var(--aa-maroon));
      }

      ul {
        list-style: none;
        display: grid;
        gap: 12px;
        padding: 0;
        margin: 20px 0 0;
      }

      li {
        display: flex;
        justify-content: space-between;
        gap: 16px;
        padding-bottom: 12px;
        border-bottom: 1px solid var(--aa-border);
      }

      @media (max-width: 1120px) {
        .metrics {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .panels {
          grid-template-columns: 1fr;
        }
      }

      @media (max-width: 680px) {
        .hero {
          align-items: stretch;
          flex-direction: column;
        }

        .metrics {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class DashboardComponent {
  readonly filters = ['Today', 'Last 7 days', 'Current month', 'Financial year'];
  readonly selectedFilter = signal('Current month');
  readonly bars = [34, 48, 38, 72, 66, 92, 57, 76, 68, 84, 62, 88];
  readonly visibleMetrics = computed<Metric[]>(() => [
    { label: 'Today sales', value: '₹28,400', tone: 'maroon' },
    { label: 'Month sales', value: '₹7,82,900', tone: 'plum' },
    { label: 'Month profit', value: '₹1,86,250', tone: 'gold' },
    { label: 'Pending orders', value: '23', tone: 'green' },
    { label: 'Total products', value: '486', tone: 'maroon' },
    { label: 'Pieces in stock', value: '1,248', tone: 'plum' },
    { label: 'Low stock', value: '14', tone: 'gold' },
    { label: 'Outstanding payments', value: '₹42,800', tone: 'green' },
  ]);
}
