import { AsyncPipe, DatePipe, JsonPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import type {
  AuditLogDto,
  AuditLogListDto,
  AuditModule,
  AuditSeverity,
} from '@aayu-aura/shared-types';
import { BehaviorSubject, catchError, map, of, startWith, switchMap } from 'rxjs';
import { AuditLogApiService } from './audit-log-api.service';

type AuditState =
  | { status: 'loading' }
  | { status: 'ready'; data: AuditLogListDto }
  | { status: 'error'; message: string };

type AuditTab = 'All events' | 'Security' | 'Inventory' | 'Finance';

@Component({
  selector: 'aa-audit-logs-page',
  standalone: true,
  imports: [
    AsyncPipe,
    DatePipe,
    FormsModule,
    JsonPipe,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
  ],
  template: `
    @if (state$ | async; as state) {
      @if (state.status === 'loading') {
        <section class="state-panel" aria-live="polite">
          <mat-icon>hourglass_empty</mat-icon>
          <h1>Loading audit logs</h1>
          <p>Reading immutable events from MongoDB.</p>
        </section>
      } @else if (state.status === 'error') {
        <section class="state-panel error" role="alert">
          <mat-icon>error</mat-icon>
          <h1>Audit logs unavailable</h1>
          <p>{{ state.message }}</p>
        </section>
      } @else {
        <section class="audit-page">
          <div class="hero">
            <div>
              <p class="breadcrumb">Home / Audit Logs</p>
              <h1 class="page-title">Audit Logs</h1>
              <p class="muted">
                Review immutable history for login, stock changes, invoices, payments, settings,
                exports, and role changes.
              </p>
            </div>
            <div class="hero-actions">
              <button mat-flat-button color="primary" type="button" (click)="exportAudit()">
                <mat-icon>download</mat-icon>
                Export audit
              </button>
              <button
                class="secondary"
                mat-flat-button
                color="primary"
                type="button"
                (click)="reviewChanges()"
              >
                <mat-icon>history</mat-icon>
                Review changes
              </button>
            </div>
          </div>

          <section class="metrics" aria-label="Audit summary">
            <article class="maroon">
              <span>Events today</span><strong>{{ state.data.summary.eventsToday }}</strong>
            </article>
            <article class="plum">
              <span>Security</span><strong>{{ state.data.summary.security }}</strong>
            </article>
            <article class="gold">
              <span>Inventory</span><strong>{{ state.data.summary.inventory }}</strong>
            </article>
            <article class="green">
              <span>Finance</span><strong>{{ state.data.summary.finance }}</strong>
            </article>
          </section>

          @if (message()) {
            <p class="success" role="status">{{ message() }}</p>
          }
          @if (error()) {
            <p class="error-message" role="alert">{{ error() }}</p>
          }

          <div class="tabs" aria-label="Audit tabs">
            @for (tab of tabs(state.data); track tab.label) {
              <button
                type="button"
                [class.selected]="selectedTab() === tab.label"
                (click)="selectTab(tab.label)"
              >
                {{ tab.label }}
                <span>{{ tab.count }}</span>
              </button>
            }
          </div>

          <section class="content-grid">
            <article class="table-panel">
              <div class="panel-heading">
                <div>
                  <h2>{{ selectedTab() }}</h2>
                  <p>
                    Search, module, action, user, severity, review state, sorting, and export are
                    API-backed.
                  </p>
                </div>
                <div class="filter-strip" aria-label="Audit filters">
                  <mat-form-field appearance="outline">
                    <mat-label>Search</mat-label>
                    <input
                      matInput
                      [ngModel]="searchText()"
                      (ngModelChange)="onSearchChange($event)"
                      name="search"
                    />
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Module</mat-label>
                    <mat-select
                      [(ngModel)]="moduleFilter"
                      name="module"
                      (selectionChange)="applyFilters()"
                    >
                      <mat-option value="all">All</mat-option>
                      @for (module of modules; track module) {
                        <mat-option [value]="module">{{ module }}</mat-option>
                      }
                    </mat-select>
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Severity</mat-label>
                    <mat-select
                      [(ngModel)]="severityFilter"
                      name="severity"
                      (selectionChange)="applyFilters()"
                    >
                      <mat-option value="all">All</mat-option>
                      @for (severity of severities; track severity) {
                        <mat-option [value]="severity">{{ severity }}</mat-option>
                      }
                    </mat-select>
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Reviewed</mat-label>
                    <mat-select
                      [(ngModel)]="reviewedFilter"
                      name="reviewed"
                      (selectionChange)="applyFilters()"
                    >
                      <mat-option value="all">All</mat-option>
                      <mat-option value="reviewed">Reviewed</mat-option>
                      <mat-option value="unreviewed">Unreviewed</mat-option>
                    </mat-select>
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Sort</mat-label>
                    <mat-select [(ngModel)]="sort" name="sort" (selectionChange)="applyFilters()">
                      <mat-option value="newest">Newest</mat-option>
                      <mat-option value="oldest">Oldest</mat-option>
                    </mat-select>
                  </mat-form-field>
                </div>
              </div>

              @if (state.data.items.length) {
                <div class="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Timestamp</th>
                        <th>User</th>
                        <th>Module</th>
                        <th>Action</th>
                        <th>Entity</th>
                        <th>Severity</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (log of state.data.items; track log.id) {
                        <tr
                          [class.selected]="selectedLog()?.id === log.id"
                          (click)="selectLog(log)"
                          tabindex="0"
                        >
                          <td>{{ log.createdAt | date: 'medium' }}</td>
                          <td>
                            <strong>{{ log.userName }}</strong
                            ><small>{{ log.userEmail || '-' }}</small>
                          </td>
                          <td>{{ log.module }}</td>
                          <td>{{ log.action }}</td>
                          <td>
                            {{ log.entity }}<small>{{ log.entityId || '-' }}</small>
                          </td>
                          <td>
                            <span
                              class="status"
                              [class.due]="log.severity === 'Warning'"
                              [class.critical]="log.severity === 'Critical'"
                              >{{ log.severity }}</span
                            >
                          </td>
                          <td class="row-actions">
                            <button
                              mat-icon-button
                              type="button"
                              aria-label="Review log"
                              (click)="markReviewed(log); $event.stopPropagation()"
                              [disabled]="log.reviewed"
                            >
                              <mat-icon>fact_check</mat-icon>
                            </button>
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              } @else {
                <div class="empty-state">
                  <mat-icon>history</mat-icon>
                  <h2>No audit events found</h2>
                  <p>Adjust filters or create events through admin workflows.</p>
                </div>
              }

              @if (selectedLog(); as log) {
                <section class="review-panel">
                  <div>
                    <h2>Review changes</h2>
                    <p>{{ log.module }} / {{ log.action }} / {{ log.entity }}</p>
                  </div>
                  <div class="changes-grid">
                    <article>
                      <strong>Previous value</strong>
                      <pre>{{ log.previousValue || {} | json }}</pre>
                    </article>
                    <article>
                      <strong>New value</strong>
                      <pre>{{ log.newValue || {} | json }}</pre>
                    </article>
                  </div>
                </section>
              }

              <div class="pagination">
                <span
                  >Page {{ state.data.page }} of {{ totalPages(state.data) }} /
                  {{ state.data.total }} records</span
                >
                <div>
                  <button
                    mat-stroked-button
                    type="button"
                    (click)="previousPage()"
                    [disabled]="page <= 1"
                  >
                    Previous
                  </button>
                  <button
                    mat-stroked-button
                    type="button"
                    (click)="nextPage(state.data)"
                    [disabled]="page >= totalPages(state.data)"
                  >
                    Next
                  </button>
                </div>
              </div>
            </article>
          </section>
        </section>
      }
    }
  `,
  styles: [
    `
      .audit-page {
        display: grid;
        gap: 16px;
        min-width: 0;
      }
      .hero {
        display: flex;
        gap: 20px;
        align-items: flex-end;
        justify-content: space-between;
        padding: clamp(18px, 3vw, 28px);
        border-radius: 8px;
        border: 1px solid var(--aa-border);
        background:
          linear-gradient(110deg, rgba(255, 253, 249, 0.95), rgba(255, 253, 249, 0.82)),
          linear-gradient(135deg, rgba(123, 31, 53, 0.12), rgba(189, 139, 58, 0.14));
      }
      .breadcrumb {
        margin: 0 0 10px;
        color: var(--aa-maroon);
        font-size: 0.78rem;
        font-weight: 700;
      }
      .hero .muted {
        max-width: 680px;
        margin: 10px 0 0;
        font-size: 0.95rem;
        line-height: 1.55;
      }
      .hero-actions,
      .pagination,
      .pagination div {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        align-items: center;
      }
      .hero-actions {
        justify-content: flex-end;
      }
      .hero-actions button {
        min-height: 38px;
        font-size: 0.9rem;
      }
      .hero-actions button.secondary {
        background: var(--aa-plum);
      }
      .metrics {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 12px;
      }
      .metrics article,
      .table-panel,
      .state-panel,
      .success,
      .error-message,
      .review-panel {
        background: var(--aa-surface-strong);
        border: 1px solid var(--aa-border);
        border-radius: 8px;
        box-shadow: 0 10px 30px rgba(74, 31, 69, 0.07);
      }
      .metrics article {
        min-height: 94px;
        display: grid;
        align-content: space-between;
        padding: 14px 16px;
        border-top-width: 4px;
      }
      .metrics span {
        color: var(--aa-muted);
        font-size: 0.8rem;
        font-weight: 700;
      }
      .metrics strong {
        font-size: 1.25rem;
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
      .table-panel,
      .review-panel {
        display: grid;
        gap: 14px;
        padding: 18px;
        min-width: 0;
      }
      .tabs,
      .filter-strip {
        display: flex;
        gap: 8px;
        overflow-x: auto;
      }
      .filter-strip {
        align-items: center;
        flex-wrap: wrap;
      }
      .filter-strip mat-form-field {
        width: 180px;
      }
      .filter-strip mat-form-field:first-child {
        width: 240px;
      }
      .tabs button {
        min-height: 32px;
        border: 1px solid var(--aa-border);
        background: var(--aa-surface);
        color: var(--aa-text);
        border-radius: 999px;
        padding: 0 12px;
        white-space: nowrap;
        font-size: 0.88rem;
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
      h2 {
        margin: 0 0 6px;
        font-size: 1rem;
      }
      p {
        margin: 0;
        color: var(--aa-muted);
        font-size: 0.92rem;
        line-height: 1.48;
      }
      .table-wrap {
        overflow-x: auto;
      }
      table {
        width: 100%;
        min-width: 920px;
        border-collapse: collapse;
      }
      th,
      td {
        text-align: left;
        padding: 11px 10px;
        border-bottom: 1px solid var(--aa-border);
        font-size: 0.86rem;
      }
      th {
        color: var(--aa-muted);
        font-size: 0.72rem;
        text-transform: uppercase;
        letter-spacing: 0;
      }
      tbody tr {
        cursor: pointer;
      }
      tbody tr:hover,
      tbody tr.selected {
        background: #fbf7f0;
      }
      td small {
        display: block;
        color: var(--aa-muted);
        margin-top: 3px;
      }
      .status {
        display: inline-flex;
        min-height: 26px;
        align-items: center;
        padding: 0 9px;
        border-radius: 999px;
        background: rgba(123, 31, 53, 0.08);
        color: var(--aa-maroon);
        font-weight: 700;
      }
      .status.due {
        background: rgba(189, 139, 58, 0.16);
        color: #7a5521;
      }
      .status.critical {
        background: rgba(161, 36, 36, 0.12);
        color: #a12424;
      }
      .row-actions {
        white-space: nowrap;
      }
      .changes-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
      }
      .changes-grid article {
        border: 1px solid var(--aa-border);
        border-radius: 8px;
        padding: 12px;
        min-width: 0;
      }
      pre {
        overflow: auto;
        margin: 8px 0 0;
        color: var(--aa-muted);
        font-size: 0.78rem;
      }
      .pagination {
        justify-content: space-between;
        padding-top: 14px;
        color: var(--aa-muted);
        font-size: 0.88rem;
      }
      .empty-state,
      .state-panel {
        min-height: 240px;
        display: grid;
        place-items: center;
        align-content: center;
        gap: 10px;
        padding: 24px;
        text-align: center;
        color: var(--aa-muted);
      }
      .empty-state mat-icon,
      .state-panel mat-icon {
        width: 42px;
        height: 42px;
        font-size: 42px;
        color: var(--aa-maroon);
      }
      .state-panel.error mat-icon {
        color: #a12424;
      }
      .success,
      .error-message {
        margin: 0;
        padding: 12px 14px;
        font-weight: 700;
      }
      .success {
        color: var(--aa-success);
        background: rgba(40, 114, 79, 0.1);
      }
      .error-message {
        color: #a12424;
        background: rgba(161, 36, 36, 0.1);
      }
      @media (max-width: 1180px) {
        .metrics {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
        .changes-grid {
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
export class AuditLogsPageComponent {
  private readonly auditLogs = inject(AuditLogApiService);
  private readonly refreshTrigger = new BehaviorSubject<void>(undefined);

  readonly selectedTab = signal<AuditTab>('All events');
  readonly searchText = signal('');
  readonly selectedLog = signal<AuditLogDto | null>(null);
  readonly message = signal<string | null>(null);
  readonly error = signal<string | null>(null);

  readonly modules: AuditModule[] = [
    'Auth',
    'Products',
    'Inventory',
    'Invoices',
    'Payments',
    'Users',
    'Exports',
    'Settings',
    'Orders',
    'Finance',
  ];
  readonly severities: AuditSeverity[] = ['Info', 'Warning', 'Critical'];
  moduleFilter: 'all' | AuditModule = 'all';
  severityFilter: 'all' | AuditSeverity = 'all';
  reviewedFilter: 'all' | 'reviewed' | 'unreviewed' = 'all';
  sort = 'newest';
  page = 1;
  pageSize = 10;

  readonly state$ = this.refreshTrigger.pipe(
    switchMap(() =>
      this.auditLogs
        .listAuditLogs({
          search: this.searchText(),
          tab: this.tabQuery(),
          module: this.moduleFilter,
          severity: this.severityFilter,
          reviewed: this.reviewedFilter,
          sort: this.sort,
          page: this.page,
          pageSize: this.pageSize,
        })
        .pipe(
          map((data): AuditState => {
            if (!this.selectedLog() && data.items[0]) this.selectedLog.set(data.items[0]);
            return { status: 'ready', data };
          }),
          startWith({ status: 'loading' } as AuditState),
          catchError(() =>
            of({
              status: 'error',
              message: 'Check the API server and MongoDB connection, then refresh audit logs.',
            } as AuditState),
          ),
        ),
    ),
  );

  exportAudit(): void {
    this.auditLogs
      .exportAuditLogs({
        search: this.searchText(),
        tab: this.tabQuery(),
        module: this.moduleFilter,
        severity: this.severityFilter,
        reviewed: this.reviewedFilter,
        sort: this.sort,
      })
      .subscribe({
        next: (csv) => {
          const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = 'audit-logs.csv';
          link.click();
          URL.revokeObjectURL(url);
          this.message.set('Audit export downloaded.');
        },
        error: () => this.error.set('Audit export failed.'),
      });
  }

  reviewChanges(): void {
    this.reviewedFilter = 'unreviewed';
    this.applyFilters();
  }

  markReviewed(log: AuditLogDto): void {
    this.auditLogs.reviewAuditLog(log.id).subscribe({
      next: (updated) => {
        this.selectedLog.set(updated);
        this.message.set('Audit event reviewed.');
        this.refresh();
      },
      error: () => this.error.set('Audit event could not be reviewed.'),
    });
  }

  selectLog(log: AuditLogDto): void {
    this.selectedLog.set(log);
  }

  applyFilters(): void {
    this.page = 1;
    this.refresh();
  }

  onSearchChange(value: string): void {
    this.searchText.set(value);
    this.applyFilters();
  }

  selectTab(tab: AuditTab): void {
    this.selectedTab.set(tab);
    this.page = 1;
    this.refresh();
  }

  previousPage(): void {
    this.page = Math.max(this.page - 1, 1);
    this.refresh();
  }

  nextPage(data: AuditLogListDto): void {
    this.page = Math.min(this.page + 1, this.totalPages(data));
    this.refresh();
  }

  tabs(data: AuditLogListDto) {
    return [
      { label: 'All events' as const, count: data.summary.totalEvents },
      { label: 'Security' as const, count: data.summary.security },
      { label: 'Inventory' as const, count: data.summary.inventory },
      { label: 'Finance' as const, count: data.summary.finance },
    ];
  }

  totalPages(data: AuditLogListDto): number {
    return Math.max(Math.ceil(data.total / data.pageSize), 1);
  }

  private refresh(): void {
    this.refreshTrigger.next();
  }

  private tabQuery(): 'all' | 'security' | 'inventory' | 'finance' {
    if (this.selectedTab() === 'Security') return 'security';
    if (this.selectedTab() === 'Inventory') return 'inventory';
    if (this.selectedTab() === 'Finance') return 'finance';
    return 'all';
  }
}
