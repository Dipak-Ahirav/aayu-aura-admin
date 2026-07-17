import { AsyncPipe, CurrencyPipe, DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import type {
  AdminProductDto,
  CreatePurchaseDto,
  PurchaseDto,
  PurchaseListDto,
  PurchaseStatus,
  SupplierDto,
} from '@aayu-aura/shared-types';
import { BehaviorSubject, catchError, forkJoin, map, of, startWith, switchMap } from 'rxjs';
import { ProductApiService } from '../products/product-api.service';
import { SupplierApiService } from '../suppliers/supplier-api.service';
import { PurchaseApiService } from './purchase-api.service';

interface DraftPurchaseItem {
  productId: string;
  productName: string;
  sku: string;
  hsn: string;
  quantity: number;
  receivedQuantity: number;
  unitCost: number;
  discount: number;
  gstRate: number;
}

type PurchasesState =
  | { status: 'loading' }
  | {
      status: 'ready';
      data: PurchaseListDto;
      suppliers: SupplierDto[];
      products: AdminProductDto[];
    }
  | { status: 'error'; message: string };

type StatusFilter = 'all' | PurchaseStatus;
type PurchaseSegment = 'all' | 'draft' | 'ordered' | 'received';

@Component({
  selector: 'aa-purchases-page',
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
          <h1>Loading purchases</h1>
          <p>Reading purchase records from MongoDB.</p>
        </section>
      } @else if (state.status === 'error') {
        <section class="state-panel error" role="alert">
          <mat-icon>error</mat-icon>
          <h1>Purchases unavailable</h1>
          <p>{{ state.message }}</p>
        </section>
      } @else {
        <section class="purchases-page">
          <div class="hero">
            <div>
              <p class="breadcrumb">Home / Purchases</p>
              <h1 class="page-title">Purchases</h1>
              <p class="muted">
                Record supplier purchases, partial receipts, supplier invoices, stock updates, debit
                notes, and payable balances.
              </p>
            </div>
            <div class="hero-actions">
              <button mat-flat-button color="primary" type="button" (click)="startNewPurchase()">
                <mat-icon>add_shopping_cart</mat-icon>
                Create purchase
              </button>
              <button
                class="secondary"
                mat-flat-button
                color="primary"
                type="button"
                (click)="receiveSelected()"
              >
                <mat-icon>inventory</mat-icon>
                Receive stock
              </button>
            </div>
          </div>

          <section class="metrics" aria-label="Purchase summary">
            <article class="maroon">
              <span>Purchase value</span
              ><strong>{{
                rupees(state.data.summary.purchaseValueInPaise)
                  | currency: 'INR' : 'symbol' : '1.0-0'
              }}</strong>
            </article>
            <article class="plum">
              <span>Pending receipt</span><strong>{{ state.data.summary.pendingReceipt }}</strong>
            </article>
            <article class="gold">
              <span>Drafts</span><strong>{{ state.data.summary.drafts }}</strong>
            </article>
            <article class="green">
              <span>Received</span><strong>{{ state.data.summary.received }}</strong>
            </article>
          </section>

          <section class="purchase-form">
            <div>
              <h2>{{ editingPurchaseId() ? 'Update purchase' : 'Create purchase' }}</h2>
              <p>
                Supplier, invoice, items, totals, receipt status, and payable persist to MongoDB.
              </p>
            </div>

            <div class="form-grid">
              <mat-form-field appearance="outline">
                <mat-label>Supplier</mat-label>
                <mat-select [(ngModel)]="supplierId" name="supplier">
                  @for (supplier of state.suppliers; track supplier.id) {
                    <mat-option [value]="supplier.id">{{ supplier.name }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Supplier invoice</mat-label>
                <input matInput [(ngModel)]="supplierInvoiceNumber" name="supplierInvoiceNumber" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Purchase date</mat-label>
                <input matInput type="date" [(ngModel)]="purchaseDate" name="purchaseDate" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Expected receipt</mat-label>
                <input
                  matInput
                  type="date"
                  [(ngModel)]="expectedReceiptDate"
                  name="expectedReceiptDate"
                />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Status</mat-label>
                <mat-select [(ngModel)]="purchaseStatus" name="purchaseStatus">
                  @for (status of purchaseStatuses; track status) {
                    <mat-option [value]="status">{{ status }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Shipping charge</mat-label>
                <input matInput type="number" [(ngModel)]="shippingCharge" name="shippingCharge" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Other charge</mat-label>
                <input matInput type="number" [(ngModel)]="otherCharge" name="otherCharge" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Paid amount</mat-label>
                <input matInput type="number" [(ngModel)]="paidAmount" name="paidAmount" />
              </mat-form-field>
            </div>

            <div class="items-heading">
              <h2>Items</h2>
              <button mat-stroked-button type="button" (click)="addItem()">
                <mat-icon>add</mat-icon>
                Add item
              </button>
            </div>

            @for (item of items; track $index) {
              <article class="item-row">
                <mat-form-field appearance="outline">
                  <mat-label>Product</mat-label>
                  <mat-select
                    [(ngModel)]="item.productId"
                    [name]="'product' + $index"
                    (selectionChange)="selectProduct(item, state.products)"
                  >
                    <mat-option value="">Manual item</mat-option>
                    @for (product of state.products; track product.id) {
                      <mat-option [value]="product.id"
                        >{{ product.name }} / {{ product.sku }}</mat-option
                      >
                    }
                  </mat-select>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Product name</mat-label>
                  <input matInput [(ngModel)]="item.productName" [name]="'name' + $index" />
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>SKU</mat-label>
                  <input matInput [(ngModel)]="item.sku" [name]="'sku' + $index" />
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Qty</mat-label>
                  <input
                    matInput
                    type="number"
                    [(ngModel)]="item.quantity"
                    [name]="'qty' + $index"
                  />
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Received</mat-label>
                  <input
                    matInput
                    type="number"
                    [(ngModel)]="item.receivedQuantity"
                    [name]="'received' + $index"
                  />
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Unit cost</mat-label>
                  <input
                    matInput
                    type="number"
                    [(ngModel)]="item.unitCost"
                    [name]="'cost' + $index"
                  />
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Discount</mat-label>
                  <input
                    matInput
                    type="number"
                    [(ngModel)]="item.discount"
                    [name]="'discount' + $index"
                  />
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>GST %</mat-label>
                  <input
                    matInput
                    type="number"
                    [(ngModel)]="item.gstRate"
                    [name]="'gst' + $index"
                  />
                </mat-form-field>
                <button
                  mat-icon-button
                  type="button"
                  aria-label="Remove item"
                  (click)="removeItem($index)"
                  [disabled]="items.length === 1"
                >
                  <mat-icon>delete</mat-icon>
                </button>
              </article>
            }

            <div class="form-grid">
              <mat-form-field appearance="outline" class="wide">
                <mat-label>Notes</mat-label>
                <input matInput [(ngModel)]="notes" name="notes" />
              </mat-form-field>
              <mat-form-field appearance="outline" class="wide">
                <mat-label>Internal notes</mat-label>
                <input matInput [(ngModel)]="internalNotes" name="internalNotes" />
              </mat-form-field>
            </div>

            <div class="totals-line">
              Total:
              <strong>{{ formTotal() | currency: 'INR' : 'symbol' : '1.0-0' }}</strong>
              Due:
              <strong>{{ formDue() | currency: 'INR' : 'symbol' : '1.0-0' }}</strong>
            </div>

            <div class="form-actions">
              <button
                mat-flat-button
                color="primary"
                type="button"
                (click)="savePurchase()"
                [disabled]="saving()"
              >
                <mat-icon>{{ editingPurchaseId() ? 'save' : 'add_shopping_cart' }}</mat-icon>
                {{
                  saving() ? 'Saving...' : editingPurchaseId() ? 'Save purchase' : 'Create purchase'
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

          <div class="tabs" aria-label="Purchase tabs">
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
                    Search, filters, sorting, pagination, purchase edits, receipt, and cancellation
                    use the API.
                  </p>
                </div>
                <div class="filter-strip" aria-label="Purchase filters">
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
                    <mat-label>Supplier</mat-label>
                    <mat-select
                      [(ngModel)]="supplierFilter"
                      name="supplierFilter"
                      (selectionChange)="applyFilters()"
                    >
                      <mat-option value="all">All</mat-option>
                      @for (supplier of state.suppliers; track supplier.id) {
                        <mat-option [value]="supplier.id">{{ supplier.name }}</mat-option>
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
                      @for (status of purchaseStatuses; track status) {
                        <mat-option [value]="status">{{ status }}</mat-option>
                      }
                    </mat-select>
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Sort</mat-label>
                    <mat-select [(ngModel)]="sort" name="sort" (selectionChange)="applyFilters()">
                      <mat-option value="newest">Newest</mat-option>
                      <mat-option value="oldest">Oldest</mat-option>
                      <mat-option value="amount_desc">Amount</mat-option>
                      <mat-option value="due_desc">Due</mat-option>
                    </mat-select>
                  </mat-form-field>
                </div>
              </div>

              @if (state.data.items.length) {
                <div class="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Purchase no</th>
                        <th>Supplier</th>
                        <th>Amount</th>
                        <th>Paid</th>
                        <th>Due</th>
                        <th>Items</th>
                        <th>Status</th>
                        <th>Date</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (purchase of state.data.items; track purchase.id) {
                        <tr
                          [class.selected]="selectedPurchase()?.id === purchase.id"
                          (click)="selectedPurchase.set(purchase)"
                          tabindex="0"
                        >
                          <td>
                            <strong>{{ purchase.purchaseNumber }}</strong>
                          </td>
                          <td>{{ purchase.supplierName }}</td>
                          <td>
                            {{
                              rupees(purchase.totalInPaise) | currency: 'INR' : 'symbol' : '1.0-0'
                            }}
                          </td>
                          <td>
                            {{
                              rupees(purchase.paidAmountInPaise)
                                | currency: 'INR' : 'symbol' : '1.0-0'
                            }}
                          </td>
                          <td>
                            {{
                              rupees(purchase.dueAmountInPaise)
                                | currency: 'INR' : 'symbol' : '1.0-0'
                            }}
                          </td>
                          <td>{{ purchase.items.length }}</td>
                          <td>
                            <span class="status">{{ purchase.status }}</span>
                          </td>
                          <td>{{ purchase.purchaseDate | date: 'mediumDate' }}</td>
                          <td class="row-actions">
                            <button
                              mat-icon-button
                              type="button"
                              aria-label="Edit purchase"
                              (click)="editPurchase(purchase); $event.stopPropagation()"
                            >
                              <mat-icon>edit</mat-icon>
                            </button>
                            <button
                              mat-icon-button
                              type="button"
                              aria-label="Receive purchase"
                              (click)="receivePurchase(purchase); $event.stopPropagation()"
                              [disabled]="
                                purchase.status === 'Received' || purchase.status === 'Cancelled'
                              "
                            >
                              <mat-icon>inventory</mat-icon>
                            </button>
                            <button
                              mat-icon-button
                              type="button"
                              aria-label="Cancel purchase"
                              (click)="cancelPurchase(purchase); $event.stopPropagation()"
                              [disabled]="
                                purchase.status === 'Received' || purchase.status === 'Cancelled'
                              "
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
                  <mat-icon>receipt_long</mat-icon>
                  <h2>No purchases found</h2>
                  <p>Create a purchase or adjust search and filters.</p>
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
      .purchases-page {
        display: grid;
        gap: 16px;
        min-width: 0;
        max-width: 100%;
        overflow-x: hidden;
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
      .items-heading,
      .pagination,
      .pagination div,
      .totals-line {
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
      .purchase-form,
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
      .purchase-form {
        display: grid;
        gap: 14px;
        padding: 18px;
        min-width: 0;
      }
      .form-grid,
      .item-row {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 12px;
      }
      .form-grid mat-form-field,
      .item-row mat-form-field {
        min-width: 0;
      }
      .form-grid .wide {
        grid-column: span 2;
      }
      .item-row {
        grid-template-columns: repeat(4, minmax(0, 1fr)) auto;
        align-items: center;
        padding: 12px;
        border: 1px solid var(--aa-border);
        border-radius: 8px;
      }
      .items-heading {
        justify-content: space-between;
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
        .form-grid,
        .item-row {
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
export class PurchasesPageComponent {
  private readonly purchases = inject(PurchaseApiService);
  private readonly suppliers = inject(SupplierApiService);
  private readonly products = inject(ProductApiService);
  private readonly refreshTrigger = new BehaviorSubject<void>(undefined);

  readonly selectedPurchase = signal<PurchaseDto | null>(null);
  readonly selectedTab = signal('All purchases');
  readonly editingPurchaseId = signal<string | null>(null);
  readonly searchText = signal('');
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly message = signal<string | null>(null);
  readonly purchaseStatuses: PurchaseStatus[] = [
    'Draft',
    'Ordered',
    'Partially received',
    'Received',
    'Cancelled',
  ];
  statusFilter: StatusFilter = 'all';
  segment: PurchaseSegment = 'all';
  supplierFilter = 'all';
  sort = 'newest';
  page = 1;
  pageSize = 10;

  supplierId = '';
  supplierInvoiceNumber = '';
  purchaseDate = new Date().toISOString().slice(0, 10);
  expectedReceiptDate = '';
  purchaseStatus: PurchaseStatus = 'Draft';
  shippingCharge = 0;
  otherCharge = 0;
  paidAmount = 0;
  notes = '';
  internalNotes = '';
  items: DraftPurchaseItem[] = [this.emptyItem()];

  readonly state$ = this.refreshTrigger.pipe(
    switchMap(() =>
      forkJoin({
        data: this.purchases.listPurchases({
          search: this.searchText(),
          status: this.statusFilter,
          supplierId: this.supplierFilter,
          segment: this.segment,
          sort: this.sort,
          page: this.page,
          pageSize: this.pageSize,
        }),
        suppliers: this.suppliers.listSuppliers({ pageSize: 100, status: 'all' }),
        products: this.products.listProducts(),
      }).pipe(
        map(({ data, suppliers, products }): PurchasesState => {
          if (!this.selectedPurchase() && data.items[0]) {
            this.selectedPurchase.set(data.items[0]);
          }
          if (!this.supplierId && suppliers.items[0]) {
            this.supplierId = suppliers.items[0].id;
          }
          return { status: 'ready', data, suppliers: suppliers.items, products };
        }),
        startWith({ status: 'loading' } as PurchasesState),
        catchError(() =>
          of({
            status: 'error',
            message: 'Check the API server and MongoDB connection, then refresh purchases.',
          } as PurchasesState),
        ),
      ),
    ),
  );

  savePurchase(): void {
    if (!this.supplierId) {
      this.error.set('Select a supplier.');
      return;
    }
    if (this.items.some((item) => !item.productName.trim() || item.quantity < 1)) {
      this.error.set('Each item needs a product name and quantity.');
      return;
    }

    this.saving.set(true);
    this.error.set(null);
    this.message.set(null);
    const payload = this.formPayload();
    const request = this.editingPurchaseId()
      ? this.purchases.updatePurchase(this.editingPurchaseId() ?? '', payload)
      : this.purchases.createPurchase(payload);

    request.subscribe({
      next: (purchase) => {
        this.saving.set(false);
        this.selectedPurchase.set(purchase);
        this.message.set(this.editingPurchaseId() ? 'Purchase updated.' : 'Purchase created.');
        this.resetForm();
        this.refresh();
      },
      error: () => {
        this.saving.set(false);
        this.error.set('Purchase could not be saved. Check supplier, items, and totals.');
      },
    });
  }

  editPurchase(purchase: PurchaseDto): void {
    this.editingPurchaseId.set(purchase.id);
    this.supplierId = purchase.supplierId;
    this.supplierInvoiceNumber = purchase.supplierInvoiceNumber ?? '';
    this.purchaseDate = purchase.purchaseDate.slice(0, 10);
    this.expectedReceiptDate = purchase.expectedReceiptDate?.slice(0, 10) ?? '';
    this.purchaseStatus = purchase.status;
    this.shippingCharge = this.rupees(purchase.shippingChargeInPaise);
    this.otherCharge = this.rupees(purchase.otherChargeInPaise);
    this.paidAmount = this.rupees(purchase.paidAmountInPaise);
    this.notes = purchase.notes ?? '';
    this.internalNotes = purchase.internalNotes ?? '';
    this.items = purchase.items.map((item) => ({
      productId: item.productId ?? '',
      productName: item.productName,
      sku: item.sku ?? '',
      hsn: item.hsn ?? '',
      quantity: item.quantity,
      receivedQuantity: item.receivedQuantity,
      unitCost: this.rupees(item.unitCostInPaise),
      discount: this.rupees(item.discountInPaise),
      gstRate: item.gstRate,
    }));
  }

  receiveSelected(): void {
    const purchase = this.selectedPurchase();
    if (purchase) this.receivePurchase(purchase);
  }

  receivePurchase(purchase: PurchaseDto): void {
    const items = purchase.items.map((item) => ({
      productId: item.productId,
      productName: item.productName,
      sku: item.sku,
      hsn: item.hsn,
      quantity: item.quantity,
      receivedQuantity: item.quantity,
      unitCostInPaise: item.unitCostInPaise,
      discountInPaise: item.discountInPaise,
      gstRate: item.gstRate,
    }));
    this.purchases.updatePurchase(purchase.id, { status: 'Received', items }).subscribe({
      next: (updated) => {
        this.selectedPurchase.set(updated);
        this.message.set('Purchase received and stock updated.');
        this.refresh();
      },
      error: () => this.error.set('Purchase could not be received.'),
    });
  }

  cancelPurchase(purchase: PurchaseDto): void {
    this.purchases.cancelPurchase(purchase.id).subscribe({
      next: (updated) => {
        this.selectedPurchase.set(updated);
        this.message.set('Purchase cancelled.');
        this.refresh();
      },
      error: () => this.error.set('Purchase could not be cancelled.'),
    });
  }

  selectProduct(item: DraftPurchaseItem, products: readonly AdminProductDto[]): void {
    const product = products.find((candidate) => candidate.id === item.productId);
    if (!product) return;
    item.productName = product.name;
    item.sku = product.sku;
    item.hsn = product.hsn ?? '';
    item.unitCost = this.rupees(product.purchasePriceInPaise);
    item.gstRate = product.gstRate ?? 0;
  }

  addItem(): void {
    this.items = [...this.items, this.emptyItem()];
  }

  removeItem(index: number): void {
    if (this.items.length === 1) return;
    this.items = this.items.filter((_item, itemIndex) => itemIndex !== index);
  }

  startNewPurchase(): void {
    this.resetForm();
  }

  resetForm(): void {
    this.editingPurchaseId.set(null);
    this.supplierInvoiceNumber = '';
    this.purchaseDate = new Date().toISOString().slice(0, 10);
    this.expectedReceiptDate = '';
    this.purchaseStatus = 'Draft';
    this.shippingCharge = 0;
    this.otherCharge = 0;
    this.paidAmount = 0;
    this.notes = '';
    this.internalNotes = '';
    this.items = [this.emptyItem()];
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
    if (tab === 'All purchases') {
      this.segment = 'all';
      this.statusFilter = 'all';
    } else if (tab === 'Draft') {
      this.segment = 'draft';
      this.statusFilter = 'all';
    } else if (tab === 'Ordered') {
      this.segment = 'ordered';
      this.statusFilter = 'all';
    } else if (tab === 'Received') {
      this.segment = 'received';
      this.statusFilter = 'all';
    }
    this.applyFilters();
  }

  previousPage(): void {
    this.page = Math.max(this.page - 1, 1);
    this.refresh();
  }

  nextPage(data: PurchaseListDto): void {
    this.page = Math.min(this.page + 1, this.totalPages(data));
    this.refresh();
  }

  tabs(data: PurchaseListDto) {
    return [
      { label: 'All purchases', count: data.total },
      { label: 'Draft', count: data.summary.drafts },
      { label: 'Ordered', count: data.summary.pendingReceipt },
      { label: 'Received', count: data.summary.received },
    ];
  }

  totalPages(data: PurchaseListDto): number {
    return Math.max(Math.ceil(data.total / data.pageSize), 1);
  }

  formTotal(): number {
    return (
      this.items.reduce((sum, item) => {
        const gross = this.money(item.quantity) * this.money(item.unitCost);
        const discount = Math.min(this.money(item.discount), gross);
        const taxable = gross - discount;
        return sum + taxable + Math.round((taxable * this.money(item.gstRate)) / 100);
      }, 0) +
      this.money(this.shippingCharge) +
      this.money(this.otherCharge)
    );
  }

  formDue(): number {
    return Math.max(this.formTotal() - this.money(this.paidAmount), 0);
  }

  rupees(valueInPaise: number): number {
    return valueInPaise / 100;
  }

  private refresh(): void {
    this.refreshTrigger.next();
  }

  private formPayload(): CreatePurchaseDto {
    return {
      supplierId: this.supplierId,
      purchaseDate: new Date(this.purchaseDate).toISOString(),
      expectedReceiptDate: this.expectedReceiptDate
        ? new Date(this.expectedReceiptDate).toISOString()
        : undefined,
      supplierInvoiceNumber: this.supplierInvoiceNumber,
      status: this.purchaseStatus,
      shippingChargeInPaise: this.paise(this.shippingCharge),
      otherChargeInPaise: this.paise(this.otherCharge),
      paidAmountInPaise: this.paise(this.paidAmount),
      notes: this.notes,
      internalNotes: this.internalNotes,
      items: this.items.map((item) => ({
        productId: item.productId || undefined,
        productName: item.productName,
        sku: item.sku,
        hsn: item.hsn,
        quantity: Math.max(Math.trunc(Number(item.quantity) || 0), 1),
        receivedQuantity: Math.max(Math.trunc(Number(item.receivedQuantity) || 0), 0),
        unitCostInPaise: this.paise(item.unitCost),
        discountInPaise: this.paise(item.discount),
        gstRate: Number(item.gstRate) || 0,
      })),
    };
  }

  private emptyItem(): DraftPurchaseItem {
    return {
      productId: '',
      productName: '',
      sku: '',
      hsn: '',
      quantity: 1,
      receivedQuantity: 0,
      unitCost: 0,
      discount: 0,
      gstRate: 0,
    };
  }

  private money(value: number): number {
    return Math.max(Number(value) || 0, 0);
  }

  private paise(value: number): number {
    return Math.round(this.money(value) * 100);
  }
}
