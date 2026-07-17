import { AsyncPipe, CurrencyPipe, DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import type {
  CreateExpenseDto,
  ExpenseDto,
  ExpenseListDto,
  ExpenseStatus,
} from '@aayu-aura/shared-types';
import { BehaviorSubject, catchError, forkJoin, map, of, startWith, switchMap } from 'rxjs';
import { MasterDataApiService } from '../master-data/master-data-api.service';
import { masterValues } from '../master-data/master-data-registry';
import { ExpenseApiService } from './expense-api.service';

type ExpensesState =
  | { status: 'loading' }
  | { status: 'ready'; data: ExpenseListDto; categories: string[]; methods: string[] }
  | { status: 'error'; message: string };

type ExpenseStatusFilter = 'all' | ExpenseStatus;
type ExpenseSegment = 'all' | 'draft' | 'approved' | 'rejected';

@Component({
  selector: 'aa-expenses-page',
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
          <h1>Loading expenses</h1>
          <p>Reading operating expenses from MongoDB.</p>
        </section>
      } @else if (state.status === 'error') {
        <section class="state-panel error" role="alert">
          <mat-icon>error</mat-icon>
          <h1>Expenses unavailable</h1>
          <p>{{ state.message }}</p>
        </section>
      } @else {
        <section class="expenses-page">
          <div class="hero">
            <div>
              <p class="breadcrumb">Home / Expenses</p>
              <h1 class="page-title">Expenses</h1>
              <p class="muted">
                Record operating expenses, categories, payment proof, monthly totals, and profit and
                loss inputs.
              </p>
            </div>
            <div class="hero-actions">
              <button mat-flat-button color="primary" type="button" (click)="startExpense()">
                <mat-icon>add_card</mat-icon>
                Add expense
              </button>
              <button
                class="secondary"
                mat-flat-button
                color="primary"
                type="button"
                (click)="exportCsv()"
              >
                <mat-icon>download</mat-icon>
                Export expenses
              </button>
            </div>
          </div>

          <section class="metrics" aria-label="Expense summary">
            <article class="maroon">
              <span>This month</span
              ><strong>{{
                rupees(state.data.summary.monthTotalInPaise) | currency: 'INR' : 'symbol' : '1.0-0'
              }}</strong>
            </article>
            <article class="plum">
              <span>Marketing</span
              ><strong>{{
                rupees(state.data.summary.marketingInPaise) | currency: 'INR' : 'symbol' : '1.0-0'
              }}</strong>
            </article>
            <article class="gold">
              <span>Packaging</span
              ><strong>{{
                rupees(state.data.summary.packagingInPaise) | currency: 'INR' : 'symbol' : '1.0-0'
              }}</strong>
            </article>
            <article class="green">
              <span>Approved</span><strong>{{ state.data.summary.approved }}</strong>
            </article>
          </section>

          @if (showForm()) {
            <section class="expense-form">
              <div>
                <h2>{{ editingExpenseId() ? 'Update expense' : 'Add expense' }}</h2>
                <p>Category, payment proof, tax, status, and payment method persist to MongoDB.</p>
              </div>
              <div class="form-grid">
                <mat-form-field appearance="outline">
                  <mat-label>Expense</mat-label>
                  <input matInput [(ngModel)]="form.title" name="expenseTitle" />
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Category</mat-label>
                  <mat-select [(ngModel)]="form.category" name="expenseCategory">
                    @for (category of state.categories; track category) {
                      <mat-option [value]="category">{{ category }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Amount</mat-label>
                  <input matInput type="number" [(ngModel)]="amount" name="amount" />
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Tax</mat-label>
                  <input matInput type="number" [(ngModel)]="taxAmount" name="taxAmount" />
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Payment method</mat-label>
                  <mat-select [(ngModel)]="form.paymentMethod" name="paymentMethod">
                    @for (method of state.methods; track method) {
                      <mat-option [value]="method">{{ method }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Status</mat-label>
                  <mat-select [(ngModel)]="form.status" name="expenseStatus">
                    @for (status of statusOptions; track status) {
                      <mat-option [value]="status">{{ status }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Expense date</mat-label>
                  <input matInput type="date" [(ngModel)]="expenseDate" name="expenseDate" />
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Vendor</mat-label>
                  <input matInput [(ngModel)]="form.vendor" name="vendor" />
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Reference</mat-label>
                  <input matInput [(ngModel)]="form.referenceNumber" name="referenceNumber" />
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Proof URL</mat-label>
                  <input matInput [(ngModel)]="form.proofUrl" name="proofUrl" />
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
                  (click)="saveExpense()"
                  [disabled]="saving()"
                >
                  <mat-icon>{{ editingExpenseId() ? 'save' : 'add_card' }}</mat-icon>
                  {{ saving() ? 'Saving...' : editingExpenseId() ? 'Save expense' : 'Add expense' }}
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

          <div class="tabs" aria-label="Expense tabs">
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
                    Search, filters, sorting, pagination, edits, and export are connected to the
                    API.
                  </p>
                </div>
                <div class="filter-strip" aria-label="Expense filters">
                  <mat-form-field appearance="outline">
                    <mat-label>Search</mat-label>
                    <input
                      matInput
                      [ngModel]="searchText()"
                      (ngModelChange)="onSearchChange($event)"
                      name="expenseSearch"
                    />
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Category</mat-label>
                    <mat-select
                      [(ngModel)]="categoryFilter"
                      name="categoryFilter"
                      (selectionChange)="applyFilters()"
                    >
                      <mat-option value="all">All</mat-option>
                      @for (category of state.categories; track category) {
                        <mat-option [value]="category">{{ category }}</mat-option>
                      }
                    </mat-select>
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Payment method</mat-label>
                    <mat-select
                      [(ngModel)]="paymentMethodFilter"
                      name="methodFilter"
                      (selectionChange)="applyFilters()"
                    >
                      <mat-option value="all">All</mat-option>
                      @for (method of state.methods; track method) {
                        <mat-option [value]="method">{{ method }}</mat-option>
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
                      @for (status of statusOptions; track status) {
                        <mat-option [value]="status">{{ status }}</mat-option>
                      }
                    </mat-select>
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Sort</mat-label>
                    <mat-select [(ngModel)]="sort" name="sort" (selectionChange)="applyFilters()">
                      <mat-option value="newest">Newest</mat-option>
                      <mat-option value="oldest">Oldest</mat-option>
                      <mat-option value="amount_desc">Amount high first</mat-option>
                      <mat-option value="amount_asc">Amount low first</mat-option>
                    </mat-select>
                  </mat-form-field>
                </div>
              </div>

              @if (state.data.items.length) {
                <div class="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Expense</th>
                        <th>Category</th>
                        <th>Amount</th>
                        <th>Method</th>
                        <th>Status</th>
                        <th>Date</th>
                        <th>Vendor</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (expense of state.data.items; track expense.id) {
                        <tr
                          [class.selected]="selectedExpense()?.id === expense.id"
                          (click)="selectedExpense.set(expense)"
                          tabindex="0"
                        >
                          <td>
                            <strong>{{ expense.title }}</strong>
                            <small>{{
                              expense.referenceNumber || expense.notes || 'Expense record'
                            }}</small>
                          </td>
                          <td>{{ expense.category }}</td>
                          <td>
                            {{
                              rupees(expense.totalInPaise) | currency: 'INR' : 'symbol' : '1.0-0'
                            }}
                          </td>
                          <td>{{ expense.paymentMethod }}</td>
                          <td>
                            <span
                              class="status"
                              [class.due]="expense.status === 'Draft'"
                              [class.inactive]="
                                expense.status === 'Rejected' || expense.status === 'Cancelled'
                              "
                            >
                              {{ expense.status }}
                            </span>
                          </td>
                          <td>{{ expense.expenseDate | date: 'mediumDate' }}</td>
                          <td>{{ expense.vendor || '-' }}</td>
                          <td class="row-actions">
                            <button
                              mat-icon-button
                              type="button"
                              aria-label="Edit expense"
                              (click)="editExpense(expense); $event.stopPropagation()"
                            >
                              <mat-icon>edit</mat-icon>
                            </button>
                            <button
                              mat-icon-button
                              type="button"
                              aria-label="Cancel expense"
                              (click)="cancelExpense(expense); $event.stopPropagation()"
                              [disabled]="expense.status === 'Cancelled'"
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
                  <mat-icon>account_balance_wallet</mat-icon>
                  <h2>No expenses found</h2>
                  <p>Add an expense or adjust search and filters.</p>
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
      .expenses-page {
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
      .expense-form,
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
      .expense-form {
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
export class ExpensesPageComponent {
  private readonly expenses = inject(ExpenseApiService);
  private readonly masterData = inject(MasterDataApiService);
  private readonly refreshTrigger = new BehaviorSubject<void>(undefined);

  readonly selectedExpense = signal<ExpenseDto | null>(null);
  readonly selectedTab = signal('All expenses');
  readonly searchText = signal('');
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly message = signal<string | null>(null);
  readonly showForm = signal(false);
  readonly editingExpenseId = signal<string | null>(null);
  readonly statusOptions: ExpenseStatus[] = ['Draft', 'Approved', 'Rejected', 'Cancelled'];
  segment: ExpenseSegment = 'all';
  statusFilter: ExpenseStatusFilter = 'all';
  categoryFilter = 'all';
  paymentMethodFilter = 'all';
  sort = 'newest';
  page = 1;
  pageSize = 10;
  amount = 0;
  taxAmount = 0;
  expenseDate = '';
  form: CreateExpenseDto = this.emptyForm();

  readonly state$ = this.refreshTrigger.pipe(
    switchMap(() =>
      forkJoin({
        data: this.expenses.listExpenses({
          search: this.searchText(),
          status: this.statusFilter,
          category: this.categoryFilter,
          paymentMethod: this.paymentMethodFilter,
          segment: this.segment,
          sort: this.sort,
          page: this.page,
          pageSize: this.pageSize,
        }),
        masterData: this.masterData.listMasterData({
          type: 'Finance',
          status: 'active',
          pageSize: 100,
        }),
      }).pipe(
        map(({ data, masterData }): ExpensesState => {
          if (!this.selectedExpense() && data.items[0]) this.selectedExpense.set(data.items[0]);
          return {
            status: 'ready',
            data,
            categories: masterValues(masterData.items, 'Expense Category', [
              'Marketing',
              'Packaging',
              'Courier',
              'Rent',
              'Utilities',
              'Salary',
              'Other',
            ]),
            methods: masterValues(masterData.items, 'Payment Method'),
          };
        }),
        startWith({ status: 'loading' } as ExpensesState),
        catchError(() =>
          of({
            status: 'error',
            message: 'Check the API server and MongoDB connection, then refresh expenses.',
          } as ExpensesState),
        ),
      ),
    ),
  );

  saveExpense(): void {
    if (!this.form.title.trim() || !this.form.category.trim() || !this.form.paymentMethod.trim()) {
      this.error.set('Expense, category, and payment method are required.');
      return;
    }
    if (this.amount < 0 || this.taxAmount < 0) {
      this.error.set('Amount and tax cannot be negative.');
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    this.message.set(null);
    const request = this.editingExpenseId()
      ? this.expenses.updateExpense(this.editingExpenseId() ?? '', this.formPayload())
      : this.expenses.createExpense(this.formPayload());
    request.subscribe({
      next: (expense) => {
        this.saving.set(false);
        this.selectedExpense.set(expense);
        this.message.set(this.editingExpenseId() ? 'Expense updated.' : 'Expense added.');
        this.resetForm();
        this.refresh();
      },
      error: () => {
        this.saving.set(false);
        this.error.set('Expense could not be saved. Check required fields and proof URL.');
      },
    });
  }

  startExpense(): void {
    this.resetForm();
    this.showForm.set(true);
  }

  editExpense(expense: ExpenseDto): void {
    this.selectedExpense.set(expense);
    this.showForm.set(true);
    this.editingExpenseId.set(expense.id);
    this.amount = this.rupees(expense.amountInPaise);
    this.taxAmount = this.rupees(expense.taxAmountInPaise);
    this.expenseDate = expense.expenseDate.slice(0, 10);
    this.form = {
      title: expense.title,
      category: expense.category,
      amountInPaise: expense.amountInPaise,
      taxAmountInPaise: expense.taxAmountInPaise,
      paymentMethod: expense.paymentMethod,
      status: expense.status,
      vendor: expense.vendor ?? '',
      referenceNumber: expense.referenceNumber ?? '',
      proofUrl: expense.proofUrl ?? '',
      notes: expense.notes ?? '',
    };
  }

  cancelExpense(expense: ExpenseDto): void {
    this.expenses.cancelExpense(expense.id).subscribe({
      next: (updated) => {
        this.selectedExpense.set(updated);
        this.message.set('Expense cancelled.');
        this.refresh();
      },
      error: () => this.error.set('Expense could not be cancelled.'),
    });
  }

  exportCsv(): void {
    this.expenses
      .exportExpenses({
        search: this.searchText(),
        status: this.statusFilter,
        category: this.categoryFilter,
        paymentMethod: this.paymentMethodFilter,
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
          link.download = 'expenses.csv';
          link.click();
          URL.revokeObjectURL(url);
          this.message.set('Expense export downloaded.');
        },
        error: () => this.error.set('Expense export failed.'),
      });
  }

  resetForm(): void {
    this.editingExpenseId.set(null);
    this.amount = 0;
    this.taxAmount = 0;
    this.expenseDate = '';
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
    this.segment = 'all';
    this.statusFilter = 'all';
    if (tab === 'Draft') this.segment = 'draft';
    if (tab === 'Approved') this.segment = 'approved';
    if (tab === 'Rejected') this.segment = 'rejected';
    this.applyFilters();
  }

  previousPage(): void {
    this.page = Math.max(this.page - 1, 1);
    this.refresh();
  }

  nextPage(data: ExpenseListDto): void {
    this.page = Math.min(this.page + 1, this.totalPages(data));
    this.refresh();
  }

  tabs(data: ExpenseListDto) {
    return [
      { label: 'All expenses', count: data.summary.totalExpenses },
      { label: 'Draft', count: data.summary.draft },
      { label: 'Approved', count: data.summary.approved },
      { label: 'Rejected', count: data.summary.rejected },
    ];
  }

  totalPages(data: ExpenseListDto): number {
    return Math.max(Math.ceil(data.total / data.pageSize), 1);
  }

  rupees(valueInPaise: number): number {
    return valueInPaise / 100;
  }

  private refresh(): void {
    this.refreshTrigger.next();
  }

  private formPayload(): CreateExpenseDto {
    return {
      ...this.form,
      amountInPaise: this.paise(this.amount),
      taxAmountInPaise: this.paise(this.taxAmount),
      expenseDate: this.expenseDate
        ? new Date(`${this.expenseDate}T00:00:00.000Z`).toISOString()
        : undefined,
    };
  }

  private paise(value: number): number {
    return Math.round((Number(value) || 0) * 100);
  }

  private emptyForm(): CreateExpenseDto {
    return {
      title: '',
      category: '',
      amountInPaise: 0,
      taxAmountInPaise: 0,
      paymentMethod: '',
      status: 'Draft',
      vendor: '',
      referenceNumber: '',
      proofUrl: '',
      notes: '',
    };
  }
}
