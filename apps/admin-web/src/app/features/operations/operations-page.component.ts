import { AsyncPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import type { ModuleOverviewDto, OperationalModuleSlug } from '@aayu-aura/shared-types';
import { catchError, map, of, startWith, switchMap } from 'rxjs';
import { ModuleOverviewService } from './module-overview.service';

type PageState =
  | { status: 'loading' }
  | { status: 'ready'; overview: ModuleOverviewDto }
  | { status: 'error'; message: string };

@Component({
  selector: 'aa-operations-page',
  standalone: true,
  imports: [AsyncPipe, MatButtonModule, MatIconModule],
  template: `
    @if (state$ | async; as state) {
      @if (state.status === 'loading') {
        <section class="state-panel" aria-live="polite">
          <mat-icon>hourglass_empty</mat-icon>
          <h1>Loading module</h1>
          <p>Preparing the admin workspace.</p>
        </section>
      } @else if (state.status === 'error') {
        <section class="state-panel error" role="alert">
          <mat-icon>error</mat-icon>
          <h1>Module unavailable</h1>
          <p>{{ state.message }}</p>
        </section>
      } @else {
        <section class="operations-page">
          <div class="hero">
            <div>
              <p class="breadcrumb">{{ state.overview.breadcrumb }}</p>
              <h1 class="page-title">{{ state.overview.title }}</h1>
              <p class="muted">{{ state.overview.description }}</p>
            </div>
            <div class="hero-actions">
              @for (action of state.overview.actions; track action.label) {
                <button
                  [class.secondary]="action.kind === 'secondary'"
                  mat-flat-button
                  color="primary"
                  type="button"
                  (click)="selectAction(action.label)"
                  [attr.aria-label]="action.description"
                >
                  <mat-icon>{{ action.icon }}</mat-icon>
                  {{ action.label }}
                </button>
              }
            </div>
          </div>

          <section class="metrics" aria-label="Module summary">
            @for (metric of state.overview.metrics; track metric.label) {
              <article [class]="metric.tone">
                <span>{{ metric.label }}</span>
                <strong>{{ metric.value }}</strong>
              </article>
            }
          </section>

          <div class="tabs" aria-label="Module tabs">
            @for (tab of state.overview.tabs; track tab.label) {
              <button
                type="button"
                [class.selected]="selectedTab() === tab.label"
                (click)="selectedTab.set(tab.label)"
              >
                {{ tab.label }}
                @if (tab.count !== undefined) {
                  <span>{{ tab.count }}</span>
                }
              </button>
            }
          </div>

          <section class="content-grid">
            <article class="table-panel">
              <div class="panel-heading">
                <div>
                  <h2>{{ selectedTab() || state.overview.tabs[0].label }}</h2>
                  <p>
                    Search, filters, sorting, export, and bulk actions are scaffolded for this
                    module.
                  </p>
                </div>
                <div class="filter-strip" aria-label="Available filters">
                  @for (filter of state.overview.filters; track filter) {
                    <button type="button">{{ filter }}</button>
                  }
                </div>
              </div>

              <div class="table-wrap">
                <table>
                  <thead>
                    <tr>
                      @for (column of state.overview.table.columns; track column) {
                        <th>{{ column }}</th>
                      }
                    </tr>
                  </thead>
                  <tbody>
                    @for (row of state.overview.table.rows; track $index) {
                      <tr>
                        @for (column of state.overview.table.columns; track column) {
                          <td>{{ row[column] }}</td>
                        }
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </article>

            <aside class="side-panel">
              <article>
                <h2>Workflow</h2>
                <ol>
                  @for (step of state.overview.workflowSteps; track step) {
                    <li>{{ step }}</li>
                  }
                </ol>
              </article>

              <article>
                <h2>API coverage</h2>
                <ul>
                  @for (route of state.overview.apiRoutes; track route) {
                    <li>{{ route }}</li>
                  }
                </ul>
              </article>

              @if (selectedAction()) {
                <article class="selection">
                  <h2>Selected action</h2>
                  <p>{{ selectedAction() }}</p>
                </article>
              }
            </aside>
          </section>
        </section>
      }
    }
  `,
  styles: [
    `
      .operations-page {
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
        border: 1px solid var(--aa-border);
        background:
          linear-gradient(110deg, rgba(255, 253, 249, 0.95), rgba(255, 253, 249, 0.82)),
          linear-gradient(135deg, rgba(123, 31, 53, 0.12), rgba(189, 139, 58, 0.14));
      }

      .breadcrumb {
        margin: 0 0 14px;
        color: var(--aa-maroon);
        font-size: 0.84rem;
        font-weight: 700;
      }

      .hero .muted {
        max-width: 760px;
        margin: 14px 0 0;
        line-height: 1.7;
      }

      .hero-actions {
        display: flex;
        flex-wrap: wrap;
        justify-content: flex-end;
        gap: 12px;
      }

      .hero-actions button {
        min-height: 42px;
      }

      .hero-actions button.secondary {
        background: var(--aa-plum);
      }

      .metrics {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 14px;
      }

      .metrics article,
      .table-panel,
      .side-panel article,
      .state-panel {
        background: var(--aa-surface-strong);
        border: 1px solid var(--aa-border);
        border-radius: 8px;
        box-shadow: 0 10px 30px rgba(74, 31, 69, 0.07);
      }

      .metrics article {
        min-height: 118px;
        display: grid;
        align-content: space-between;
        padding: 18px;
        border-top-width: 4px;
      }

      .metrics span {
        color: var(--aa-muted);
        font-size: 0.88rem;
        font-weight: 700;
      }

      .metrics strong {
        font-size: 1.45rem;
      }

      .metrics .maroon {
        border-top-color: var(--aa-maroon);
      }

      .metrics .plum {
        border-top-color: var(--aa-plum);
      }

      .metrics .gold {
        border-top-color: var(--aa-gold);
      }

      .metrics .green {
        border-top-color: var(--aa-success);
      }

      .tabs,
      .filter-strip {
        display: flex;
        gap: 8px;
        overflow-x: auto;
      }

      .tabs button,
      .filter-strip button {
        min-height: 36px;
        border: 1px solid var(--aa-border);
        background: var(--aa-surface);
        color: var(--aa-text);
        border-radius: 999px;
        padding: 0 13px;
        white-space: nowrap;
        font-weight: 700;
      }

      .tabs button.selected {
        background: var(--aa-maroon);
        border-color: var(--aa-maroon);
        color: #fff;
      }

      .tabs span {
        margin-left: 6px;
        opacity: 0.74;
      }

      .content-grid {
        display: grid;
        grid-template-columns: minmax(0, 1.4fr) minmax(300px, 0.6fr);
        gap: 16px;
        align-items: start;
      }

      .table-panel,
      .side-panel article {
        padding: 22px;
      }

      .panel-heading {
        display: grid;
        gap: 16px;
        margin-bottom: 18px;
      }

      h2 {
        margin: 0 0 6px;
        font-size: 1.08rem;
      }

      p {
        margin: 0;
        color: var(--aa-muted);
        line-height: 1.55;
      }

      .table-wrap {
        overflow-x: auto;
      }

      table {
        width: 100%;
        min-width: 680px;
        border-collapse: collapse;
      }

      th,
      td {
        text-align: left;
        padding: 14px 12px;
        border-bottom: 1px solid var(--aa-border);
        font-size: 0.92rem;
      }

      th {
        color: var(--aa-muted);
        font-size: 0.78rem;
        text-transform: uppercase;
        letter-spacing: 0;
      }

      .side-panel {
        display: grid;
        gap: 16px;
      }

      ol,
      ul {
        display: grid;
        gap: 10px;
        margin: 14px 0 0;
        padding-left: 20px;
      }

      li {
        line-height: 1.45;
      }

      .side-panel ul {
        list-style: none;
        padding-left: 0;
      }

      .side-panel ul li {
        padding: 10px 12px;
        border-radius: 8px;
        background: #fbf7f0;
        color: var(--aa-plum);
        font-family: Consolas, 'Courier New', monospace;
        font-size: 0.82rem;
        overflow-wrap: anywhere;
      }

      .selection {
        border-color: rgba(123, 31, 53, 0.28);
      }

      .state-panel {
        display: grid;
        place-items: center;
        min-height: 420px;
        padding: 32px;
        text-align: center;
      }

      .state-panel mat-icon {
        width: 52px;
        height: 52px;
        font-size: 52px;
        color: var(--aa-maroon);
      }

      .state-panel h1 {
        margin: 16px 0 8px;
      }

      .state-panel.error mat-icon {
        color: #a12424;
      }

      @media (max-width: 1120px) {
        .metrics {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .content-grid {
          grid-template-columns: 1fr;
        }
      }

      @media (max-width: 720px) {
        .hero {
          flex-direction: column;
          align-items: stretch;
        }

        .hero-actions {
          justify-content: flex-start;
        }

        .metrics {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class OperationsPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly modules = inject(ModuleOverviewService);

  readonly selectedTab = signal('');
  readonly selectedAction = signal<string | null>(null);
  readonly slug = computed(
    () => this.route.snapshot.paramMap.get('module') as OperationalModuleSlug,
  );
  readonly state$ = this.route.paramMap.pipe(
    map((params) => params.get('module') as OperationalModuleSlug),
    switchMap((slug) =>
      this.modules.getOverview(slug).pipe(
        map((overview): PageState => {
          this.selectedTab.set(overview.tabs[0]?.label ?? '');
          this.selectedAction.set(null);
          return { status: 'ready', overview };
        }),
        startWith({ status: 'loading' } as PageState),
        catchError(() =>
          of({
            status: 'error',
            message: 'The module could not be loaded. Please check the API connection.',
          } as PageState),
        ),
      ),
    ),
  );

  selectAction(label: string): void {
    this.selectedAction.set(label);
  }
}
