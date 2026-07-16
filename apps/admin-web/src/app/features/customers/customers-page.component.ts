import { AsyncPipe, CurrencyPipe, DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import type {
  CreateCustomerDto,
  CustomerDto,
  CustomerListDto,
  CustomerSource,
  CustomerType,
  MasterDataDto,
} from '@aayu-aura/shared-types';
import { BehaviorSubject, catchError, forkJoin, map, of, startWith, switchMap } from 'rxjs';
import { MasterDataApiService } from '../master-data/master-data-api.service';
import { masterValues } from '../master-data/master-data-registry';
import { CustomerApiService } from './customer-api.service';

type CustomersState =
  | { status: 'loading' }
  | { status: 'ready'; data: CustomerListDto; sources: string[]; customerTypes: string[] }
  | { status: 'error'; message: string };

type StatusFilter = 'all' | 'active' | 'inactive';
type CustomerSegment = 'all' | 'outstanding' | 'repeat' | 'inactive';

@Component({
  selector: 'aa-customers-page',
  standalone: true,
  imports: [
    AsyncPipe,
    CurrencyPipe,
    DatePipe,
    FormsModule,
    MatButtonModule,
    MatCheckboxModule,
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
          <h1>Loading customers</h1>
          <p>Reading customer records from MongoDB.</p>
        </section>
      } @else if (state.status === 'error') {
        <section class="state-panel error" role="alert">
          <mat-icon>error</mat-icon>
          <h1>Customers unavailable</h1>
          <p>{{ state.message }}</p>
        </section>
      } @else {
        <section class="customers-page">
          <div class="hero">
            <div>
              <p class="breadcrumb">Home / Customers</p>
              <h1 class="page-title">Customers</h1>
              <p class="muted">
                Manage customer profiles, addresses, consent, order history, invoices, payments,
                returns, and ledgers.
              </p>
            </div>
            <div class="hero-actions">
              <button mat-flat-button color="primary" type="button" (click)="startNewCustomer()">
                <mat-icon>person_add</mat-icon>
                Add customer
              </button>
              <button
                class="secondary"
                mat-flat-button
                color="primary"
                type="button"
                (click)="findDuplicates(state.data.items)"
              >
                <mat-icon>manage_search</mat-icon>
                Find duplicates
              </button>
            </div>
          </div>

          <section class="metrics" aria-label="Customer summary">
            <article class="maroon">
              <span>Total customers</span><strong>{{ state.data.summary.totalCustomers }}</strong>
            </article>
            <article class="plum">
              <span>New this month</span><strong>{{ state.data.summary.newThisMonth }}</strong>
            </article>
            <article class="gold">
              <span>Outstanding</span
              ><strong>{{
                rupees(state.data.summary.outstandingInPaise) | currency: 'INR' : 'symbol' : '1.0-0'
              }}</strong>
            </article>
            <article class="green">
              <span>Repeat buyers</span><strong>{{ state.data.summary.repeatBuyers }}</strong>
            </article>
          </section>

          <section class="customer-form">
            <div>
              <h2>{{ editingCustomerId() ? 'Update customer' : 'Create customer' }}</h2>
              <p>Customer profile and consent details persist to MongoDB.</p>
            </div>

            <div class="form-grid">
              <mat-form-field appearance="outline">
                <mat-label>Name</mat-label>
                <input matInput [(ngModel)]="form.name" name="name" />
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
                <mat-label>Source</mat-label>
                <mat-select [(ngModel)]="form.source" name="source">
                  @for (source of state.sources; track source) {
                    <mat-option [value]="source">{{ source }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Customer type</mat-label>
                <mat-select [(ngModel)]="form.customerType" name="customerType">
                  @for (type of state.customerTypes; track type) {
                    <mat-option [value]="type">{{ type }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>State</mat-label>
                <input matInput [(ngModel)]="form.state" name="state" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>State code</mat-label>
                <input matInput [(ngModel)]="form.stateCode" name="stateCode" />
              </mat-form-field>
              <mat-form-field appearance="outline" class="wide">
                <mat-label>Billing address</mat-label>
                <input matInput [(ngModel)]="form.billingAddress" name="billingAddress" />
              </mat-form-field>
              <mat-form-field appearance="outline" class="wide">
                <mat-label>Shipping address</mat-label>
                <input matInput [(ngModel)]="form.shippingAddress" name="shippingAddress" />
              </mat-form-field>
              <mat-form-field appearance="outline" class="wide">
                <mat-label>Internal notes</mat-label>
                <input matInput [(ngModel)]="form.internalNotes" name="internalNotes" />
              </mat-form-field>
            </div>

            <div class="consent-row">
              <mat-checkbox [(ngModel)]="form.consentWhatsApp" name="consentWhatsApp"
                >WhatsApp consent</mat-checkbox
              >
              <mat-checkbox [(ngModel)]="form.consentEmail" name="consentEmail"
                >Email consent</mat-checkbox
              >
            </div>

            <div class="form-actions">
              <button
                mat-flat-button
                color="primary"
                type="button"
                (click)="saveCustomer()"
                [disabled]="saving()"
              >
                <mat-icon>{{ editingCustomerId() ? 'save' : 'person_add' }}</mat-icon>
                {{
                  saving() ? 'Saving...' : editingCustomerId() ? 'Save customer' : 'Create customer'
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

          <div class="tabs" aria-label="Customer tabs">
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
                  <p>Search, filters, sorting, pagination, and edits are connected to the API.</p>
                </div>
                <div class="filter-strip" aria-label="Customer filters">
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
                    <mat-label>Status</mat-label>
                    <mat-select
                      [(ngModel)]="statusFilter"
                      name="statusFilter"
                      (selectionChange)="applyFilters()"
                    >
                      <mat-option value="all">All</mat-option>
                      <mat-option value="active">Active</mat-option>
                      <mat-option value="inactive">Inactive</mat-option>
                    </mat-select>
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Source</mat-label>
                    <mat-select
                      [(ngModel)]="sourceFilter"
                      name="sourceFilter"
                      (selectionChange)="applyFilters()"
                    >
                      <mat-option value="all">All</mat-option>
                      @for (source of state.sources; track source) {
                        <mat-option [value]="source">{{ source }}</mat-option>
                      }
                    </mat-select>
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Type</mat-label>
                    <mat-select
                      [(ngModel)]="typeFilter"
                      name="typeFilter"
                      (selectionChange)="applyFilters()"
                    >
                      <mat-option value="all">All</mat-option>
                      @for (type of state.customerTypes; track type) {
                        <mat-option [value]="type">{{ type }}</mat-option>
                      }
                    </mat-select>
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Sort</mat-label>
                    <mat-select [(ngModel)]="sort" name="sort" (selectionChange)="applyFilters()">
                      <mat-option value="newest">Newest</mat-option>
                      <mat-option value="oldest">Oldest</mat-option>
                      <mat-option value="name_asc">Name A-Z</mat-option>
                      <mat-option value="name_desc">Name Z-A</mat-option>
                      <mat-option value="lifetime_desc">Lifetime value</mat-option>
                      <mat-option value="outstanding_desc">Outstanding</mat-option>
                    </mat-select>
                  </mat-form-field>
                  <button mat-stroked-button type="button" (click)="applyFilters()">
                    <mat-icon>search</mat-icon>
                    Apply
                  </button>
                </div>
              </div>

              @if (state.data.items.length) {
                <div class="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Customer</th>
                        <th>Mobile</th>
                        <th>Lifetime value</th>
                        <th>Outstanding</th>
                        <th>Last purchase</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (customer of state.data.items; track customer.id) {
                        <tr
                          [class.selected]="selectedCustomer()?.id === customer.id"
                          (click)="selectedCustomer.set(customer)"
                          tabindex="0"
                        >
                          <td>
                            <strong>{{ customer.name }}</strong>
                            <small>{{ customer.email || customer.customerType }}</small>
                          </td>
                          <td>{{ customer.mobile }}</td>
                          <td>
                            {{
                              rupees(customer.lifetimeValueInPaise)
                                | currency: 'INR' : 'symbol' : '1.0-0'
                            }}
                          </td>
                          <td>
                            {{
                              rupees(customer.outstandingInPaise)
                                | currency: 'INR' : 'symbol' : '1.0-0'
                            }}
                          </td>
                          <td>
                            {{
                              customer.lastPurchaseAt
                                ? (customer.lastPurchaseAt | date: 'mediumDate')
                                : '-'
                            }}
                          </td>
                          <td>
                            <span class="status">{{
                              customer.isActive ? 'Active' : 'Inactive'
                            }}</span>
                          </td>
                          <td class="row-actions">
                            <button
                              mat-icon-button
                              type="button"
                              aria-label="Edit customer"
                              (click)="editCustomer(customer); $event.stopPropagation()"
                            >
                              <mat-icon>edit</mat-icon>
                            </button>
                            <button
                              mat-icon-button
                              type="button"
                              aria-label="Deactivate customer"
                              (click)="deactivateCustomer(customer); $event.stopPropagation()"
                              [disabled]="!customer.isActive"
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
                  <mat-icon>groups</mat-icon>
                  <h2>No customers found</h2>
                  <p>Create a customer or adjust search and filters.</p>
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
      .customers-page {
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
        max-width: 640px;
        margin: 10px 0 0;
        font-size: 0.95rem;
        line-height: 1.55;
      }
      .hero-actions,
      .form-actions,
      .consent-row,
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
      .customer-form,
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
      .customer-form {
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
        min-width: 840px;
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
export class CustomersPageComponent {
  private readonly customers = inject(CustomerApiService);
  private readonly masterData = inject(MasterDataApiService);
  private readonly refreshTrigger = new BehaviorSubject<void>(undefined);

  readonly selectedCustomer = signal<CustomerDto | null>(null);
  readonly selectedTab = signal('All customers');
  readonly editingCustomerId = signal<string | null>(null);
  readonly searchText = signal('');
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly message = signal<string | null>(null);
  readonly sources: CustomerSource[] = [
    'Admin',
    'WhatsApp',
    'Instagram',
    'Facebook',
    'Phone',
    'Offline',
    'Marketplace',
    'Referral',
  ];
  readonly customerTypes: CustomerType[] = ['Retail', 'Wholesale', 'VIP'];
  statusFilter: StatusFilter = 'all';
  segment: CustomerSegment = 'all';
  sourceFilter = 'all';
  typeFilter = 'all';
  sort = 'newest';
  page = 1;
  pageSize = 10;
  form: CreateCustomerDto = this.emptyForm();

  readonly state$ = this.refreshTrigger.pipe(
    switchMap(() =>
      forkJoin({
        data: this.customers.listCustomers({
          search: this.searchText(),
          status: this.statusFilter,
          source: this.sourceFilter,
          customerType: this.typeFilter,
          segment: this.segment,
          sort: this.sort,
          page: this.page,
          pageSize: this.pageSize,
        }),
        masterData: this.masterData.listMasterData({
          type: 'Order setup',
          status: 'active',
          sort: 'sort_order',
          page: 1,
          pageSize: 100,
        }),
      }).pipe(
        map(({ data, masterData }): CustomersState => {
          if (!this.selectedCustomer() && data.items[0]) {
            this.selectedCustomer.set(data.items[0]);
          }
          return {
            status: 'ready',
            data,
            sources: this.customerSources(masterData.items),
            customerTypes: this.customerTypeOptions(masterData.items),
          };
        }),
        startWith({ status: 'loading' } as CustomersState),
        catchError(() =>
          of({
            status: 'error',
            message: 'Check the API server and MongoDB connection, then refresh customers.',
          } as CustomersState),
        ),
      ),
    ),
  );

  saveCustomer(): void {
    if (!this.form.name.trim() || !this.form.mobile.trim()) {
      this.error.set('Customer name and mobile are required.');
      return;
    }

    this.saving.set(true);
    this.error.set(null);
    this.message.set(null);
    const request = this.editingCustomerId()
      ? this.customers.updateCustomer(this.editingCustomerId() ?? '', this.form)
      : this.customers.createCustomer(this.form);

    request.subscribe({
      next: (customer) => {
        this.saving.set(false);
        this.selectedCustomer.set(customer);
        this.message.set(this.editingCustomerId() ? 'Customer updated.' : 'Customer created.');
        this.resetForm();
        this.refresh();
      },
      error: () => {
        this.saving.set(false);
        this.error.set('Customer could not be saved. Check mobile uniqueness and required fields.');
      },
    });
  }

  editCustomer(customer: CustomerDto): void {
    this.editingCustomerId.set(customer.id);
    this.form = {
      name: customer.name,
      mobile: customer.mobile,
      email: customer.email ?? '',
      billingAddress: customer.billingAddress ?? '',
      shippingAddress: customer.shippingAddress ?? '',
      state: customer.state ?? '',
      stateCode: customer.stateCode ?? '',
      source: customer.source ?? 'Admin',
      customerType: customer.customerType ?? 'Retail',
      consentWhatsApp: customer.consentWhatsApp ?? false,
      consentEmail: customer.consentEmail ?? false,
      internalNotes: customer.internalNotes ?? '',
    };
  }

  deactivateCustomer(customer: CustomerDto): void {
    this.customers.deactivateCustomer(customer.id).subscribe({
      next: (updated) => {
        this.selectedCustomer.set(updated);
        this.message.set('Customer deactivated.');
        this.refresh();
      },
      error: () => this.error.set('Customer could not be deactivated.'),
    });
  }

  startNewCustomer(): void {
    this.resetForm();
  }

  resetForm(): void {
    this.editingCustomerId.set(null);
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
    if (tab === 'All customers') {
      this.segment = 'all';
      this.statusFilter = 'all';
      this.sort = 'newest';
    } else if (tab === 'Outstanding') {
      this.segment = 'outstanding';
      this.statusFilter = 'all';
      this.sort = 'outstanding_desc';
    } else if (tab === 'Repeat') {
      this.segment = 'repeat';
      this.statusFilter = 'all';
      this.sort = 'lifetime_desc';
    } else if (tab === 'Inactive') {
      this.segment = 'inactive';
      this.statusFilter = 'all';
    }
    this.applyFilters();
  }

  findDuplicates(customers: readonly CustomerDto[]): void {
    const mobiles = new Set<string>();
    const duplicates = customers.filter((customer) => {
      if (mobiles.has(customer.mobile)) return true;
      mobiles.add(customer.mobile);
      return false;
    });
    this.message.set(
      duplicates.length
        ? `${duplicates.length} duplicate mobile records found.`
        : 'No duplicate mobile records on this page.',
    );
  }

  previousPage(): void {
    this.page = Math.max(this.page - 1, 1);
    this.refresh();
  }

  nextPage(data: CustomerListDto): void {
    this.page = Math.min(this.page + 1, this.totalPages(data));
    this.refresh();
  }

  tabs(data: CustomerListDto) {
    return [
      { label: 'All customers', count: data.summary.totalCustomers },
      {
        label: 'Outstanding',
        count: data.summary.outstandingCustomers,
      },
      {
        label: 'Repeat',
        count: data.summary.repeatBuyers,
      },
      {
        label: 'Inactive',
        count: data.summary.inactiveCustomers,
      },
    ];
  }

  totalPages(data: CustomerListDto): number {
    return Math.max(Math.ceil(data.total / data.pageSize), 1);
  }

  rupees(valueInPaise: number): number {
    return valueInPaise / 100;
  }

  private refresh(): void {
    this.refreshTrigger.next();
  }

  private emptyForm(): CreateCustomerDto {
    return {
      name: '',
      mobile: '',
      email: '',
      billingAddress: '',
      shippingAddress: '',
      state: '',
      stateCode: '',
      source: 'Admin',
      customerType: 'Retail',
      consentWhatsApp: false,
      consentEmail: false,
      internalNotes: '',
    };
  }

  private customerSources(items: readonly MasterDataDto[]): string[] {
    return masterValues(items, 'Customer Source');
  }

  private customerTypeOptions(items: readonly MasterDataDto[]): string[] {
    return masterValues(items, 'Customer Type');
  }
}
