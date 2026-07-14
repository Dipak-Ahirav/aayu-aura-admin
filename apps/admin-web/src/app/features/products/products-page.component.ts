import { AsyncPipe, CurrencyPipe, DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import type { AdminProductDto, CreateProductDto, ProductStatus } from '@aayu-aura/shared-types';
import { BehaviorSubject, catchError, map, of, startWith, switchMap } from 'rxjs';
import { ProductApiService } from './product-api.service';

type ProductsState =
  | { status: 'loading' }
  | { status: 'ready'; products: AdminProductDto[] }
  | { status: 'error'; message: string };

type StatusFilter = 'All' | ProductStatus;

@Component({
  selector: 'aa-products-page',
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
    <section class="products-page">
      <div class="hero">
        <div>
          <p class="breadcrumb">Home / Products</p>
          <h1 class="page-title">Products</h1>
          <p class="muted">
            Maintain saree catalog records, stock levels, SKU pricing, GST details, and product
            status directly against MongoDB.
          </p>
        </div>
        <button mat-stroked-button type="button" (click)="refresh()">
          <mat-icon>refresh</mat-icon>
          Refresh
        </button>
      </div>

      @if (state$ | async; as state) {
        @if (state.status === 'loading') {
          <section class="state-panel" aria-live="polite">
            <mat-icon>hourglass_empty</mat-icon>
            <h2>Loading products</h2>
            <p>Reading catalog records from MongoDB.</p>
          </section>
        } @else if (state.status === 'error') {
          <section class="state-panel error" role="alert">
            <mat-icon>error</mat-icon>
            <h2>Products unavailable</h2>
            <p>{{ state.message }}</p>
          </section>
        } @else {
          <section class="metrics" aria-label="Product summary">
            <article class="maroon">
              <span>Total products</span><strong>{{ state.products.length }}</strong>
            </article>
            <article class="plum">
              <span>Stock pieces</span><strong>{{ stockPieces(state.products) }}</strong>
            </article>
            <article class="gold">
              <span>Inventory value</span
              ><strong>{{
                inventoryValue(state.products) | currency: 'INR' : 'symbol' : '1.0-0'
              }}</strong>
            </article>
            <article class="green">
              <span>Low stock</span><strong>{{ lowStockCount(state.products) }}</strong>
            </article>
          </section>

          <section class="create-panel">
            <div>
              <h2>{{ editingProductId() ? 'Update product' : 'Create product' }}</h2>
              <p>
                Add a product with SKU, pricing, stock, GST, and category. SKU is saved uppercase.
              </p>
            </div>

            <div class="form-grid">
              <mat-form-field appearance="outline">
                <mat-label>Product name</mat-label>
                <input matInput [(ngModel)]="form.name" name="productName" />
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>SKU</mat-label>
                <input matInput [(ngModel)]="form.sku" name="productSku" />
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Category</mat-label>
                <input matInput [(ngModel)]="form.category" name="productCategory" />
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Status</mat-label>
                <mat-select [(ngModel)]="form.status" name="productStatus">
                  @for (status of productStatuses; track status) {
                    <mat-option [value]="status">{{ status }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Purchase price</mat-label>
                <input matInput type="number" [(ngModel)]="purchasePrice" name="purchasePrice" />
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Landed cost</mat-label>
                <input matInput type="number" [(ngModel)]="landedCost" name="landedCost" />
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Selling price</mat-label>
                <input matInput type="number" [(ngModel)]="sellingPrice" name="sellingPrice" />
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Physical stock</mat-label>
                <input
                  matInput
                  type="number"
                  [(ngModel)]="form.currentPhysicalStock"
                  name="stock"
                />
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Reserved stock</mat-label>
                <input matInput type="number" [(ngModel)]="form.reservedStock" name="reserved" />
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Reorder level</mat-label>
                <input matInput type="number" [(ngModel)]="form.reorderLevel" name="reorder" />
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>HSN</mat-label>
                <input matInput [(ngModel)]="form.hsn" name="hsn" />
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>GST rate</mat-label>
                <input matInput type="number" [(ngModel)]="form.gstRate" name="gstRate" />
              </mat-form-field>

              <mat-form-field appearance="outline" class="wide">
                <mat-label>Internal notes</mat-label>
                <input matInput [(ngModel)]="form.internalNotes" name="notes" />
              </mat-form-field>
            </div>

            <div class="form-actions">
              <button
                mat-flat-button
                color="primary"
                type="button"
                (click)="saveProduct()"
                [disabled]="saving()"
              >
                <mat-icon>{{ editingProductId() ? 'save' : 'add' }}</mat-icon>
                {{
                  saving() ? 'Saving...' : editingProductId() ? 'Save product' : 'Create product'
                }}
              </button>
              <button mat-stroked-button type="button" (click)="resetForm()">
                <mat-icon>close</mat-icon>
                Clear
              </button>
            </div>
          </section>

          @if (error()) {
            <p class="error" role="alert">{{ error() }}</p>
          }

          <section class="filters-panel">
            <mat-form-field appearance="outline">
              <mat-label>Search name, SKU, category, HSN</mat-label>
              <input
                matInput
                [ngModel]="searchText()"
                (ngModelChange)="searchText.set($event)"
                name="productSearch"
              />
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Status</mat-label>
              <mat-select [(ngModel)]="statusFilter" name="statusFilter">
                @for (status of statusOptions; track status) {
                  <mat-option [value]="status">{{ status }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
          </section>

          <section class="content-grid">
            <article class="table-panel">
              <div class="panel-heading">
                <h2>Product list</h2>
                <p>{{ filteredProducts(state.products).length }} matching products</p>
              </div>

              @if (filteredProducts(state.products).length) {
                <div class="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>SKU</th>
                        <th>Category</th>
                        <th>Selling</th>
                        <th>Available</th>
                        <th>Reserved</th>
                        <th>Status</th>
                        <th>Updated</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (product of filteredProducts(state.products); track product.id) {
                        <tr
                          [class.selected]="selectedProduct()?.id === product.id"
                          (click)="selectProduct(product)"
                          tabindex="0"
                        >
                          <td>
                            <strong>{{ product.name }}</strong>
                            @if (product.hsn) {
                              <small>HSN {{ product.hsn }}</small>
                            }
                          </td>
                          <td>{{ product.sku }}</td>
                          <td>{{ product.category || 'Uncategorised' }}</td>
                          <td>
                            {{
                              rupees(product.sellingPriceInPaise)
                                | currency: 'INR' : 'symbol' : '1.0-0'
                            }}
                          </td>
                          <td [class.low]="isLowStock(product)">
                            {{ product.availableStock }}
                          </td>
                          <td>{{ product.reservedStock }}</td>
                          <td>
                            <span class="status">{{ product.status }}</span>
                          </td>
                          <td>{{ product.createdAt | date: 'mediumDate' }}</td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              } @else {
                <div class="empty-state">
                  <mat-icon>inventory_2</mat-icon>
                  <h2>No products match the current filters</h2>
                  <p>Create a product or clear filters.</p>
                </div>
              }
            </article>

            <aside class="detail-panel">
              @if (selectedProduct(); as product) {
                <article>
                  <h2>{{ product.name }}</h2>
                  <p class="muted">{{ product.sku }} / {{ product.category || 'Uncategorised' }}</p>
                  <dl>
                    <div>
                      <dt>Status</dt>
                      <dd>{{ product.status }}</dd>
                    </div>
                    <div>
                      <dt>Physical stock</dt>
                      <dd>{{ product.currentPhysicalStock }}</dd>
                    </div>
                    <div>
                      <dt>Reserved</dt>
                      <dd>{{ product.reservedStock }}</dd>
                    </div>
                    <div>
                      <dt>Available</dt>
                      <dd>{{ product.availableStock }}</dd>
                    </div>
                    <div>
                      <dt>Purchase</dt>
                      <dd>
                        {{
                          rupees(product.purchasePriceInPaise)
                            | currency: 'INR' : 'symbol' : '1.0-0'
                        }}
                      </dd>
                    </div>
                    <div>
                      <dt>Selling</dt>
                      <dd>
                        {{
                          rupees(product.sellingPriceInPaise) | currency: 'INR' : 'symbol' : '1.0-0'
                        }}
                      </dd>
                    </div>
                    <div>
                      <dt>GST</dt>
                      <dd>{{ product.gstRate || 0 }}%</dd>
                    </div>
                  </dl>
                  <div class="detail-actions">
                    <button mat-stroked-button type="button" (click)="editProduct(product)">
                      <mat-icon>edit</mat-icon>
                      Edit
                    </button>
                    <button mat-stroked-button type="button" (click)="archiveProduct(product)">
                      <mat-icon>archive</mat-icon>
                      Archive
                    </button>
                  </div>
                </article>
              } @else {
                <article class="empty-detail">
                  <mat-icon>touch_app</mat-icon>
                  <h2>Select a product</h2>
                  <p>Click any product row to inspect pricing, GST, stock, and status.</p>
                </article>
              }
            </aside>
          </section>
        }
      }
    </section>
  `,
  styles: [
    `
      .products-page {
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
      .metrics {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 14px;
      }
      .metrics article,
      .create-panel,
      .filters-panel,
      .table-panel,
      .detail-panel article,
      .state-panel,
      .error {
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
        overflow-wrap: anywhere;
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
      .create-panel {
        display: grid;
        gap: 16px;
        padding: 20px;
      }
      .form-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(180px, 1fr));
        gap: 14px;
      }
      .form-grid .wide {
        grid-column: span 2;
      }
      .form-actions,
      .detail-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
      }
      .filters-panel {
        display: grid;
        grid-template-columns: minmax(260px, 1fr) 220px;
        gap: 14px;
        padding: 16px;
      }
      .content-grid {
        display: grid;
        grid-template-columns: minmax(0, 1.35fr) minmax(320px, 0.65fr);
        gap: 16px;
        align-items: start;
      }
      .table-panel,
      .detail-panel article {
        padding: 22px;
      }
      .panel-heading {
        display: flex;
        justify-content: space-between;
        gap: 16px;
        align-items: center;
        margin-bottom: 16px;
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
        min-width: 940px;
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
        min-height: 28px;
        align-items: center;
        padding: 0 10px;
        border-radius: 999px;
        background: rgba(123, 31, 53, 0.08);
        color: var(--aa-maroon);
        font-weight: 700;
      }
      .low {
        color: #a12424;
        font-weight: 800;
      }
      .detail-panel {
        display: grid;
        gap: 16px;
        position: sticky;
        top: 92px;
      }
      dl {
        display: grid;
        gap: 12px;
        margin: 18px 0;
      }
      dl div {
        display: flex;
        justify-content: space-between;
        gap: 16px;
        padding-bottom: 12px;
        border-bottom: 1px solid var(--aa-border);
      }
      dt {
        color: var(--aa-muted);
        font-weight: 700;
      }
      dd {
        margin: 0;
        font-weight: 800;
      }
      .empty-state,
      .state-panel,
      .empty-detail {
        min-height: 280px;
        display: grid;
        place-items: center;
        align-content: center;
        gap: 10px;
        padding: 28px;
        text-align: center;
        color: var(--aa-muted);
      }
      .empty-state mat-icon,
      .state-panel mat-icon,
      .empty-detail mat-icon {
        width: 48px;
        height: 48px;
        font-size: 48px;
        color: var(--aa-maroon);
      }
      .state-panel.error mat-icon {
        color: #a12424;
      }
      .error {
        margin: 0;
        padding: 12px 14px;
        color: #a12424;
        font-weight: 700;
        background: rgba(161, 36, 36, 0.1);
      }
      @media (max-width: 1180px) {
        .metrics {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
        .form-grid,
        .filters-panel,
        .content-grid {
          grid-template-columns: 1fr;
        }
        .form-grid .wide {
          grid-column: auto;
        }
        .detail-panel {
          position: static;
        }
      }
      @media (max-width: 720px) {
        .hero {
          flex-direction: column;
          align-items: stretch;
        }
        .metrics {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class ProductsPageComponent {
  private readonly products = inject(ProductApiService);
  private readonly refreshTrigger = new BehaviorSubject<void>(undefined);

  readonly selectedProduct = signal<AdminProductDto | null>(null);
  readonly editingProductId = signal<string | null>(null);
  readonly searchText = signal('');
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly productStatuses: ProductStatus[] = ['active', 'draft', 'archived'];
  readonly statusOptions: StatusFilter[] = ['All', 'active', 'draft', 'archived'];
  statusFilter: StatusFilter = 'All';
  purchasePrice = 0;
  landedCost = 0;
  sellingPrice = 0;
  form: Omit<
    CreateProductDto,
    'purchasePriceInPaise' | 'landedCostInPaise' | 'sellingPriceInPaise'
  > = {
    name: '',
    sku: '',
    category: '',
    status: 'active',
    currentPhysicalStock: 0,
    reservedStock: 0,
    reorderLevel: 5,
    hsn: '',
    gstRate: 0,
    internalNotes: '',
  };

  readonly state$ = this.refreshTrigger.pipe(
    switchMap(() =>
      this.products.listProducts().pipe(
        map((products): ProductsState => {
          if (!this.selectedProduct() && products[0]) {
            this.selectedProduct.set(products[0]);
          }
          return { status: 'ready', products };
        }),
        startWith({ status: 'loading' } as ProductsState),
        catchError(() =>
          of({
            status: 'error',
            message: 'Check the API server and MongoDB connection, then refresh products.',
          } as ProductsState),
        ),
      ),
    ),
  );

  refresh(): void {
    this.refreshTrigger.next();
  }

  saveProduct(): void {
    if (!this.form.name.trim() || !this.form.sku.trim()) {
      this.error.set('Product name and SKU are required.');
      return;
    }

    const payload = this.formPayload();
    this.error.set(null);
    this.saving.set(true);
    const request = this.editingProductId()
      ? this.products.updateProduct(this.editingProductId() ?? '', payload)
      : this.products.createProduct(payload);

    request.subscribe({
      next: (product) => {
        this.saving.set(false);
        this.selectedProduct.set(product);
        this.resetForm();
        this.refresh();
      },
      error: () => {
        this.saving.set(false);
        this.error.set('Product could not be saved. Check SKU uniqueness and required fields.');
      },
    });
  }

  selectProduct(product: AdminProductDto): void {
    this.selectedProduct.set(product);
  }

  editProduct(product: AdminProductDto): void {
    this.editingProductId.set(product.id);
    this.form = {
      name: product.name,
      sku: product.sku,
      category: product.category ?? '',
      status: product.status,
      currentPhysicalStock: product.currentPhysicalStock,
      reservedStock: product.reservedStock,
      reorderLevel: product.reorderLevel ?? 5,
      hsn: product.hsn ?? '',
      gstRate: product.gstRate ?? 0,
      internalNotes: product.internalNotes ?? '',
    };
    this.purchasePrice = this.rupees(product.purchasePriceInPaise);
    this.landedCost = this.rupees(product.landedCostInPaise);
    this.sellingPrice = this.rupees(product.sellingPriceInPaise);
  }

  archiveProduct(product: AdminProductDto): void {
    this.saving.set(true);
    this.products.updateProduct(product.id, { status: 'archived' }).subscribe({
      next: (updated) => {
        this.saving.set(false);
        this.selectedProduct.set(updated);
        this.refresh();
      },
      error: () => {
        this.saving.set(false);
        this.error.set('Product could not be archived.');
      },
    });
  }

  resetForm(): void {
    this.editingProductId.set(null);
    this.purchasePrice = 0;
    this.landedCost = 0;
    this.sellingPrice = 0;
    this.form = {
      name: '',
      sku: '',
      category: '',
      status: 'active',
      currentPhysicalStock: 0,
      reservedStock: 0,
      reorderLevel: 5,
      hsn: '',
      gstRate: 0,
      internalNotes: '',
    };
  }

  filteredProducts(products: readonly AdminProductDto[]): AdminProductDto[] {
    const search = this.searchText().trim().toLowerCase();
    return products.filter((product) => {
      const matchesStatus = this.statusFilter === 'All' || product.status === this.statusFilter;
      const searchable = [product.name, product.sku, product.category ?? '', product.hsn ?? '']
        .join(' ')
        .toLowerCase();
      return matchesStatus && (!search || searchable.includes(search));
    });
  }

  stockPieces(products: readonly AdminProductDto[]): number {
    return products.reduce((sum, product) => sum + product.currentPhysicalStock, 0);
  }

  inventoryValue(products: readonly AdminProductDto[]): number {
    return this.rupees(
      products.reduce(
        (sum, product) => sum + product.currentPhysicalStock * product.landedCostInPaise,
        0,
      ),
    );
  }

  lowStockCount(products: readonly AdminProductDto[]): number {
    return products.filter((product) => this.isLowStock(product)).length;
  }

  isLowStock(product: AdminProductDto): boolean {
    return product.availableStock <= (product.reorderLevel ?? 5);
  }

  rupees(valueInPaise: number): number {
    return valueInPaise / 100;
  }

  private formPayload(): CreateProductDto {
    return {
      ...this.form,
      purchasePriceInPaise: this.paise(this.purchasePrice),
      landedCostInPaise: this.paise(this.landedCost),
      sellingPriceInPaise: this.paise(this.sellingPrice),
      reservedStock: Math.min(this.form.reservedStock ?? 0, this.form.currentPhysicalStock),
    };
  }

  private paise(value: number): number {
    return Math.round((Number(value) || 0) * 100);
  }
}
