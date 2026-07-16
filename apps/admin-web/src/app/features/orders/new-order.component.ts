import { CurrencyPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import type { CreateOrderDto, OrderSource } from '@aayu-aura/shared-types';
import { MasterDataApiService } from '../master-data/master-data-api.service';
import { masterValues } from '../master-data/master-data-registry';
import { OrderApiService } from './order-api.service';

interface DraftItem {
  productName: string;
  sku: string;
  hsn: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  gstRate: number;
}

@Component({
  selector: 'aa-new-order',
  standalone: true,
  imports: [
    CurrencyPipe,
    FormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
  ],
  template: `
    <section class="order-page">
      <div class="hero">
        <div>
          <p class="breadcrumb">Home / Orders / New order</p>
          <h1 class="page-title">Create order</h1>
          <p class="muted">
            Create a manual order, calculate totals on the backend, save customer details, and
            persist the order in MongoDB.
          </p>
        </div>
        <a mat-stroked-button routerLink="/orders">
          <mat-icon>arrow_back</mat-icon>
          Orders
        </a>
      </div>

      <form class="order-grid" (ngSubmit)="submit()">
        <section class="form-panel">
          <h2>Customer</h2>
          <div class="fields two">
            <mat-form-field appearance="outline">
              <mat-label>Name</mat-label>
              <input matInput name="customerName" [(ngModel)]="customerName" required />
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Mobile</mat-label>
              <input matInput name="customerMobile" [(ngModel)]="customerMobile" required />
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Email</mat-label>
              <input matInput name="customerEmail" [(ngModel)]="customerEmail" type="email" />
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Order source</mat-label>
              <mat-select name="source" [(ngModel)]="source">
                @for (option of sources(); track option) {
                  <mat-option [value]="option">{{ option }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
          </div>

          <div class="fields two">
            <mat-form-field appearance="outline">
              <mat-label>Billing address</mat-label>
              <textarea
                matInput
                name="billingAddress"
                [(ngModel)]="billingAddress"
                rows="3"
              ></textarea>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Shipping address</mat-label>
              <textarea
                matInput
                name="shippingAddress"
                [(ngModel)]="shippingAddress"
                rows="3"
              ></textarea>
            </mat-form-field>
          </div>
        </section>

        <section class="form-panel">
          <div class="panel-title">
            <h2>Items</h2>
            <button mat-stroked-button type="button" (click)="addItem()">
              <mat-icon>add</mat-icon>
              Add item
            </button>
          </div>

          @for (item of items; track $index) {
            <article class="item-row">
              <div class="fields item-fields">
                <mat-form-field appearance="outline">
                  <mat-label>Product name</mat-label>
                  <input
                    matInput
                    [name]="'productName' + $index"
                    [(ngModel)]="item.productName"
                    required
                  />
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>SKU</mat-label>
                  <input matInput [name]="'sku' + $index" [(ngModel)]="item.sku" />
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Qty</mat-label>
                  <input
                    matInput
                    [name]="'quantity' + $index"
                    [(ngModel)]="item.quantity"
                    type="number"
                    min="1"
                    required
                  />
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Unit price</mat-label>
                  <input
                    matInput
                    [name]="'unitPrice' + $index"
                    [(ngModel)]="item.unitPrice"
                    type="number"
                    min="0"
                    required
                  />
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Discount</mat-label>
                  <input
                    matInput
                    [name]="'discount' + $index"
                    [(ngModel)]="item.discount"
                    type="number"
                    min="0"
                  />
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>GST %</mat-label>
                  <input
                    matInput
                    [name]="'gstRate' + $index"
                    [(ngModel)]="item.gstRate"
                    type="number"
                    min="0"
                    max="28"
                  />
                </mat-form-field>
              </div>

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
        </section>

        <section class="form-panel">
          <h2>Charges and notes</h2>
          <div class="fields four">
            <mat-form-field appearance="outline">
              <mat-label>Shipping</mat-label>
              <input matInput name="shipping" [(ngModel)]="shippingCharge" type="number" min="0" />
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Packaging</mat-label>
              <input
                matInput
                name="packaging"
                [(ngModel)]="packagingCharge"
                type="number"
                min="0"
              />
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Other charge</mat-label>
              <input matInput name="otherCharge" [(ngModel)]="otherCharge" type="number" min="0" />
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Advance paid</mat-label>
              <input matInput name="advancePaid" [(ngModel)]="advancePaid" type="number" min="0" />
            </mat-form-field>
          </div>

          <div class="fields two">
            <mat-form-field appearance="outline">
              <mat-label>Customer notes</mat-label>
              <textarea matInput name="notes" [(ngModel)]="notes" rows="3"></textarea>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Internal notes</mat-label>
              <textarea
                matInput
                name="internalNotes"
                [(ngModel)]="internalNotes"
                rows="3"
              ></textarea>
            </mat-form-field>
          </div>
        </section>

        <aside class="summary-panel">
          <h2>Order summary</h2>
          <dl>
            <div>
              <dt>Subtotal</dt>
              <dd>{{ subtotal() | currency: 'INR' : 'symbol' : '1.0-0' }}</dd>
            </div>
            <div>
              <dt>Discount</dt>
              <dd>{{ discountTotal() | currency: 'INR' : 'symbol' : '1.0-0' }}</dd>
            </div>
            <div>
              <dt>GST</dt>
              <dd>{{ taxTotal() | currency: 'INR' : 'symbol' : '1.0-0' }}</dd>
            </div>
            <div>
              <dt>Charges</dt>
              <dd>{{ chargesTotal() | currency: 'INR' : 'symbol' : '1.0-0' }}</dd>
            </div>
            <div class="grand">
              <dt>Total</dt>
              <dd>{{ grandTotal() | currency: 'INR' : 'symbol' : '1.0-0' }}</dd>
            </div>
            <div>
              <dt>Advance</dt>
              <dd>{{ advancePaid | currency: 'INR' : 'symbol' : '1.0-0' }}</dd>
            </div>
            <div>
              <dt>Due</dt>
              <dd>{{ dueAmount() | currency: 'INR' : 'symbol' : '1.0-0' }}</dd>
            </div>
          </dl>

          @if (error()) {
            <p class="error" role="alert">{{ error() }}</p>
          }

          @if (createdOrderNumber()) {
            <p class="success" role="status">Created {{ createdOrderNumber() }}</p>
          }

          <button mat-flat-button color="primary" type="submit" [disabled]="saving()">
            <mat-icon>save</mat-icon>
            {{ saving() ? 'Saving...' : 'Create order' }}
          </button>
        </aside>
      </form>
    </section>
  `,
  styles: [
    `
      .order-page {
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
        background:
          linear-gradient(110deg, rgba(255, 253, 249, 0.94), rgba(255, 253, 249, 0.82)),
          linear-gradient(135deg, rgba(123, 31, 53, 0.14), rgba(189, 139, 58, 0.16));
        border: 1px solid var(--aa-border);
      }
      .breadcrumb {
        margin: 0 0 14px;
        color: var(--aa-maroon);
        font-weight: 700;
        font-size: 0.84rem;
      }
      .hero p:last-child {
        max-width: 720px;
        margin: 14px 0 0;
        line-height: 1.7;
      }
      .order-grid {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 340px;
        gap: 16px;
        align-items: start;
      }
      .form-panel,
      .summary-panel {
        background: var(--aa-surface-strong);
        border: 1px solid var(--aa-border);
        border-radius: 8px;
        box-shadow: 0 10px 30px rgba(74, 31, 69, 0.07);
        padding: 22px;
      }
      .form-panel {
        grid-column: 1;
      }
      .summary-panel {
        position: sticky;
        top: 92px;
        grid-column: 2;
        grid-row: 1 / span 3;
      }
      .panel-title {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 16px;
        margin-bottom: 16px;
      }
      h2 {
        margin: 0 0 18px;
        font-size: 1.1rem;
      }
      .panel-title h2,
      .summary-panel h2 {
        margin-bottom: 0;
      }
      .fields {
        display: grid;
        gap: 14px;
      }
      .fields.two {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
      .fields.four {
        grid-template-columns: repeat(4, minmax(0, 1fr));
      }
      .item-row {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 10px;
        align-items: center;
        padding: 14px 0;
        border-top: 1px solid var(--aa-border);
      }
      .item-row:first-of-type {
        border-top: 0;
      }
      .item-fields {
        grid-template-columns: minmax(190px, 1.5fr) minmax(120px, 0.8fr) repeat(
            4,
            minmax(92px, 0.65fr)
          );
      }
      dl {
        display: grid;
        gap: 12px;
        margin: 18px 0;
      }
      dl div {
        display: flex;
        justify-content: space-between;
        gap: 18px;
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
      .grand {
        font-size: 1.15rem;
        color: var(--aa-maroon);
      }
      .summary-panel button {
        width: 100%;
        min-height: 44px;
      }
      .error,
      .success {
        margin: 0 0 14px;
        padding: 12px;
        border-radius: 8px;
        font-weight: 700;
      }
      .error {
        color: #a12424;
        background: rgba(161, 36, 36, 0.1);
      }
      .success {
        color: var(--aa-success);
        background: rgba(40, 114, 79, 0.1);
      }
      @media (max-width: 1100px) {
        .order-grid {
          grid-template-columns: 1fr;
        }
        .form-panel,
        .summary-panel {
          grid-column: 1;
        }
        .summary-panel {
          position: static;
          grid-row: auto;
        }
        .fields.four,
        .fields.two,
        .item-fields {
          grid-template-columns: 1fr;
        }
      }
      @media (max-width: 720px) {
        .hero {
          flex-direction: column;
          align-items: stretch;
        }
      }
    `,
  ],
})
export class NewOrderComponent {
  private readonly orders = inject(OrderApiService);
  private readonly masterData = inject(MasterDataApiService);
  private readonly router = inject(Router);

  readonly sources = signal<OrderSource[]>([]);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly createdOrderNumber = signal<string | null>(null);

  customerName = '';
  customerMobile = '';
  customerEmail = '';
  billingAddress = '';
  shippingAddress = '';
  source: OrderSource = 'Admin';
  shippingCharge = 0;
  packagingCharge = 0;
  otherCharge = 0;
  advancePaid = 0;
  notes = '';
  internalNotes = '';
  items: DraftItem[] = [this.emptyItem()];

  constructor() {
    this.masterData
      .listMasterData({
        type: 'Order setup',
        status: 'active',
        sort: 'sort_order',
        page: 1,
        pageSize: 100,
      })
      .subscribe({
        next: (data) => this.sources.set(masterValues(data.items, 'Order Source')),
        error: () => this.sources.set(masterValues([], 'Order Source')),
      });
  }

  subtotal(): number {
    return this.items.reduce(
      (sum, item) => sum + this.money(item.unitPrice) * this.quantity(item.quantity),
      0,
    );
  }

  discountTotal(): number {
    return this.items.reduce(
      (sum, item) =>
        sum +
        Math.min(
          this.money(item.discount),
          this.money(item.unitPrice) * this.quantity(item.quantity),
        ),
      0,
    );
  }

  taxTotal(): number {
    return this.items.reduce((sum, item) => {
      const gross = this.money(item.unitPrice) * this.quantity(item.quantity);
      const discount = Math.min(this.money(item.discount), gross);
      return sum + Math.round(((gross - discount) * Math.max(Number(item.gstRate) || 0, 0)) / 100);
    }, 0);
  }

  chargesTotal(): number {
    return (
      this.money(this.shippingCharge) +
      this.money(this.packagingCharge) +
      this.money(this.otherCharge)
    );
  }

  grandTotal(): number {
    return this.subtotal() - this.discountTotal() + this.taxTotal() + this.chargesTotal();
  }

  dueAmount(): number {
    return Math.max(this.grandTotal() - this.money(this.advancePaid), 0);
  }

  addItem(): void {
    this.items = [...this.items, this.emptyItem()];
  }

  removeItem(index: number): void {
    if (this.items.length === 1) {
      return;
    }
    this.items = this.items.filter((_item, itemIndex) => itemIndex !== index);
  }

  submit(): void {
    this.error.set(null);
    this.createdOrderNumber.set(null);

    if (!this.customerName.trim() || !this.customerMobile.trim()) {
      this.error.set('Customer name and mobile are required.');
      return;
    }

    if (this.items.some((item) => !item.productName.trim() || this.quantity(item.quantity) < 1)) {
      this.error.set('Each item needs a product name and quantity.');
      return;
    }

    this.saving.set(true);
    this.orders.createOrder(this.toPayload()).subscribe({
      next: (order) => {
        this.saving.set(false);
        this.createdOrderNumber.set(order.orderNumber);
        setTimeout(() => void this.router.navigateByUrl('/orders'), 900);
      },
      error: () => {
        this.saving.set(false);
        this.error.set('Order could not be created. Check required fields and API connection.');
      },
    });
  }

  private emptyItem(): DraftItem {
    return {
      productName: '',
      sku: '',
      hsn: '',
      quantity: 1,
      unitPrice: 0,
      discount: 0,
      gstRate: 0,
    };
  }

  private quantity(value: number): number {
    return Math.max(Math.trunc(Number(value) || 0), 0);
  }

  private money(value: number): number {
    return Math.max(Number(value) || 0, 0);
  }

  private paise(value: number): number {
    return Math.round(this.money(value) * 100);
  }

  private toPayload(): CreateOrderDto {
    return {
      source: this.source,
      customer: {
        name: this.customerName.trim(),
        mobile: this.customerMobile.trim(),
        email: this.customerEmail.trim() || undefined,
        billingAddress: this.billingAddress.trim() || undefined,
        shippingAddress: this.shippingAddress.trim() || undefined,
      },
      items: this.items.map((item) => ({
        productName: item.productName.trim(),
        sku: item.sku.trim() || undefined,
        hsn: item.hsn.trim() || undefined,
        quantity: this.quantity(item.quantity),
        unitPriceInPaise: this.paise(item.unitPrice),
        discountInPaise: this.paise(item.discount),
        gstRate: Math.max(Number(item.gstRate) || 0, 0),
      })),
      shippingChargeInPaise: this.paise(this.shippingCharge),
      packagingChargeInPaise: this.paise(this.packagingCharge),
      otherChargeInPaise: this.paise(this.otherCharge),
      advancePaidInPaise: this.paise(this.advancePaid),
      notes: this.notes.trim() || undefined,
      internalNotes: this.internalNotes.trim() || undefined,
    };
  }
}
