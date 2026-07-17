import { AsyncPipe, CurrencyPipe, DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import type {
  CreateReturnRequestDto,
  InspectionResult,
  OrderDto,
  ReturnRequestDto,
  ReturnsListDto,
  ReturnStatus,
} from '@aayu-aura/shared-types';
import { BehaviorSubject, catchError, map, of, startWith, switchMap } from 'rxjs';
import { ReturnApiService } from './return-api.service';

type ReturnsState =
  | { status: 'loading' }
  | { status: 'ready'; data: ReturnsListDto }
  | { status: 'error'; message: string };

type ReturnStatusFilter = 'all' | ReturnStatus;
type ReturnSegment = 'requests' | 'inspection' | 'refunds' | 'closed';

@Component({
  selector: 'aa-returns-page',
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
          <h1>Loading returns</h1>
          <p>Reading return requests and exchange records from MongoDB.</p>
        </section>
      } @else if (state.status === 'error') {
        <section class="state-panel error" role="alert">
          <mat-icon>error</mat-icon>
          <h1>Returns unavailable</h1>
          <p>{{ state.message }}</p>
        </section>
      } @else {
        <section class="returns-page">
          <div class="hero">
            <div>
              <p class="breadcrumb">Home / Returns & Exchanges</p>
              <h1 class="page-title">Returns & Exchanges</h1>
              <p class="muted">
                Process return requests, inspections, exchange orders, refunds, credit notes, and
                return-to-stock decisions.
              </p>
            </div>
            <div class="hero-actions">
              <button mat-flat-button color="primary" type="button" (click)="startReturn()">
                <mat-icon>assignment_return</mat-icon>
                Process return
              </button>
              <button
                class="secondary"
                mat-flat-button
                color="primary"
                type="button"
                (click)="startExchange()"
              >
                <mat-icon>sync_alt</mat-icon>
                Create exchange
              </button>
            </div>
          </div>

          <section class="metrics" aria-label="Returns summary">
            <article class="maroon">
              <span>Return requests</span><strong>{{ state.data.summary.returnRequests }}</strong>
            </article>
            <article class="plum">
              <span>Awaiting inspect</span><strong>{{ state.data.summary.awaitingInspect }}</strong>
            </article>
            <article class="gold">
              <span>Refund due</span
              ><strong>{{
                rupees(state.data.summary.refundDueInPaise) | currency: 'INR' : 'symbol' : '1.0-0'
              }}</strong>
            </article>
            <article class="green">
              <span>Exchanges</span><strong>{{ state.data.summary.exchanges }}</strong>
            </article>
          </section>

          @if (showForm()) {
            <section class="return-form">
              <div>
                <h2>
                  {{
                    editingReturnId()
                      ? 'Update return'
                      : exchangeMode()
                        ? 'Create exchange'
                        : 'Process return'
                  }}
                </h2>
                <p>Order snapshot, inspection, refund, and exchange details persist to MongoDB.</p>
              </div>
              <div class="form-grid">
                <mat-form-field appearance="outline">
                  <mat-label>Order</mat-label>
                  <mat-select
                    [(ngModel)]="form.orderId"
                    name="returnOrder"
                    [disabled]="isEditing()"
                  >
                    @for (order of state.data.orders; track order.id) {
                      <mat-option [value]="order.id"
                        >{{ order.orderNumber }} / {{ order.customer.name }}</mat-option
                      >
                    }
                  </mat-select>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Reason</mat-label>
                  <input matInput [(ngModel)]="form.reason" name="returnReason" />
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Status</mat-label>
                  <mat-select [(ngModel)]="form.status" name="returnStatus">
                    @for (status of statusOptions; track status) {
                      <mat-option [value]="status">{{ status }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Inspection result</mat-label>
                  <mat-select [(ngModel)]="form.inspectionResult" name="inspectionResult">
                    @for (result of inspectionOptions; track result) {
                      <mat-option [value]="result">{{ result }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Resolution</mat-label>
                  <mat-select [(ngModel)]="form.resolution" name="resolution">
                    <mat-option value="Refund">Refund</mat-option>
                    <mat-option value="Exchange">Exchange</mat-option>
                    <mat-option value="Store credit">Store credit</mat-option>
                    <mat-option value="Reject">Reject</mat-option>
                  </mat-select>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Refund amount</mat-label>
                  <input matInput type="number" [(ngModel)]="refundAmount" name="refundAmount" />
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Exchange product</mat-label>
                  <input matInput [(ngModel)]="form.exchangeProductName" name="exchangeProduct" />
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Exchange SKU</mat-label>
                  <input matInput [(ngModel)]="form.exchangeSku" name="exchangeSku" />
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Exchange adjustment</mat-label>
                  <input
                    matInput
                    type="number"
                    [(ngModel)]="exchangeAmount"
                    name="exchangeAmount"
                  />
                </mat-form-field>
                <mat-form-field appearance="outline" class="wide">
                  <mat-label>Notes</mat-label>
                  <input matInput [(ngModel)]="form.notes" name="returnNotes" />
                </mat-form-field>
              </div>
              <div class="form-actions">
                <button
                  mat-flat-button
                  color="primary"
                  type="button"
                  (click)="saveReturn()"
                  [disabled]="saving()"
                >
                  <mat-icon>{{ exchangeMode() ? 'sync_alt' : 'save' }}</mat-icon>
                  {{ saving() ? 'Saving...' : exchangeMode() ? 'Create exchange' : 'Save return' }}
                </button>
                <button mat-stroked-button type="button" (click)="resetForm()">
                  <mat-icon>close</mat-icon>
                  Clear
                </button>
              </div>
            </section>
          }

          @if (message()) {
            <p class="success" role="status">{{ message() }}</p>
          }
          @if (error()) {
            <p class="error-message" role="alert">{{ error() }}</p>
          }

          <div class="tabs" aria-label="Return tabs">
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
                    Search, filters, sorting, pagination, return edits, and exchanges are connected
                    to the API.
                  </p>
                </div>
                <div class="filter-strip" aria-label="Return filters">
                  <mat-form-field appearance="outline">
                    <mat-label>Search</mat-label>
                    <input
                      matInput
                      [ngModel]="searchText()"
                      (ngModelChange)="onSearchChange($event)"
                      name="returnSearch"
                    />
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Return status</mat-label>
                    <mat-select
                      [(ngModel)]="statusFilter"
                      name="statusFilter"
                      (selectionChange)="applyFilters()"
                    >
                      <mat-option value="all">All</mat-option>
                      @for (status of statusOptions; track status) {
                        <mat-option [value]="status">{{ status }}</mat-option>
                      }
                    </mat-select>
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Inspection result</mat-label>
                    <mat-select
                      [(ngModel)]="inspectionFilter"
                      name="inspectionFilter"
                      (selectionChange)="applyFilters()"
                    >
                      <mat-option value="all">All</mat-option>
                      @for (result of inspectionOptions; track result) {
                        <mat-option [value]="result">{{ result }}</mat-option>
                      }
                    </mat-select>
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Sort</mat-label>
                    <mat-select [(ngModel)]="sort" name="sort" (selectionChange)="applyFilters()">
                      <mat-option value="newest">Newest</mat-option>
                      <mat-option value="oldest">Oldest</mat-option>
                      <mat-option value="refund_desc">Refund high first</mat-option>
                    </mat-select>
                  </mat-form-field>
                </div>
              </div>

              @if (state.data.items.length) {
                <div class="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Return no</th>
                        <th>Order no</th>
                        <th>Customer</th>
                        <th>Amount</th>
                        <th>Resolution</th>
                        <th>Status</th>
                        <th>Requested</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (item of state.data.items; track item.id) {
                        <tr
                          [class.selected]="selectedReturn()?.id === item.id"
                          (click)="selectedReturn.set(item)"
                          tabindex="0"
                        >
                          <td>
                            <strong>{{ item.returnNumber }}</strong>
                          </td>
                          <td>{{ item.orderNumber }}</td>
                          <td>
                            <span>{{ item.customer.name }}</span>
                            <small>{{ item.customer.mobile }}</small>
                          </td>
                          <td>
                            {{ rupees(displayAmount(item)) | currency: 'INR' : 'symbol' : '1.0-0' }}
                          </td>
                          <td>{{ item.resolution }}</td>
                          <td>
                            <span
                              class="status"
                              [class.due]="item.status === 'Refund due'"
                              [class.inactive]="item.status === 'Cancelled'"
                            >
                              {{ item.status }}
                            </span>
                          </td>
                          <td>{{ item.requestedDate | date: 'mediumDate' }}</td>
                          <td class="row-actions">
                            <button
                              mat-icon-button
                              type="button"
                              aria-label="Edit return"
                              (click)="editReturn(item); $event.stopPropagation()"
                            >
                              <mat-icon>edit</mat-icon>
                            </button>
                            <button
                              mat-icon-button
                              type="button"
                              aria-label="Create exchange"
                              (click)="startExchange(item); $event.stopPropagation()"
                            >
                              <mat-icon>sync_alt</mat-icon>
                            </button>
                            <button
                              mat-icon-button
                              type="button"
                              aria-label="Cancel return"
                              (click)="cancelReturn(item); $event.stopPropagation()"
                              [disabled]="item.status === 'Cancelled'"
                            >
                              <mat-icon>cancel</mat-icon>
                            </button>
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              } @else {
                <div class="empty-state">
                  <mat-icon>assignment_return</mat-icon>
                  <h2>No returns found</h2>
                  <p>Create a return or adjust search and filters.</p>
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
      .returns-page {
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
      .form-actions,
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
      .return-form,
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
      .return-form {
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
      .form-grid mat-form-field {
        min-width: 0;
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
        width: 230px;
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
      .table-panel {
        padding: 18px;
        min-width: 0;
      }
      .panel-heading {
        display: grid;
        gap: 12px;
        margin-bottom: 14px;
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
        min-width: 980px;
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
export class ReturnsPageComponent {
  private readonly returns = inject(ReturnApiService);
  private readonly refreshTrigger = new BehaviorSubject<void>(undefined);

  readonly selectedReturn = signal<ReturnRequestDto | null>(null);
  readonly selectedTab = signal('Requests');
  readonly searchText = signal('');
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly message = signal<string | null>(null);
  readonly showForm = signal(false);
  readonly exchangeMode = signal(false);
  readonly editingReturnId = signal<string | null>(null);
  readonly statusOptions: ReturnStatus[] = [
    'Requested',
    'Inspection',
    'Refund due',
    'Exchange pending',
    'Closed',
    'Rejected',
    'Cancelled',
  ];
  readonly inspectionOptions: InspectionResult[] = [
    'Pending',
    'Sellable',
    'Damaged',
    'Missing item',
    'Rejected',
  ];
  segment: ReturnSegment = 'requests';
  statusFilter: ReturnStatusFilter = 'all';
  inspectionFilter = 'all';
  sort = 'newest';
  page = 1;
  pageSize = 10;
  refundAmount = 0;
  exchangeAmount = 0;
  form: CreateReturnRequestDto = this.emptyForm();

  readonly state$ = this.refreshTrigger.pipe(
    switchMap(() =>
      this.returns
        .listReturns({
          search: this.searchText(),
          status: this.statusFilter,
          inspectionResult: this.inspectionFilter,
          segment: this.segment,
          sort: this.sort,
          page: this.page,
          pageSize: this.pageSize,
        })
        .pipe(
          map((data): ReturnsState => {
            if (!this.selectedReturn() && data.items[0]) this.selectedReturn.set(data.items[0]);
            return { status: 'ready', data };
          }),
          startWith({ status: 'loading' } as ReturnsState),
          catchError(() =>
            of({
              status: 'error',
              message: 'Check the API server and MongoDB connection, then refresh returns.',
            } as ReturnsState),
          ),
        ),
    ),
  );

  saveReturn(): void {
    if (!this.editingReturnId() && !this.form.orderId) {
      this.error.set('Order is required.');
      return;
    }
    if (!this.form.reason.trim()) {
      this.error.set('Return reason is required.');
      return;
    }
    if (this.exchangeMode() && !this.form.exchangeProductName?.trim()) {
      this.error.set('Exchange product is required.');
      return;
    }

    this.saving.set(true);
    this.error.set(null);
    this.message.set(null);
    const payload = this.formPayload();
    const request =
      this.exchangeMode() && this.editingReturnId()
        ? this.returns.createExchange(this.editingReturnId() ?? '', payload)
        : this.editingReturnId()
          ? this.returns.updateReturn(this.editingReturnId() ?? '', payload)
          : this.returns.createReturn(payload);

    request.subscribe({
      next: (item) => {
        this.saving.set(false);
        this.selectedReturn.set(item);
        this.message.set(this.exchangeMode() ? 'Exchange created.' : 'Return saved.');
        this.resetForm();
        this.refresh();
      },
      error: () => {
        this.saving.set(false);
        this.error.set('Return could not be saved. Check required fields.');
      },
    });
  }

  startReturn(): void {
    this.resetForm();
    this.showForm.set(true);
  }

  startExchange(item: ReturnRequestDto | null = this.selectedReturn()): void {
    if (item) {
      this.editReturn(item);
    } else {
      this.resetForm();
    }
    this.exchangeMode.set(true);
    this.showForm.set(true);
    this.form.resolution = 'Exchange';
    this.form.status = 'Exchange pending';
  }

  editReturn(item: ReturnRequestDto): void {
    this.selectedReturn.set(item);
    this.showForm.set(true);
    this.exchangeMode.set(false);
    this.editingReturnId.set(item.id);
    this.refundAmount = this.rupees(item.refundAmountInPaise);
    this.exchangeAmount = this.rupees(item.exchangeAmountInPaise);
    this.form = {
      orderId: item.orderId,
      reason: item.reason,
      status: item.status,
      inspectionResult: item.inspectionResult,
      resolution: item.resolution,
      exchangeProductName: item.exchangeProductName ?? '',
      exchangeSku: item.exchangeSku ?? '',
      notes: item.notes ?? '',
    };
  }

  cancelReturn(item: ReturnRequestDto): void {
    this.returns.cancelReturn(item.id).subscribe({
      next: (updated) => {
        this.selectedReturn.set(updated);
        this.message.set('Return cancelled.');
        this.refresh();
      },
      error: () => this.error.set('Return could not be cancelled.'),
    });
  }

  resetForm(): void {
    this.editingReturnId.set(null);
    this.exchangeMode.set(false);
    this.refundAmount = 0;
    this.exchangeAmount = 0;
    this.form = this.emptyForm();
  }

  isEditing(): boolean {
    return this.editingReturnId() !== null;
  }

  applyFilters(): void {
    this.page = 1;
    this.refresh();
  }

  onSearchChange(value: string): void {
    this.searchText.set(value);
    this.applyFilters();
  }

  selectTab(tab: string): void {
    this.selectedTab.set(tab);
    this.segment = 'requests';
    this.statusFilter = 'all';
    if (tab === 'Inspection') this.segment = 'inspection';
    if (tab === 'Refunds') this.segment = 'refunds';
    if (tab === 'Closed') this.segment = 'closed';
    this.applyFilters();
  }

  previousPage(): void {
    this.page = Math.max(this.page - 1, 1);
    this.refresh();
  }

  nextPage(data: ReturnsListDto): void {
    this.page = Math.min(this.page + 1, this.totalPages(data));
    this.refresh();
  }

  tabs(data: ReturnsListDto) {
    return [
      { label: 'Requests', count: data.summary.returnRequests },
      { label: 'Inspection', count: data.summary.awaitingInspect },
      { label: 'Refunds', count: data.items.filter((item) => item.status === 'Refund due').length },
      { label: 'Closed', count: data.summary.closed },
    ];
  }

  totalPages(data: ReturnsListDto): number {
    return Math.max(Math.ceil(data.total / data.pageSize), 1);
  }

  displayAmount(item: ReturnRequestDto): number {
    return item.resolution === 'Exchange' ? item.exchangeAmountInPaise : item.refundAmountInPaise;
  }

  rupees(valueInPaise: number): number {
    return valueInPaise / 100;
  }

  private refresh(): void {
    this.refreshTrigger.next();
  }

  private formPayload(): CreateReturnRequestDto {
    return {
      ...this.form,
      refundAmountInPaise: this.paise(this.refundAmount),
      exchangeAmountInPaise: this.paise(this.exchangeAmount),
    };
  }

  private paise(value: number): number {
    return Math.round((Number(value) || 0) * 100);
  }

  private emptyForm(): CreateReturnRequestDto {
    return {
      orderId: '',
      reason: '',
      status: 'Requested',
      inspectionResult: 'Pending',
      resolution: 'Refund',
      refundAmountInPaise: 0,
      exchangeProductName: '',
      exchangeSku: '',
      exchangeAmountInPaise: 0,
      notes: '',
    };
  }
}
