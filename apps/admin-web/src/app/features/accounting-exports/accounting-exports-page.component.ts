import { AsyncPipe, DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import type {
  AccountingExportDto,
  AccountingExportFormat,
  AccountingExportListDto,
  AccountingExportStatus,
  AccountingVoucherType,
  CreateAccountingExportDto,
  CreateLedgerMappingDto,
  LedgerMappingDto,
} from '@aayu-aura/shared-types';
import { BehaviorSubject, catchError, map, of, startWith, switchMap } from 'rxjs';
import { AccountingExportApiService } from './accounting-export-api.service';

type TallyState =
  | { status: 'loading' }
  | { status: 'ready'; data: AccountingExportListDto }
  | { status: 'error'; message: string };

type TallyTab = 'Mappings' | 'Ready' | 'Export history' | 'Errors';

@Component({
  selector: 'aa-accounting-exports-page',
  standalone: true,
  imports: [
    AsyncPipe,
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
          <h1>Loading Tally Export</h1>
          <p>Reading ledger mappings and export history from MongoDB.</p>
        </section>
      } @else if (state.status === 'error') {
        <section class="state-panel error" role="alert">
          <mat-icon>error</mat-icon>
          <h1>Tally Export unavailable</h1>
          <p>{{ state.message }}</p>
        </section>
      } @else {
        <section class="tally-page">
          <div class="hero">
            <div>
              <p class="breadcrumb">Home / Tally Export</p>
              <h1 class="page-title">Tally Export</h1>
              <p class="muted">
                Map ledgers and export sales, purchases, receipts, payments, notes, expenses, and
                inventory movements for Tally.
              </p>
            </div>
            <div class="hero-actions">
              <button mat-flat-button color="primary" type="button" (click)="generateExport()">
                <mat-icon>ios_share</mat-icon>
                Generate export
              </button>
              <button
                class="secondary"
                mat-flat-button
                color="primary"
                type="button"
                (click)="mapLedger()"
              >
                <mat-icon>account_tree</mat-icon>
                Map ledgers
              </button>
            </div>
          </div>

          <section class="metrics" aria-label="Tally export summary">
            <article class="maroon">
              <span>Mapped ledgers</span><strong>{{ state.data.summary.mappedLedgers }}</strong>
            </article>
            <article class="plum">
              <span>Pending mappings</span><strong>{{ state.data.summary.pendingMappings }}</strong>
            </article>
            <article class="gold">
              <span>Exports</span><strong>{{ state.data.summary.exports }}</strong>
            </article>
            <article class="green">
              <span>Ready records</span><strong>{{ state.data.summary.readyRecords }}</strong>
            </article>
          </section>

          <section class="forms-grid">
            <article class="panel">
              <div>
                <h2>Map ledgers</h2>
                <p>Map app values to Tally ledgers and voucher types.</p>
              </div>
              <div class="form-grid">
                <mat-form-field appearance="outline">
                  <mat-label>Source type</mat-label>
                  <mat-select [(ngModel)]="mappingForm.sourceType" name="sourceType">
                    @for (source of sourceTypes; track source) {
                      <mat-option [value]="source">{{ source }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Source value</mat-label>
                  <input matInput [(ngModel)]="mappingForm.sourceValue" name="sourceValue" />
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Tally ledger</mat-label>
                  <input matInput [(ngModel)]="mappingForm.tallyLedgerName" name="tallyLedger" />
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Voucher type</mat-label>
                  <mat-select [(ngModel)]="mappingForm.voucherType" name="mappingVoucherType">
                    @for (voucher of voucherTypes; track voucher) {
                      <mat-option [value]="voucher">{{ voucher }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Tax ledger</mat-label>
                  <input matInput [(ngModel)]="mappingForm.taxLedgerName" name="taxLedger" />
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Notes</mat-label>
                  <input matInput [(ngModel)]="mappingForm.notes" name="mappingNotes" />
                </mat-form-field>
              </div>
            </article>

            <article class="panel">
              <div>
                <h2>Generate export</h2>
                <p>Select date range, validate mappings, generate file, and save history.</p>
              </div>
              <div class="form-grid">
                <mat-form-field appearance="outline">
                  <mat-label>From date</mat-label>
                  <input matInput type="date" [(ngModel)]="fromDate" name="fromDate" />
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>To date</mat-label>
                  <input matInput type="date" [(ngModel)]="toDate" name="toDate" />
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Format</mat-label>
                  <mat-select [(ngModel)]="exportForm.format" name="exportFormat">
                    @for (format of formats; track format) {
                      <mat-option [value]="format">{{ format }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Voucher type</mat-label>
                  <mat-select [(ngModel)]="exportForm.voucherType" name="exportVoucherType">
                    <mat-option value="all">All</mat-option>
                    @for (voucher of voucherTypes; track voucher) {
                      <mat-option [value]="voucher">{{ voucher }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
                <mat-form-field appearance="outline" class="wide">
                  <mat-label>Notes</mat-label>
                  <input matInput [(ngModel)]="exportForm.notes" name="exportNotes" />
                </mat-form-field>
              </div>
            </article>
          </section>

          @if (message()) {
            <p class="success" role="status">{{ message() }}</p>
          }
          @if (error()) {
            <p class="error-message" role="alert">{{ error() }}</p>
          }

          <div class="tabs" aria-label="Tally export tabs">
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
                    Search, voucher type, status, format, sorting, pagination, and downloads are
                    API-backed.
                  </p>
                </div>
                <div class="filter-strip" aria-label="Tally export filters">
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
                    <mat-label>Voucher type</mat-label>
                    <mat-select
                      [(ngModel)]="voucherTypeFilter"
                      name="voucherFilter"
                      (selectionChange)="applyFilters()"
                    >
                      <mat-option value="all">All</mat-option>
                      @for (voucher of voucherTypes; track voucher) {
                        <mat-option [value]="voucher">{{ voucher }}</mat-option>
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
                    <mat-label>Format</mat-label>
                    <mat-select
                      [(ngModel)]="formatFilter"
                      name="formatFilter"
                      (selectionChange)="applyFilters()"
                    >
                      <mat-option value="all">All</mat-option>
                      @for (format of formats; track format) {
                        <mat-option [value]="format">{{ format }}</mat-option>
                      }
                    </mat-select>
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Sort</mat-label>
                    <mat-select [(ngModel)]="sort" name="sort" (selectionChange)="applyFilters()">
                      <mat-option value="newest">Newest</mat-option>
                      <mat-option value="oldest">Oldest</mat-option>
                      <mat-option value="records_desc">Records high first</mat-option>
                      <mat-option value="records_asc">Records low first</mat-option>
                    </mat-select>
                  </mat-form-field>
                </div>
              </div>

              @if (selectedTab() === 'Mappings') {
                @if (state.data.mappings.length) {
                  <div class="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Source</th>
                          <th>Tally ledger</th>
                          <th>Voucher type</th>
                          <th>Tax ledger</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        @for (mapping of state.data.mappings; track mapping.id) {
                          <tr>
                            <td>
                              <strong>{{ mapping.sourceValue }}</strong>
                              <small>{{ mapping.sourceType }}</small>
                            </td>
                            <td>{{ mapping.tallyLedgerName }}</td>
                            <td>{{ mapping.voucherType }}</td>
                            <td>{{ mapping.taxLedgerName || '-' }}</td>
                            <td>
                              <span class="status" [class.inactive]="!mapping.isActive">{{
                                mapping.isActive ? 'Mapped' : 'Inactive'
                              }}</span>
                            </td>
                            <td class="row-actions">
                              <button
                                mat-icon-button
                                type="button"
                                aria-label="Edit mapping"
                                (click)="editMapping(mapping)"
                              >
                                <mat-icon>edit</mat-icon>
                              </button>
                              <button
                                mat-icon-button
                                type="button"
                                aria-label="Deactivate mapping"
                                (click)="deactivateMapping(mapping)"
                                [disabled]="!mapping.isActive"
                              >
                                <mat-icon>block</mat-icon>
                              </button>
                            </td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  </div>
                } @else {
                  <div class="empty-state">
                    <mat-icon>account_tree</mat-icon>
                    <h2>No ledger mappings found</h2>
                    <p>Map a ledger or adjust filters.</p>
                  </div>
                }
              } @else {
                @if (state.data.exports.length) {
                  <div class="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Export ID</th>
                          <th>Range</th>
                          <th>Format</th>
                          <th>Records</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        @for (record of state.data.exports; track record.id) {
                          <tr>
                            <td>
                              <strong>{{ record.exportNumber }}</strong>
                              <small>{{ record.voucherType }}</small>
                            </td>
                            <td>
                              {{ record.fromDate | date: 'mediumDate' }} to
                              {{ record.toDate | date: 'mediumDate' }}
                            </td>
                            <td>{{ record.format }}</td>
                            <td>{{ record.records }}</td>
                            <td>
                              <span
                                class="status"
                                [class.due]="record.status === 'Validation pending'"
                                [class.inactive]="record.status === 'Archived'"
                                >{{ record.status }}</span
                              >
                            </td>
                            <td class="row-actions">
                              <button
                                mat-icon-button
                                type="button"
                                aria-label="Download export"
                                (click)="downloadExport(record)"
                              >
                                <mat-icon>download</mat-icon>
                              </button>
                              <button
                                mat-icon-button
                                type="button"
                                aria-label="Archive export"
                                (click)="archiveExport(record)"
                                [disabled]="record.status === 'Archived'"
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
                    <mat-icon>ios_share</mat-icon>
                    <h2>No exports found</h2>
                    <p>Generate an export or adjust filters.</p>
                  </div>
                }
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
      .tally-page {
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
      .metrics,
      .forms-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 12px;
      }
      .forms-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
      .metrics article,
      .panel,
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
      .panel,
      .table-panel {
        display: grid;
        gap: 14px;
        padding: 18px;
        min-width: 0;
      }
      .form-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
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
        .metrics,
        .forms-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }
      @media (max-width: 780px) {
        .hero,
        .forms-grid {
          grid-template-columns: 1fr;
        }
        .hero {
          flex-direction: column;
          align-items: stretch;
        }
        .hero-actions {
          justify-content: flex-start;
        }
        .metrics,
        .form-grid {
          grid-template-columns: 1fr;
        }
        .form-grid .wide {
          grid-column: auto;
        }
      }
    `,
  ],
})
export class AccountingExportsPageComponent {
  private readonly accountingExports = inject(AccountingExportApiService);
  private readonly refreshTrigger = new BehaviorSubject<void>(undefined);

  readonly selectedTab = signal<TallyTab>('Mappings');
  readonly searchText = signal('');
  readonly message = signal<string | null>(null);
  readonly error = signal<string | null>(null);
  readonly voucherTypes: AccountingVoucherType[] = [
    'Sales',
    'Purchase',
    'Receipt',
    'Payment',
    'Debit Note',
    'Credit Note',
    'Journal',
    'Stock Journal',
  ];
  readonly formats: AccountingExportFormat[] = ['XML', 'CSV', 'Excel', 'JSON'];
  readonly statuses: AccountingExportStatus[] = [
    'Validation pending',
    'Generated',
    'Failed',
    'Archived',
  ];
  readonly sourceTypes = [
    'Product Category',
    'Expense Category',
    'Payment Method',
    'Order Source',
    'Supplier',
    'Customer',
    'Tax',
  ];

  voucherTypeFilter: 'all' | AccountingVoucherType = 'all';
  statusFilter: 'all' | AccountingExportStatus = 'all';
  formatFilter: 'all' | AccountingExportFormat = 'all';
  sort = 'newest';
  page = 1;
  pageSize = 10;
  editingMappingId: string | null = null;
  fromDate = '';
  toDate = '';
  mappingForm: CreateLedgerMappingDto = this.emptyMappingForm();
  exportForm: CreateAccountingExportDto = {
    format: 'XML',
    voucherType: 'all',
    notes: '',
  };

  readonly state$ = this.refreshTrigger.pipe(
    switchMap(() =>
      this.accountingExports
        .listAccountingExports({
          search: this.searchText(),
          tab: this.tabQuery(),
          voucherType: this.voucherTypeFilter,
          status: this.statusFilter,
          format: this.formatFilter,
          sort: this.sort,
          page: this.page,
          pageSize: this.pageSize,
        })
        .pipe(
          map((data): TallyState => ({ status: 'ready', data })),
          startWith({ status: 'loading' } as TallyState),
          catchError(() =>
            of({
              status: 'error',
              message: 'Check the API server and MongoDB connection, then refresh Tally Export.',
            } as TallyState),
          ),
        ),
    ),
  );

  mapLedger(): void {
    if (!this.mappingForm.sourceValue.trim() || !this.mappingForm.tallyLedgerName.trim()) {
      this.error.set('Source value and Tally ledger are required.');
      return;
    }
    this.error.set(null);
    this.message.set(null);
    const request = this.editingMappingId
      ? this.accountingExports.updateMapping(this.editingMappingId, this.mappingForm)
      : this.accountingExports.createMapping(this.mappingForm);
    request.subscribe({
      next: () => {
        this.message.set(this.editingMappingId ? 'Ledger mapping updated.' : 'Ledger mapped.');
        this.editingMappingId = null;
        this.mappingForm = this.emptyMappingForm();
        this.selectedTab.set('Mappings');
        this.refresh();
      },
      error: () =>
        this.error.set('Ledger mapping could not be saved. Check duplicate source values.'),
    });
  }

  generateExport(): void {
    this.error.set(null);
    this.message.set(null);
    this.accountingExports.createExport(this.exportPayload()).subscribe({
      next: () => {
        this.message.set('Accounting export generated.');
        this.selectedTab.set('Export history');
        this.page = 1;
        this.refresh();
      },
      error: () => this.error.set('Accounting export could not be generated.'),
    });
  }

  editMapping(mapping: LedgerMappingDto): void {
    this.editingMappingId = mapping.id;
    this.mappingForm = {
      sourceType: mapping.sourceType,
      sourceValue: mapping.sourceValue,
      tallyLedgerName: mapping.tallyLedgerName,
      voucherType: mapping.voucherType,
      taxLedgerName: mapping.taxLedgerName ?? '',
      isActive: mapping.isActive,
      notes: mapping.notes ?? '',
    };
  }

  deactivateMapping(mapping: LedgerMappingDto): void {
    this.accountingExports.deactivateMapping(mapping.id).subscribe({
      next: () => {
        this.message.set('Ledger mapping deactivated.');
        this.refresh();
      },
      error: () => this.error.set('Ledger mapping could not be deactivated.'),
    });
  }

  archiveExport(record: AccountingExportDto): void {
    this.accountingExports.archiveExport(record.id).subscribe({
      next: () => {
        this.message.set('Export archived.');
        this.refresh();
      },
      error: () => this.error.set('Export could not be archived.'),
    });
  }

  downloadExport(record: AccountingExportDto): void {
    this.accountingExports.downloadExport(record.id).subscribe({
      next: (response) => {
        const blob = new Blob([response.body ?? ''], {
          type: response.headers.get('content-type') ?? 'text/plain',
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = record.fileName ?? `${record.exportNumber}.csv`;
        link.click();
        URL.revokeObjectURL(url);
        this.message.set('Export downloaded.');
      },
      error: () => this.error.set('Export download failed.'),
    });
  }

  applyFilters(): void {
    this.page = 1;
    this.refresh();
  }

  onSearchChange(value: string): void {
    this.searchText.set(value);
    this.applyFilters();
  }

  selectTab(tab: TallyTab): void {
    this.selectedTab.set(tab);
    this.page = 1;
    this.refresh();
  }

  previousPage(): void {
    this.page = Math.max(this.page - 1, 1);
    this.refresh();
  }

  nextPage(data: AccountingExportListDto): void {
    this.page = Math.min(this.page + 1, this.totalPages(data));
    this.refresh();
  }

  tabs(data: AccountingExportListDto) {
    return [
      {
        label: 'Mappings' as const,
        count: data.summary.mappedLedgers + data.summary.pendingMappings,
      },
      { label: 'Ready' as const, count: data.summary.readyRecords },
      { label: 'Export history' as const, count: data.summary.exports },
      { label: 'Errors' as const, count: data.summary.errors },
    ];
  }

  totalPages(data: AccountingExportListDto): number {
    return Math.max(Math.ceil(data.total / data.pageSize), 1);
  }

  private refresh(): void {
    this.refreshTrigger.next();
  }

  private tabQuery(): 'mappings' | 'ready' | 'history' | 'errors' {
    if (this.selectedTab() === 'Mappings') return 'mappings';
    if (this.selectedTab() === 'Ready') return 'ready';
    if (this.selectedTab() === 'Errors') return 'errors';
    return 'history';
  }

  private exportPayload(): CreateAccountingExportDto {
    return {
      ...this.exportForm,
      fromDate: this.fromDate
        ? new Date(`${this.fromDate}T00:00:00.000Z`).toISOString()
        : undefined,
      toDate: this.toDate ? new Date(`${this.toDate}T23:59:59.999Z`).toISOString() : undefined,
    };
  }

  private emptyMappingForm(): CreateLedgerMappingDto {
    return {
      sourceType: 'Product Category',
      sourceValue: '',
      tallyLedgerName: '',
      voucherType: 'Sales',
      taxLedgerName: '',
      isActive: true,
      notes: '',
    };
  }
}
