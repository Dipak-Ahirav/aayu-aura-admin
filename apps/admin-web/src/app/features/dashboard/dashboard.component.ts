import { AsyncPipe, DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import type { DashboardPeriod, DashboardSummaryDto } from '@aayu-aura/shared-types';
import { BehaviorSubject, catchError, map, of, startWith, switchMap } from 'rxjs';
import { DashboardService } from './dashboard.service';

interface FilterOption {
  label: string;
  value: DashboardPeriod;
}

type DashboardState =
  | { status: 'loading' }
  | { status: 'ready'; summary: DashboardSummaryDto }
  | { status: 'error'; message: string };

@Component({
  selector: 'aa-dashboard',
  standalone: true,
  imports: [AsyncPipe, DatePipe, RouterLink, MatButtonModule, MatIconModule],
  template: `
    <section class="dashboard">
      <div class="hero">
        <div>
          <p class="breadcrumb">Home / Dashboard</p>
          <h1 class="page-title">Business command center</h1>
          <p class="muted">
            Live business snapshot from MongoDB: sales, stock, orders, customers, expenses, and
            payment attention.
          </p>
        </div>
        <div class="hero-actions">
          <button mat-flat-button color="primary" type="button" routerLink="/orders/new">
            <mat-icon>add</mat-icon>
            New order
          </button>
          <button mat-stroked-button type="button" (click)="reload()">
            <mat-icon>refresh</mat-icon>
            Refresh
          </button>
        </div>
      </div>

      <div class="filters" aria-label="Dashboard period filters">
        @for (filter of filters; track filter.value) {
          <button
            type="button"
            [class.selected]="filter.value === selectedPeriod()"
            (click)="selectPeriod(filter.value)"
          >
            {{ filter.label }}
          </button>
        }
      </div>

      @if (state$ | async; as state) {
        @if (state.status === 'loading') {
          <section class="state-panel" aria-live="polite">
            <mat-icon>hourglass_empty</mat-icon>
            <h2>Loading dashboard</h2>
            <p>Reading current data from MongoDB.</p>
          </section>
        } @else if (state.status === 'error') {
          <section class="state-panel error" role="alert">
            <mat-icon>error</mat-icon>
            <h2>Dashboard unavailable</h2>
            <p>{{ state.message }}</p>
          </section>
        } @else {
          <p class="range-note">
            Showing data from {{ state.summary.dateRange.from | date: 'mediumDate' }} to
            {{ state.summary.dateRange.to | date: 'mediumDate' }}.
          </p>

          <section class="metrics" aria-label="Business summary">
            @for (metric of state.summary.metrics; track metric.label) {
              <article [class]="metric.tone">
                <span>{{ metric.label }}</span>
                <strong>{{ metric.value }}</strong>
              </article>
            }
          </section>

          <section class="panels">
            <article class="chart-panel">
              <div class="panel-heading">
                <div>
                  <h2>Daily sales</h2>
                  <span class="muted">Order totals in the selected period</span>
                </div>
              </div>

              @if (state.summary.dailySales.length) {
                <div class="bars" aria-label="Daily sales chart">
                  @for (bar of state.summary.dailySales; track bar.label) {
                    <div class="bar-item">
                      <span
                        [style.height.%]="barHeight(bar.value, state.summary.dailySales)"
                      ></span>
                      <small>{{ bar.label }}</small>
                    </div>
                  }
                </div>
              } @else {
                <div class="empty-state">No sales found for this period.</div>
              }
            </article>

            <article class="task-panel">
              <h2>Operational attention</h2>
              <ul>
                @for (item of state.summary.attentionItems; track item.label) {
                  <li>
                    <span>{{ item.label }}</span>
                    <strong>{{ item.value }}</strong>
                  </li>
                }
              </ul>
            </article>

            <article class="task-panel">
              <h2>Orders by status</h2>
              @if (state.summary.orderStatus.length) {
                <ul>
                  @for (item of state.summary.orderStatus; track item.label) {
                    <li>
                      <span>{{ item.label }}</span>
                      <strong>{{ item.value }}</strong>
                    </li>
                  }
                </ul>
              } @else {
                <div class="empty-state compact">No order status data.</div>
              }
            </article>

            <article class="task-panel">
              <h2>Sales by channel</h2>
              @if (state.summary.salesByChannel.length) {
                <ul>
                  @for (item of state.summary.salesByChannel; track item.label) {
                    <li>
                      <span>{{ item.label }}</span>
                      <strong>{{ item.value }}</strong>
                    </li>
                  }
                </ul>
              } @else {
                <div class="empty-state compact">No channel data yet.</div>
              }
            </article>
          </section>

          <section class="collection-panel">
            <h2>Database collections</h2>
            <div>
              @for (collection of collectionStatuses(state.summary); track collection.name) {
                <span [class.missing]="!collection.exists">
                  <mat-icon>{{
                    collection.exists ? 'check_circle' : 'radio_button_unchecked'
                  }}</mat-icon>
                  {{ collection.name }}
                </span>
              }
            </div>
          </section>
        }
      }
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
        max-width: 680px;
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
      .range-note {
        margin: 0;
        color: var(--aa-muted);
        font-weight: 700;
      }
      .metrics {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 14px;
      }
      .metrics article,
      .chart-panel,
      .task-panel,
      .collection-panel,
      .state-panel {
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
        font-size: 1.45rem;
        overflow-wrap: anywhere;
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
      .task-panel,
      .collection-panel {
        padding: 22px;
      }
      .chart-panel {
        grid-row: span 3;
      }
      h2 {
        margin: 0 0 4px;
        font-size: 1.1rem;
      }
      .bars {
        height: 300px;
        display: flex;
        align-items: end;
        gap: 12px;
        margin-top: 28px;
        padding: 16px;
        border-radius: 8px;
        background: #fbf7f0;
      }
      .bar-item {
        flex: 1;
        min-width: 42px;
        height: 100%;
        display: grid;
        grid-template-rows: minmax(0, 1fr) auto;
        gap: 8px;
        align-items: end;
      }
      .bar-item span {
        width: 100%;
        min-height: 2px;
        border-radius: 6px 6px 0 0;
        background: linear-gradient(180deg, var(--aa-gold), var(--aa-maroon));
      }
      .bar-item small {
        color: var(--aa-muted);
        font-size: 0.72rem;
        text-align: center;
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
      .empty-state,
      .state-panel {
        min-height: 180px;
        display: grid;
        place-items: center;
        padding: 24px;
        color: var(--aa-muted);
        text-align: center;
      }
      .empty-state.compact {
        min-height: 112px;
        margin-top: 16px;
        border-radius: 8px;
        background: #fbf7f0;
      }
      .state-panel {
        min-height: 360px;
      }
      .state-panel mat-icon {
        width: 48px;
        height: 48px;
        font-size: 48px;
        color: var(--aa-maroon);
      }
      .state-panel.error mat-icon {
        color: #a12424;
      }
      .collection-panel div {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        margin-top: 16px;
      }
      .collection-panel span {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        min-height: 34px;
        padding: 0 12px;
        border-radius: 999px;
        background: rgba(40, 114, 79, 0.1);
        color: var(--aa-success);
        font-weight: 700;
      }
      .collection-panel span.missing {
        background: rgba(160, 97, 24, 0.1);
        color: var(--aa-warning);
      }
      .collection-panel mat-icon {
        width: 18px;
        height: 18px;
        font-size: 18px;
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
  private readonly dashboard = inject(DashboardService);
  private readonly refreshTrigger = new BehaviorSubject<DashboardPeriod>('current_month');

  readonly selectedPeriod = signal<DashboardPeriod>('current_month');
  readonly filters: FilterOption[] = [
    { label: 'Today', value: 'today' },
    { label: 'Yesterday', value: 'yesterday' },
    { label: 'Last 7 days', value: 'last_7_days' },
    { label: 'Last 30 days', value: 'last_30_days' },
    { label: 'Current month', value: 'current_month' },
    { label: 'Previous month', value: 'previous_month' },
    { label: 'Financial year', value: 'financial_year' },
  ];
  readonly state$ = this.refreshTrigger.pipe(
    switchMap((period) =>
      this.dashboard.getSummary(period).pipe(
        map((summary): DashboardState => ({ status: 'ready', summary })),
        startWith({ status: 'loading' } as DashboardState),
        catchError(() =>
          of({
            status: 'error',
            message: 'Check the API server and MongoDB connection, then refresh the dashboard.',
          } as DashboardState),
        ),
      ),
    ),
  );

  selectPeriod(period: DashboardPeriod): void {
    this.selectedPeriod.set(period);
    this.refreshTrigger.next(period);
  }

  reload(): void {
    this.refreshTrigger.next(this.selectedPeriod());
  }

  barHeight(value: number, series: readonly { value: number }[]): number {
    const max = Math.max(...series.map((point) => point.value), 1);
    return Math.max((value / max) * 100, 2);
  }

  collectionStatuses(summary: DashboardSummaryDto): Array<{ name: string; exists: boolean }> {
    return Object.entries(summary.collectionStatus).map(([name, exists]) => ({ name, exists }));
  }
}
