import { AsyncPipe, CurrencyPipe, DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import type { CreateSupplierDto, SupplierDto, SupplierListDto } from '@aayu-aura/shared-types';
import { BehaviorSubject, catchError, map, of, startWith, switchMap } from 'rxjs';
import { SupplierApiService } from './supplier-api.service';

type SuppliersState =
  | { status: 'loading' }
  | { status: 'ready'; data: SupplierListDto }
  | { status: 'error'; message: string };

type StatusFilter = 'all' | 'active' | 'payment_due' | 'inactive';
type SupplierSegment = 'all' | 'outstanding' | 'inactive';

@Component({
  selector: 'aa-suppliers-page',
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
          <h1>Loading suppliers</h1>
          <p>Reading supplier records from MongoDB.</p>
        </section>
      } @else if (state.status === 'error') {
        <section class="state-panel error" role="alert">
          <mat-icon>error</mat-icon>
          <h1>Suppliers unavailable</h1>
          <p>{{ state.message }}</p>
        </section>
      } @else {
        <section class="suppliers-page">
          <div class="hero">
            <div>
              <p class="breadcrumb">Home / Suppliers</p>
              <h1 class="page-title">Suppliers</h1>
              <p class="muted">
                Manage supplier profiles, GST details, payment terms, ledgers, purchase history, and
                outstanding balances.
              </p>
            </div>
            <div class="hero-actions">
              <button mat-flat-button color="primary" type="button" (click)="startNewSupplier()">
                <mat-icon>person_add</mat-icon>
                Add supplier
              </button>
              <button
                class="secondary"
                mat-flat-button
                color="primary"
                type="button"
                (click)="exportCsv()"
              >
                <mat-icon>download</mat-icon>
                Export statement
              </button>
            </div>
          </div>

          <section class="metrics" aria-label="Supplier summary">
            <article class="maroon">
              <span>Active suppliers</span><strong>{{ state.data.summary.activeSuppliers }}</strong>
            </article>
            <article class="plum">
              <span>Payable</span
              ><strong>{{
                rupees(state.data.summary.payableInPaise) | currency: 'INR' : 'symbol' : '1.0-0'
              }}</strong>
            </article>
            <article class="gold">
              <span>Payment due</span><strong>{{ state.data.summary.paymentDueSuppliers }}</strong>
            </article>
            <article class="green">
              <span>GST registered</span><strong>{{ state.data.summary.gstRegistered }}</strong>
            </article>
          </section>

          <section class="supplier-form">
            <div>
              <h2>{{ editingSupplierId() ? 'Update supplier' : 'Create supplier' }}</h2>
              <p>Supplier profile, GST, bank, payable, and payment terms persist to MongoDB.</p>
            </div>

            <div class="form-grid">
              <mat-form-field appearance="outline">
                <mat-label>Supplier name</mat-label>
                <input matInput [(ngModel)]="form.name" name="supplierName" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Contact person</mat-label>
                <input matInput [(ngModel)]="form.contactPerson" name="contactPerson" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Mobile</mat-label>
                <input matInput [(ngModel)]="form.mobile" name="mobile" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Email</mat-label>
                <input matInput type="email" [(ngModel)]="form.email" name="email" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>GSTIN</mat-label>
                <input matInput [(ngModel)]="form.gstin" name="gstin" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>State</mat-label>
                <input matInput [(ngModel)]="form.state" name="state" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>State code</mat-label>
                <input matInput [(ngModel)]="form.stateCode" name="stateCode" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Credit days</mat-label>
                <input
                  matInput
                  type="number"
                  [(ngModel)]="form.paymentTermsDays"
                  name="creditDays"
                />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Opening balance</mat-label>
                <input matInput type="number" [(ngModel)]="openingBalance" name="openingBalance" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Current payable</mat-label>
                <input matInput type="number" [(ngModel)]="currentPayable" name="currentPayable" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Status</mat-label>
                <mat-select [(ngModel)]="form.status" name="supplierStatus">
                  <mat-option value="active">Active</mat-option>
                  <mat-option value="payment_due">Payment due</mat-option>
                  <mat-option value="inactive">Inactive</mat-option>
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Bank name</mat-label>
                <input matInput [(ngModel)]="form.bankName" name="bankName" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Account number</mat-label>
                <input matInput [(ngModel)]="form.accountNumber" name="accountNumber" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>IFSC</mat-label>
                <input matInput [(ngModel)]="form.ifsc" name="ifsc" />
              </mat-form-field>
              <mat-form-field appearance="outline" class="wide">
                <mat-label>Address</mat-label>
                <input matInput [(ngModel)]="form.address" name="address" />
              </mat-form-field>
              <mat-form-field appearance="outline" class="wide">
                <mat-label>Notes</mat-label>
                <input matInput [(ngModel)]="form.notes" name="notes" />
              </mat-form-field>
            </div>

            <div class="form-actions">
              <button
                mat-flat-button
                color="primary"
                type="button"
                (click)="saveSupplier()"
                [disabled]="saving()"
              >
                <mat-icon>{{ editingSupplierId() ? 'save' : 'person_add' }}</mat-icon>
                {{
                  saving() ? 'Saving...' : editingSupplierId() ? 'Save supplier' : 'Create supplier'
                }}
              </button>
              <button mat-stroked-button type="button" (click)="resetForm()">
                <mat-icon>close</mat-icon>
                Clear
              </button>
            </div>
          </section>

          @if (message()) {
            <p class="success" role="status">{{ message() }}</p>
          }
          @if (error()) {
            <p class="error-message" role="alert">{{ error() }}</p>
          }

          <div class="tabs" aria-label="Supplier tabs">
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
                    Search, filters, sorting, pagination, export, and edits are connected to the
                    API.
                  </p>
                </div>
                <div class="filter-strip" aria-label="Supplier filters">
                  <mat-form-field appearance="outline">
                    <mat-label>Search</mat-label>
                    <input
                      matInput
                      [ngModel]="searchText()"
                      (ngModelChange)="onSearchChange($event)"
                      name="supplierSearch"
                    />
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Status</mat-label>
                    <mat-select
                      [(ngModel)]="statusFilter"
                      name="statusFilter"
                      (selectionChange)="applyFilters()"
                    >
                      <mat-option value="all">All</mat-option>
                      <mat-option value="active">Active</mat-option>
                      <mat-option value="payment_due">Payment due</mat-option>
                      <mat-option value="inactive">Inactive</mat-option>
                    </mat-select>
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>State</mat-label>
                    <input
                      matInput
                      [(ngModel)]="stateFilter"
                      name="stateFilter"
                      (ngModelChange)="applyFilters()"
                    />
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Sort</mat-label>
                    <mat-select [(ngModel)]="sort" name="sort" (selectionChange)="applyFilters()">
                      <mat-option value="newest">Newest</mat-option>
                      <mat-option value="oldest">Oldest</mat-option>
                      <mat-option value="name_asc">Name A-Z</mat-option>
                      <mat-option value="name_desc">Name Z-A</mat-option>
                      <mat-option value="payable_desc">Payable</mat-option>
                      <mat-option value="credit_days">Credit days</mat-option>
                    </mat-select>
                  </mat-form-field>
                </div>
              </div>

              @if (state.data.items.length) {
                <div class="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Supplier</th>
                        <th>GSTIN</th>
                        <th>Mobile</th>
                        <th>State</th>
                        <th>Payable</th>
                        <th>Credit days</th>
                        <th>Status</th>
                        <th>Updated</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (supplier of state.data.items; track supplier.id) {
                        <tr
                          [class.selected]="selectedSupplier()?.id === supplier.id"
                          (click)="selectedSupplier.set(supplier)"
                          tabindex="0"
                        >
                          <td>
                            <strong>{{ supplier.name }}</strong>
                            <small>{{
                              supplier.contactPerson || supplier.email || 'Supplier profile'
                            }}</small>
                          </td>
                          <td>{{ supplier.gstin || '-' }}</td>
                          <td>{{ supplier.mobile }}</td>
                          <td>{{ supplier.state || '-' }}</td>
                          <td>
                            {{
                              rupees(supplier.currentPayableInPaise)
                                | currency: 'INR' : 'symbol' : '1.0-0'
                            }}
                          </td>
                          <td>{{ supplier.paymentTermsDays }}</td>
                          <td>
                            <span
                              class="status"
                              [class.due]="supplier.status === 'payment_due'"
                              [class.inactive]="supplier.status === 'inactive'"
                            >
                              {{ labelStatus(supplier.status) }}
                            </span>
                          </td>
                          <td>{{ supplier.createdAt | date: 'mediumDate' }}</td>
                          <td class="row-actions">
                            <button
                              mat-icon-button
                              type="button"
                              aria-label="Edit supplier"
                              (click)="editSupplier(supplier); $event.stopPropagation()"
                            >
                              <mat-icon>edit</mat-icon>
                            </button>
                            <button
                              mat-icon-button
                              type="button"
                              aria-label="Deactivate supplier"
                              (click)="deactivateSupplier(supplier); $event.stopPropagation()"
                              [disabled]="supplier.status === 'inactive'"
                            >
                              <mat-icon>person_off</mat-icon>
                            </button>
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              } @else {
                <div class="empty-state">
                  <mat-icon>store</mat-icon>
                  <h2>No suppliers found</h2>
                  <p>Create a supplier or adjust search and filters.</p>
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
      .suppliers-page {
        display: grid;
        gap: 16px;
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
      .supplier-form,
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
      .supplier-form {
        display: grid;
        gap: 14px;
        padding: 18px;
      }
      .form-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(170px, 1fr));
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
        min-width: 940px;
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
export class SuppliersPageComponent {
  private readonly suppliers = inject(SupplierApiService);
  private readonly refreshTrigger = new BehaviorSubject<void>(undefined);

  readonly selectedSupplier = signal<SupplierDto | null>(null);
  readonly selectedTab = signal('All suppliers');
  readonly editingSupplierId = signal<string | null>(null);
  readonly searchText = signal('');
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly message = signal<string | null>(null);
  statusFilter: StatusFilter = 'all';
  segment: SupplierSegment = 'all';
  stateFilter = '';
  sort = 'newest';
  page = 1;
  pageSize = 10;
  openingBalance = 0;
  currentPayable = 0;
  form: CreateSupplierDto = this.emptyForm();

  readonly state$ = this.refreshTrigger.pipe(
    switchMap(() =>
      this.suppliers
        .listSuppliers({
          search: this.searchText(),
          status: this.statusFilter,
          state: this.stateFilter.trim() || 'all',
          segment: this.segment,
          sort: this.sort,
          page: this.page,
          pageSize: this.pageSize,
        })
        .pipe(
          map((data): SuppliersState => {
            if (!this.selectedSupplier() && data.items[0]) {
              this.selectedSupplier.set(data.items[0]);
            }
            return { status: 'ready', data };
          }),
          startWith({ status: 'loading' } as SuppliersState),
          catchError(() =>
            of({
              status: 'error',
              message: 'Check the API server and MongoDB connection, then refresh suppliers.',
            } as SuppliersState),
          ),
        ),
    ),
  );

  saveSupplier(): void {
    if (!this.form.name.trim() || !this.form.mobile.trim()) {
      this.error.set('Supplier name and mobile are required.');
      return;
    }

    this.saving.set(true);
    this.error.set(null);
    this.message.set(null);
    const payload = this.formPayload();
    const request = this.editingSupplierId()
      ? this.suppliers.updateSupplier(this.editingSupplierId() ?? '', payload)
      : this.suppliers.createSupplier(payload);

    request.subscribe({
      next: (supplier) => {
        this.saving.set(false);
        this.selectedSupplier.set(supplier);
        this.message.set(this.editingSupplierId() ? 'Supplier updated.' : 'Supplier created.');
        this.resetForm();
        this.refresh();
      },
      error: () => {
        this.saving.set(false);
        this.error.set('Supplier could not be saved. Check mobile uniqueness and required fields.');
      },
    });
  }

  editSupplier(supplier: SupplierDto): void {
    this.editingSupplierId.set(supplier.id);
    this.openingBalance = this.rupees(supplier.openingBalanceInPaise);
    this.currentPayable = this.rupees(supplier.currentPayableInPaise);
    this.form = {
      name: supplier.name,
      contactPerson: supplier.contactPerson ?? '',
      mobile: supplier.mobile,
      email: supplier.email ?? '',
      gstin: supplier.gstin ?? '',
      address: supplier.address ?? '',
      state: supplier.state ?? '',
      stateCode: supplier.stateCode ?? '',
      paymentTermsDays: supplier.paymentTermsDays,
      bankName: supplier.bankName ?? '',
      accountNumber: supplier.accountNumber ?? '',
      ifsc: supplier.ifsc ?? '',
      status: supplier.status,
      notes: supplier.notes ?? '',
    };
  }

  deactivateSupplier(supplier: SupplierDto): void {
    this.suppliers.deactivateSupplier(supplier.id).subscribe({
      next: (updated) => {
        this.selectedSupplier.set(updated);
        this.message.set('Supplier deactivated.');
        this.refresh();
      },
      error: () => this.error.set('Supplier could not be deactivated.'),
    });
  }

  exportCsv(): void {
    this.suppliers
      .exportSuppliers({
        search: this.searchText(),
        status: this.statusFilter,
        state: this.stateFilter.trim() || 'all',
        segment: this.segment,
        sort: this.sort,
        page: this.page,
        pageSize: this.pageSize,
      })
      .subscribe({
        next: (csv) => {
          const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = 'suppliers.csv';
          link.click();
          URL.revokeObjectURL(url);
          this.message.set('Supplier export downloaded.');
        },
        error: () => this.error.set('Supplier export failed.'),
      });
  }

  startNewSupplier(): void {
    this.resetForm();
  }

  resetForm(): void {
    this.editingSupplierId.set(null);
    this.openingBalance = 0;
    this.currentPayable = 0;
    this.form = this.emptyForm();
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
    if (tab === 'All suppliers') {
      this.segment = 'all';
      this.statusFilter = 'all';
      this.sort = 'newest';
    } else if (tab === 'Outstanding') {
      this.segment = 'outstanding';
      this.statusFilter = 'all';
      this.sort = 'payable_desc';
    } else if (tab === 'Inactive') {
      this.segment = 'inactive';
      this.statusFilter = 'all';
    }
    this.applyFilters();
  }

  previousPage(): void {
    this.page = Math.max(this.page - 1, 1);
    this.refresh();
  }

  nextPage(data: SupplierListDto): void {
    this.page = Math.min(this.page + 1, this.totalPages(data));
    this.refresh();
  }

  tabs(data: SupplierListDto) {
    return [
      { label: 'All suppliers', count: data.summary.totalSuppliers },
      { label: 'Outstanding', count: data.summary.paymentDueSuppliers },
      { label: 'Inactive', count: data.summary.inactiveSuppliers },
    ];
  }

  totalPages(data: SupplierListDto): number {
    return Math.max(Math.ceil(data.total / data.pageSize), 1);
  }

  labelStatus(status: SupplierDto['status']): string {
    if (status === 'payment_due') return 'Payment due';
    if (status === 'inactive') return 'Inactive';
    return 'Active';
  }

  rupees(valueInPaise: number): number {
    return valueInPaise / 100;
  }

  private refresh(): void {
    this.refreshTrigger.next();
  }

  private formPayload(): CreateSupplierDto {
    return {
      ...this.form,
      openingBalanceInPaise: this.paise(this.openingBalance),
      currentPayableInPaise: this.paise(this.currentPayable),
    };
  }

  private paise(value: number): number {
    return Math.round((Number(value) || 0) * 100);
  }

  private emptyForm(): CreateSupplierDto {
    return {
      name: '',
      contactPerson: '',
      mobile: '',
      email: '',
      gstin: '',
      address: '',
      state: '',
      stateCode: '',
      paymentTermsDays: 0,
      bankName: '',
      accountNumber: '',
      ifsc: '',
      status: 'active',
      notes: '',
    };
  }
}
