import { AsyncPipe, CurrencyPipe, DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import type {
  CreateReportRunDto,
  ReportCategory,
  ReportFormat,
  ReportPeriod,
  ReportRunDto,
  ReportStatus,
  ReportsListDto,
} from '@aayu-aura/shared-types';
import { BehaviorSubject, catchError, map, of, startWith, switchMap } from 'rxjs';
import { ReportApiService } from './report-api.service';

type ReportsState =
  | { status: 'loading' }
  | { status: 'ready'; data: ReportsListDto }
  | { status: 'error'; message: string };

const reportNames: Record<ReportCategory, string> = {
  Sales: 'Sales performance report',
  Inventory: 'Inventory health report',
  Finance: 'Profit and loss report',
  GST: 'GST summary report',
};

@Component({
  selector: 'aa-reports-page',
  standalone: true,
  imports: [
    AsyncPipe,
    CurrencyPipe,
    DatePipe,
    FormsModule,
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
          <h1>Loading reports</h1>
          <p>Reading analytics and report history from MongoDB.</p>
        </section>
      } @else if (state.status === 'error') {
        <section class="state-panel error" role="alert">
          <mat-icon>error</mat-icon>
          <h1>Reports unavailable</h1>
          <p>{{ state.message }}</p>
        </section>
      } @else {
        <section class="reports-page">
          <div class="hero">
            <div>
              <p class="breadcrumb">Home / Reports</p>
              <h1 class="page-title">Reports</h1>
              <p class="muted">
                View dashboard analytics, monthly sales, profit and loss, GST, inventory, purchases,
                customers, and exports.
              </p>
            </div>
            <div class="hero-actions">
              <button mat-flat-button color="primary" type="button" (click)="runReport()">
                <mat-icon>analytics</mat-icon>
                Run report
              </button>
              <button
                class="secondary"
                mat-flat-button
                color="primary"
                type="button"
                (click)="exportCsv()"
              >
                <mat-icon>table_view</mat-icon>
                Export Excel
              </button>
            </div>
          </div>

          <section class="metrics" aria-label="Reports summary">
            <article class="maroon">
              <span>Month sales</span
              ><strong>{{
                rupees(state.data.summary.monthSalesInPaise) | currency: 'INR' : 'symbol' : '1.0-0'
              }}</strong>
            </article>
            <article class="plum">
              <span>Gross profit</span
              ><strong>{{
                rupees(state.data.summary.grossProfitInPaise) | currency: 'INR' : 'symbol' : '1.0-0'
              }}</strong>
            </article>
            <article class="gold">
              <span>Expenses</span
              ><strong>{{
                rupees(state.data.summary.expensesInPaise) | currency: 'INR' : 'symbol' : '1.0-0'
              }}</strong>
            </article>
            <article class="green">
              <span>Net profit</span
              ><strong>{{
                rupees(state.data.summary.netProfitInPaise) | currency: 'INR' : 'symbol' : '1.0-0'
              }}</strong>
            </article>
          </section>

          <section class="run-panel">
            <div>
              <h2>Run report</h2>
              <p>
                Select category, period, and format. The generated report run persists to MongoDB.
              </p>
            </div>
            <div class="form-grid">
              <mat-form-field appearance="outline">
                <mat-label>Report</mat-label>
                <input matInput [(ngModel)]="form.reportName" name="reportName" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Category</mat-label>
                <mat-select
                  [(ngModel)]="form.category"
                  name="reportCategory"
                  (selectionChange)="syncName()"
                >
                  @for (category of categories; track category) {
                    <mat-option [value]="category">{{ category }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Period</mat-label>
                <mat-select [(ngModel)]="form.period" name="reportPeriod">
                  @for (period of periods; track period.value) {
                    <mat-option [value]="period.value">{{ period.label }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Export formats</mat-label>
                <mat-select [(ngModel)]="form.formats" name="reportFormats" multiple>
                  @for (format of formats; track format) {
                    <mat-option [value]="format">{{ format }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline" class="wide">
                <mat-label>Notes</mat-label>
                <input matInput [(ngModel)]="form.notes" name="reportNotes" />
              </mat-form-field>
            </div>
          </section>

          @if (message()) {
            <p class="success" role="status">{{ message() }}</p>
          }
          @if (error()) {
            <p class="error-message" role="alert">{{ error() }}</p>
          }

          <div class="tabs" aria-label="Report tabs">
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
                    Search, period filters, status filters, sorting, pagination, archive, and export
                    are connected to the API.
                  </p>
                </div>
                <div class="filter-strip" aria-label="Report filters">
                  <mat-form-field appearance="outline">
                    <mat-label>Search</mat-label>
                    <input
                      matInput
                      [ngModel]="searchText()"
                      (ngModelChange)="onSearchChange($event)"
                      name="reportSearch"
                    />
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Period</mat-label>
                    <mat-select
                      [(ngModel)]="periodFilter"
                      name="periodFilter"
                      (selectionChange)="applyFilters()"
                    >
                      <mat-option value="all">All</mat-option>
                      @for (period of periods; track period.value) {
                        <mat-option [value]="period.value">{{ period.label }}</mat-option>
                      }
                    </mat-select>
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Status</mat-label>
                    <mat-select
                      [(ngModel)]="statusFilter"
                      name="statusFilter"
                      (selectionChange)="applyFilters()"
                    >
                      <mat-option value="all">All</mat-option>
                      @for (status of statuses; track status) {
                        <mat-option [value]="status">{{ status }}</mat-option>
                      }
                    </mat-select>
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Sort</mat-label>
                    <mat-select
                      [(ngModel)]="sort"
                      name="reportSort"
                      (selectionChange)="applyFilters()"
                    >
                      <mat-option value="newest">Newest</mat-option>
                      <mat-option value="oldest">Oldest</mat-option>
                      <mat-option value="records_desc">Records high first</mat-option>
                      <mat-option value="records_asc">Records low first</mat-option>
                    </mat-select>
                  </mat-form-field>
                </div>
              </div>

              @if (state.data.items.length) {
                <div class="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Report</th>
                        <th>Period</th>
                        <th>Records</th>
                        <th>Export formats</th>
                        <th>Status</th>
                        <th>Generated</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (report of state.data.items; track report.id) {
                        <tr
                          [class.selected]="selectedReport()?.id === report.id"
                          (click)="selectedReport.set(report)"
                          tabindex="0"
                        >
                          <td>
                            <strong>{{ report.reportName }}</strong>
                            <small
                              >{{ report.category
                              }}{{ report.notes ? ' / ' + report.notes : '' }}</small
                            >
                          </td>
                          <td>{{ report.periodLabel }}</td>
                          <td>{{ report.records }}</td>
                          <td>{{ report.formats.join(', ') }}</td>
                          <td>
                            <span
                              class="status"
                              [class.inactive]="report.status === 'Archived'"
                              [class.due]="report.status === 'Draft'"
                            >
                              {{ report.status }}
                            </span>
                          </td>
                          <td>{{ report.generatedAt | date: 'mediumDate' }}</td>
                          <td class="row-actions">
                            <button
                              mat-icon-button
                              type="button"
                              aria-label="Archive report"
                              (click)="archiveReport(report); $event.stopPropagation()"
                              [disabled]="report.status === 'Archived'"
                            >
                              <mat-icon>archive</mat-icon>
                            </button>
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              } @else {
                <div class="empty-state">
                  <mat-icon>query_stats</mat-icon>
                  <h2>No report runs found</h2>
                  <p>Run a report or adjust search and filters.</p>
                </div>
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
      .reports-page {
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
      .run-panel,
      .table-panel,
      .state-panel,
      .success,
      .error-message {
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
      .run-panel,
      .table-panel {
        display: grid;
        gap: 14px;
        padding: 18px;
        min-width: 0;
      }
      .form-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 12px;
      }
      .form-grid .wide {
        grid-column: span 2;
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
        width: 190px;
      }
      .filter-strip mat-form-field:first-child {
        width: 260px;
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
      .content-grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: 16px;
        align-items: start;
      }
      .panel-heading {
        display: grid;
        gap: 12px;
        margin-bottom: 4px;
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
        min-width: 900px;
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
      .status.inactive {
        background: rgba(108, 100, 102, 0.12);
        color: var(--aa-muted);
      }
      .row-actions {
        white-space: nowrap;
      }
      .pagination {
        justify-content: space-between;
        padding-top: 14px;
        color: var(--aa-muted);
        font-size: 0.88rem;
      }
      .empty-state,
      .state-panel {
        min-height: 260px;
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
        .form-grid {
          grid-template-columns: 1fr;
        }
        .form-grid .wide {
          grid-column: auto;
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
export class ReportsPageComponent {
  private readonly reports = inject(ReportApiService);
  private readonly refreshTrigger = new BehaviorSubject<void>(undefined);

  readonly selectedReport = signal<ReportRunDto | null>(null);
  readonly selectedTab = signal<ReportCategory>('Sales');
  readonly searchText = signal('');
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly message = signal<string | null>(null);

  readonly categories: ReportCategory[] = ['Sales', 'Inventory', 'Finance', 'GST'];
  readonly formats: ReportFormat[] = ['CSV', 'Excel', 'PDF'];
  readonly statuses: ReportStatus[] = ['Ready', 'Draft', 'Failed', 'Archived'];
  readonly periods: { label: string; value: ReportPeriod }[] = [
    { label: 'Today', value: 'today' },
    { label: 'Last 7 days', value: 'last_7_days' },
    { label: 'Current month', value: 'current_month' },
    { label: 'Previous month', value: 'previous_month' },
    { label: 'Financial year', value: 'financial_year' },
  ];

  categoryFilter: 'all' | ReportCategory = 'Sales';
  statusFilter: 'all' | ReportStatus = 'all';
  periodFilter: 'all' | ReportPeriod = 'current_month';
  sort = 'newest';
  page = 1;
  pageSize = 10;
  form: CreateReportRunDto = {
    reportName: reportNames.Sales,
    category: 'Sales',
    period: 'current_month',
    formats: ['CSV', 'Excel'],
    notes: '',
  };

  readonly state$ = this.refreshTrigger.pipe(
    switchMap(() =>
      this.reports
        .listReports({
          search: this.searchText(),
          category: this.categoryFilter,
          status: this.statusFilter,
          period: this.periodFilter,
          sort: this.sort,
          page: this.page,
          pageSize: this.pageSize,
        })
        .pipe(
          map((data): ReportsState => {
            if (!this.selectedReport() && data.items[0]) this.selectedReport.set(data.items[0]);
            return { status: 'ready', data };
          }),
          startWith({ status: 'loading' } as ReportsState),
          catchError(() =>
            of({
              status: 'error',
              message: 'Check the API server and MongoDB connection, then refresh reports.',
            } as ReportsState),
          ),
        ),
    ),
  );

  runReport(): void {
    if (!this.form.reportName.trim()) {
      this.error.set('Report name is required.');
      return;
    }
    if (!this.form.formats?.length) {
      this.error.set('Select at least one export format.');
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    this.message.set(null);
    this.reports.createReport(this.form).subscribe({
      next: (report) => {
        this.saving.set(false);
        this.selectedReport.set(report);
        this.message.set('Report generated.');
        this.page = 1;
        this.categoryFilter = report.category;
        this.selectedTab.set(report.category);
        this.refresh();
      },
      error: () => {
        this.saving.set(false);
        this.error.set('Report could not be generated.');
      },
    });
  }

  archiveReport(report: ReportRunDto): void {
    this.reports.archiveReport(report.id).subscribe({
      next: (updated) => {
        this.selectedReport.set(updated);
        this.message.set('Report archived.');
        this.refresh();
      },
      error: () => this.error.set('Report could not be archived.'),
    });
  }

  exportCsv(): void {
    this.reports
      .exportReports({
        search: this.searchText(),
        category: this.categoryFilter,
        status: this.statusFilter,
        period: this.periodFilter,
        sort: this.sort,
      })
      .subscribe({
        next: (csv) => {
          const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = 'reports.csv';
          link.click();
          URL.revokeObjectURL(url);
          this.message.set('Reports export downloaded.');
        },
        error: () => this.error.set('Reports export failed.'),
      });
  }

  syncName(): void {
    if (!this.form.reportName.trim() || Object.values(reportNames).includes(this.form.reportName)) {
      this.form.reportName = reportNames[this.form.category];
    }
  }

  applyFilters(): void {
    this.page = 1;
    this.refresh();
  }

  onSearchChange(value: string): void {
    this.searchText.set(value);
    this.applyFilters();
  }

  selectTab(tab: ReportCategory): void {
    this.selectedTab.set(tab);
    this.categoryFilter = tab;
    this.form.category = tab;
    this.syncName();
    this.applyFilters();
  }

  previousPage(): void {
    this.page = Math.max(this.page - 1, 1);
    this.refresh();
  }

  nextPage(data: ReportsListDto): void {
    this.page = Math.min(this.page + 1, this.totalPages(data));
    this.refresh();
  }

  tabs(data: ReportsListDto) {
    return [
      { label: 'Sales' as const, count: data.summary.salesReports },
      { label: 'Inventory' as const, count: data.summary.inventoryReports },
      { label: 'Finance' as const, count: data.summary.financeReports },
      { label: 'GST' as const, count: data.summary.gstReports },
    ];
  }

  totalPages(data: ReportsListDto): number {
    return Math.max(Math.ceil(data.total / data.pageSize), 1);
  }

  rupees(valueInPaise: number): number {
    return valueInPaise / 100;
  }

  private refresh(): void {
    this.refreshTrigger.next();
  }
}
