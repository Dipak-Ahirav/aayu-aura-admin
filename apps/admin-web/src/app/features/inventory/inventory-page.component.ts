import { AsyncPipe, DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import type {
  AdminProductDto,
  CreateStockMovementDto,
  InventoryListDto,
  InventorySegment,
  StockMovementDirection,
  StockMovementDto,
  StockMovementType,
} from '@aayu-aura/shared-types';
import { BehaviorSubject, catchError, forkJoin, map, of, startWith, switchMap } from 'rxjs';
import { MasterDataApiService } from '../master-data/master-data-api.service';
import { masterValues } from '../master-data/master-data-registry';
import { ProductApiService } from '../products/product-api.service';
import { InventoryApiService } from './inventory-api.service';

type InventoryState =
  | { status: 'loading' }
  | {
      status: 'ready';
      data: InventoryListDto;
      products: AdminProductDto[];
      warehouses: string[];
      reasons: string[];
    }
  | { status: 'error'; message: string };

type StockStatusFilter = 'all' | 'in_stock' | 'low_stock' | 'out_of_stock';

@Component({
  selector: 'aa-inventory-page',
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
          <h1>Loading inventory</h1>
          <p>Reading product stock and stock movements from MongoDB.</p>
        </section>
      } @else if (state.status === 'error') {
        <section class="state-panel error" role="alert">
          <mat-icon>error</mat-icon>
          <h1>Inventory unavailable</h1>
          <p>{{ state.message }}</p>
        </section>
      } @else {
        <section class="inventory-page">
          <div class="hero">
            <div>
              <p class="breadcrumb">Home / Inventory</p>
              <h1 class="page-title">Inventory</h1>
              <p class="muted">
                Monitor physical, reserved, available, damaged, returned, and low-stock quantities
                with immutable stock movements.
              </p>
            </div>
            <div class="hero-actions">
              <button
                mat-flat-button
                color="primary"
                type="button"
                (click)="showAdjustment.set(true)"
              >
                <mat-icon>tune</mat-icon>
                Stock adjustment
              </button>
              <button
                class="secondary"
                mat-flat-button
                color="primary"
                type="button"
                (click)="selectTab('Low stock')"
              >
                <mat-icon>warning</mat-icon>
                Low stock report
              </button>
            </div>
          </div>

          <section class="metrics" aria-label="Inventory summary">
            <article class="maroon">
              <span>Available stock</span><strong>{{ state.data.summary.availableStock }}</strong>
            </article>
            <article class="plum">
              <span>Reserved stock</span><strong>{{ state.data.summary.reservedStock }}</strong>
            </article>
            <article class="gold">
              <span>Damaged stock</span><strong>{{ state.data.summary.damagedStock }}</strong>
            </article>
            <article class="green">
              <span>Movements today</span><strong>{{ state.data.summary.movementsToday }}</strong>
            </article>
          </section>

          @if (showAdjustment()) {
            <section class="inventory-form">
              <div>
                <h2>
                  {{ editingMovementId() ? 'Update movement note' : 'Create stock adjustment' }}
                </h2>
                <p>
                  Product stock, warehouse, movement reason, reference, and audit movement persist
                  to MongoDB.
                </p>
              </div>

              <div class="form-grid">
                <mat-form-field appearance="outline">
                  <mat-label>Product</mat-label>
                  <mat-select
                    [(ngModel)]="form.productId"
                    name="inventoryProduct"
                    [disabled]="isEditingMovement()"
                  >
                    @for (product of state.products; track product.id) {
                      <mat-option [value]="product.id"
                        >{{ product.name }} / {{ product.sku }}</mat-option
                      >
                    }
                  </mat-select>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Warehouse</mat-label>
                  <mat-select [(ngModel)]="form.warehouse" name="inventoryWarehouse">
                    <mat-option value="">Not assigned</mat-option>
                    @for (warehouse of state.warehouses; track warehouse) {
                      <mat-option [value]="warehouse">{{ warehouse }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Movement type</mat-label>
                  <mat-select
                    [(ngModel)]="form.movementType"
                    name="movementType"
                    [disabled]="isEditingMovement()"
                  >
                    <mat-option value="adjustment">Adjustment</mat-option>
                    <mat-option value="damage">Damage</mat-option>
                    <mat-option value="return">Return</mat-option>
                    <mat-option value="reservation">Reservation</mat-option>
                    <mat-option value="release">Release</mat-option>
                  </mat-select>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Direction</mat-label>
                  <mat-select
                    [(ngModel)]="form.direction"
                    name="movementDirection"
                    [disabled]="isEditingMovement()"
                  >
                    <mat-option value="in">In</mat-option>
                    <mat-option value="out">Out</mat-option>
                  </mat-select>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Quantity</mat-label>
                  <input
                    matInput
                    type="number"
                    min="1"
                    [(ngModel)]="form.quantity"
                    name="movementQuantity"
                    [disabled]="isEditingMovement()"
                  />
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Reason</mat-label>
                  <mat-select [(ngModel)]="form.reason" name="movementReason">
                    <mat-option value="">Not specified</mat-option>
                    @for (reason of state.reasons; track reason) {
                      <mat-option [value]="reason">{{ reason }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Reference</mat-label>
                  <input matInput [(ngModel)]="form.reference" name="movementReference" />
                </mat-form-field>
                <mat-form-field appearance="outline" class="wide">
                  <mat-label>Notes</mat-label>
                  <input matInput [(ngModel)]="form.notes" name="movementNotes" />
                </mat-form-field>
              </div>

              <div class="form-actions">
                <button
                  mat-flat-button
                  color="primary"
                  type="button"
                  (click)="saveMovement()"
                  [disabled]="saving()"
                >
                  <mat-icon>{{ editingMovementId() ? 'save' : 'tune' }}</mat-icon>
                  {{
                    saving()
                      ? 'Saving...'
                      : editingMovementId()
                        ? 'Save movement'
                        : 'Create adjustment'
                  }}
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

          <div class="tabs" aria-label="Inventory tabs">
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
                    Search, filters, sorting, stock adjustments, and pagination are connected to the
                    API.
                  </p>
                </div>
                <div class="filter-strip" aria-label="Inventory filters">
                  <mat-form-field appearance="outline">
                    <mat-label>Search</mat-label>
                    <input
                      matInput
                      [ngModel]="searchText()"
                      (ngModelChange)="onSearchChange($event)"
                      name="inventorySearch"
                    />
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Stock status</mat-label>
                    <mat-select
                      [(ngModel)]="stockStatus"
                      name="stockStatus"
                      (selectionChange)="applyFilters()"
                    >
                      <mat-option value="all">All</mat-option>
                      <mat-option value="in_stock">In stock</mat-option>
                      <mat-option value="low_stock">Low stock</mat-option>
                      <mat-option value="out_of_stock">Out of stock</mat-option>
                    </mat-select>
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Warehouse</mat-label>
                    <mat-select
                      [(ngModel)]="warehouseFilter"
                      name="warehouseFilter"
                      (selectionChange)="applyFilters()"
                    >
                      <mat-option value="all">All</mat-option>
                      @for (warehouse of state.warehouses; track warehouse) {
                        <mat-option [value]="warehouse">{{ warehouse }}</mat-option>
                      }
                    </mat-select>
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Sort</mat-label>
                    <mat-select [(ngModel)]="sort" name="sort" (selectionChange)="applyFilters()">
                      <mat-option value="name_asc">Name A-Z</mat-option>
                      <mat-option value="name_desc">Name Z-A</mat-option>
                      <mat-option value="available_asc">Available low first</mat-option>
                      <mat-option value="available_desc">Available high first</mat-option>
                      <mat-option value="newest">Newest</mat-option>
                    </mat-select>
                  </mat-form-field>
                </div>
              </div>

              @if (segment === 'transactions') {
                @if (state.data.movements.length) {
                  <div class="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Product</th>
                          <th>Type</th>
                          <th>Direction</th>
                          <th>Quantity</th>
                          <th>Physical</th>
                          <th>Reserved</th>
                          <th>Warehouse</th>
                          <th>Reason</th>
                          <th>Date</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        @for (movement of state.data.movements; track movement.id) {
                          <tr>
                            <td>
                              <strong>{{ movement.productName }}</strong>
                              <small>{{ movement.sku }}</small>
                            </td>
                            <td>{{ labelMovementType(movement.movementType) }}</td>
                            <td>
                              <span class="status" [class.due]="movement.direction === 'out'">
                                {{ movement.direction === 'in' ? 'In' : 'Out' }}
                              </span>
                            </td>
                            <td>{{ movement.quantity }}</td>
                            <td>
                              {{ movement.previousPhysicalStock }} ->
                              {{ movement.newPhysicalStock }}
                            </td>
                            <td>
                              {{ movement.previousReservedStock }} ->
                              {{ movement.newReservedStock }}
                            </td>
                            <td>{{ movement.warehouse || '-' }}</td>
                            <td>{{ movement.reason || movement.reference || '-' }}</td>
                            <td>{{ movement.createdAt | date: 'mediumDate' }}</td>
                            <td class="row-actions">
                              <button
                                mat-icon-button
                                type="button"
                                aria-label="Edit movement note"
                                (click)="editMovement(movement)"
                              >
                                <mat-icon>edit</mat-icon>
                              </button>
                              <button
                                mat-icon-button
                                type="button"
                                aria-label="Reverse movement"
                                (click)="reverseMovement(movement)"
                              >
                                <mat-icon>undo</mat-icon>
                              </button>
                            </td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  </div>
                } @else {
                  <div class="empty-state">
                    <mat-icon>inventory</mat-icon>
                    <h2>No stock movements found</h2>
                    <p>Create a stock adjustment or change search and filters.</p>
                  </div>
                }
              } @else {
                @if (state.data.stockItems.length) {
                  <div class="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>SKU</th>
                          <th>Product</th>
                          <th>Category</th>
                          <th>Physical</th>
                          <th>Reserved</th>
                          <th>Available</th>
                          <th>Reorder</th>
                          <th>Status</th>
                          <th>Updated</th>
                        </tr>
                      </thead>
                      <tbody>
                        @for (item of state.data.stockItems; track item.productId) {
                          <tr>
                            <td>{{ item.sku }}</td>
                            <td>
                              <strong>{{ item.name }}</strong>
                            </td>
                            <td>{{ item.category || '-' }}</td>
                            <td>{{ item.physicalStock }}</td>
                            <td>{{ item.reservedStock }}</td>
                            <td>{{ item.availableStock }}</td>
                            <td>{{ item.reorderLevel }}</td>
                            <td>
                              <span
                                class="status"
                                [class.due]="item.stockStatus === 'low_stock'"
                                [class.inactive]="item.stockStatus === 'out_of_stock'"
                              >
                                {{ labelStockStatus(item.stockStatus) }}
                              </span>
                            </td>
                            <td>{{ item.updatedAt | date: 'mediumDate' }}</td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  </div>
                } @else {
                  <div class="empty-state">
                    <mat-icon>warehouse</mat-icon>
                    <h2>No inventory found</h2>
                    <p>Add products or adjust search and filters.</p>
                  </div>
                }
              }

              <div class="pagination">
                <span>
                  Page {{ state.data.page }} of {{ totalPages(state.data) }} /
                  {{ state.data.total }} records
                </span>
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
      .inventory-page {
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
      .inventory-form,
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
      .inventory-form {
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
export class InventoryPageComponent {
  private readonly inventory = inject(InventoryApiService);
  private readonly products = inject(ProductApiService);
  private readonly masterData = inject(MasterDataApiService);
  private readonly refreshTrigger = new BehaviorSubject<void>(undefined);

  readonly selectedTab = signal('Stock summary');
  readonly searchText = signal('');
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly message = signal<string | null>(null);
  readonly showAdjustment = signal(false);
  readonly editingMovementId = signal<string | null>(null);
  segment: InventorySegment = 'all';
  stockStatus: StockStatusFilter = 'all';
  warehouseFilter = 'all';
  sort = 'name_asc';
  page = 1;
  pageSize = 10;
  form: CreateStockMovementDto = this.emptyForm();

  readonly state$ = this.refreshTrigger.pipe(
    switchMap(() =>
      forkJoin({
        data: this.inventory.listInventory({
          search: this.searchText(),
          segment: this.segment,
          stockStatus: this.stockStatus,
          warehouse: this.warehouseFilter,
          sort: this.sort,
          page: this.page,
          pageSize: this.pageSize,
        }),
        products: this.products.listProducts(),
        masterData: this.masterData.listMasterData({
          type: 'Inventory',
          status: 'active',
          pageSize: 100,
        }),
      }).pipe(
        map(({ data, products, masterData }): InventoryState => ({
          status: 'ready',
          data,
          products,
          warehouses: masterValues(masterData.items, 'Warehouse'),
          reasons: [
            ...new Set([
              ...masterValues(masterData.items, 'Stock Movement Reason'),
              ...masterValues(masterData.items, 'Damage Reason'),
              ...masterValues(masterData.items, 'Return Reason'),
            ]),
          ],
        })),
        startWith({ status: 'loading' } as InventoryState),
        catchError(() =>
          of({
            status: 'error',
            message: 'Check the API server and MongoDB connection, then refresh inventory.',
          } as InventoryState),
        ),
      ),
    ),
  );

  saveMovement(): void {
    if (!this.editingMovementId() && !this.form.productId) {
      this.error.set('Product is required for stock adjustment.');
      return;
    }
    if (!this.editingMovementId() && (!this.form.quantity || this.form.quantity < 1)) {
      this.error.set('Quantity must be at least 1.');
      return;
    }

    this.saving.set(true);
    this.error.set(null);
    this.message.set(null);
    const request = this.editingMovementId()
      ? this.inventory.updateMovement(this.editingMovementId() ?? '', {
          warehouse: this.form.warehouse,
          reason: this.form.reason,
          reference: this.form.reference,
          notes: this.form.notes,
        })
      : this.inventory.createMovement(this.formPayload());

    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.message.set(this.editingMovementId() ? 'Stock movement updated.' : 'Stock adjusted.');
        this.resetForm();
        this.selectTab('Transactions');
      },
      error: () => {
        this.saving.set(false);
        this.error.set(
          'Stock movement could not be saved. Check stock availability and required fields.',
        );
      },
    });
  }

  editMovement(movement: StockMovementDto): void {
    this.showAdjustment.set(true);
    this.editingMovementId.set(movement.id);
    this.form = {
      productId: movement.productId,
      warehouse: movement.warehouse ?? '',
      movementType: movement.movementType,
      direction: movement.direction,
      quantity: movement.quantity,
      reason: movement.reason ?? '',
      reference: movement.reference ?? '',
      notes: movement.notes ?? '',
    };
  }

  reverseMovement(movement: StockMovementDto): void {
    this.inventory.reverseMovement(movement.id).subscribe({
      next: () => {
        this.message.set('Stock movement reversed.');
        this.refresh();
      },
      error: () => this.error.set('Stock movement could not be reversed.'),
    });
  }

  resetForm(): void {
    this.editingMovementId.set(null);
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
    this.stockStatus = 'all';
    this.sort = 'name_asc';

    if (tab === 'Low stock') {
      this.segment = 'low_stock';
      this.stockStatus = 'low_stock';
      this.sort = 'available_asc';
    } else if (tab === 'Transactions') {
      this.segment = 'transactions';
      this.sort = 'newest';
    } else if (tab === 'Reservations') {
      this.segment = 'reservations';
    }

    this.applyFilters();
  }

  previousPage(): void {
    this.page = Math.max(this.page - 1, 1);
    this.refresh();
  }

  nextPage(data: InventoryListDto): void {
    this.page = Math.min(this.page + 1, this.totalPages(data));
    this.refresh();
  }

  tabs(data: InventoryListDto) {
    return [
      { label: 'Stock summary', count: data.summary.totalProducts },
      { label: 'Low stock', count: data.summary.lowStock },
      { label: 'Transactions', count: data.summary.transactions },
      { label: 'Reservations', count: data.summary.reservations },
    ];
  }

  totalPages(data: InventoryListDto): number {
    return Math.max(Math.ceil(data.total / data.pageSize), 1);
  }

  labelStockStatus(status: string): string {
    if (status === 'low_stock') return 'Low stock';
    if (status === 'out_of_stock') return 'Out of stock';
    return 'In stock';
  }

  labelMovementType(type: StockMovementType): string {
    return type
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  isEditingMovement(): boolean {
    return this.editingMovementId() !== null;
  }

  private refresh(): void {
    this.refreshTrigger.next();
  }

  private formPayload(): CreateStockMovementDto {
    return {
      ...this.form,
      quantity: Number(this.form.quantity) || 0,
      direction: this.directionForMovement(),
    };
  }

  private directionForMovement(): StockMovementDirection {
    if (this.form.movementType === 'damage') return 'out';
    if (this.form.movementType === 'return') return 'in';
    if (this.form.movementType === 'reservation') return 'out';
    if (this.form.movementType === 'release') return 'in';
    return this.form.direction;
  }

  private emptyForm(): CreateStockMovementDto {
    return {
      productId: '',
      warehouse: '',
      movementType: 'adjustment',
      direction: 'in',
      quantity: 1,
      reason: '',
      reference: '',
      notes: '',
    };
  }
}
