import { AsyncPipe, CurrencyPipe, DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import type { InvoiceDto, InvoiceStatus, InvoiceType, OrderDto } from '@aayu-aura/shared-types';
import { BehaviorSubject, catchError, forkJoin, map, of, startWith, switchMap } from 'rxjs';
import { MasterDataApiService } from '../master-data/master-data-api.service';
import { masterValues } from '../master-data/master-data-registry';
import { OrderApiService } from '../orders/order-api.service';
import { InvoiceApiService } from './invoice-api.service';

type InvoicesState =
  | { status: 'loading' }
  | { status: 'ready'; invoices: InvoiceDto[]; orders: OrderDto[]; invoiceTypes: string[] }
  | { status: 'error'; message: string };

type InvoiceStatusFilter = 'All' | InvoiceStatus;

@Component({
  selector: 'aa-invoices-page',
  standalone: true,
  imports: [
    AsyncPipe,
    CurrencyPipe,
    DatePipe,
    FormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
  ],
  template: `
    <section class="invoices-page">
      <div class="hero">
        <div>
          <p class="breadcrumb">Home / Invoices</p>
          <h1 class="page-title">Invoices</h1>
          <p class="muted">
            Generate invoices from MongoDB orders, review finalised invoice totals, and inspect
            customer and line-item snapshots.
          </p>
        </div>
        <a mat-stroked-button routerLink="/orders">
          <mat-icon>receipt_long</mat-icon>
          Orders
        </a>
      </div>

      @if (state$ | async; as state) {
        @if (state.status === 'loading') {
          <section class="state-panel" aria-live="polite">
            <mat-icon>hourglass_empty</mat-icon>
            <h2>Loading invoices</h2>
            <p>Reading invoices and orders from MongoDB.</p>
          </section>
        } @else if (state.status === 'error') {
          <section class="state-panel error" role="alert">
            <mat-icon>error</mat-icon>
            <h2>Invoices unavailable</h2>
            <p>{{ state.message }}</p>
          </section>
        } @else {
          <section class="metrics" aria-label="Invoice summary">
            <article class="maroon">
              <span>Total invoices</span><strong>{{ state.invoices.length }}</strong>
            </article>
            <article class="plum">
              <span>Invoice value</span
              ><strong>{{
                invoiceValue(state.invoices) | currency: 'INR' : 'symbol' : '1.0-0'
              }}</strong>
            </article>
            <article class="gold">
              <span>Due amount</span
              ><strong>{{
                invoiceDue(state.invoices) | currency: 'INR' : 'symbol' : '1.0-0'
              }}</strong>
            </article>
            <article class="green">
              <span>Finalised</span><strong>{{ statusCount(state.invoices, 'Finalised') }}</strong>
            </article>
          </section>

          <section class="create-panel">
            <div>
              <h2>Create invoice from order</h2>
              <p>
                Select an existing order. The backend snapshots totals and creates a locked invoice
                number.
              </p>
            </div>
            <mat-form-field appearance="outline">
              <mat-label>Order</mat-label>
              <mat-select [(ngModel)]="selectedOrderId" name="selectedOrderId">
                @for (order of unInvoicedOrders(state.orders, state.invoices); track order.id) {
                  <mat-option [value]="order.id">
                    {{ order.orderNumber }} / {{ order.customer.name }} /
                    {{ rupees(order.totalInPaise) | currency: 'INR' : 'symbol' : '1.0-0' }}
                  </mat-option>
                }
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Invoice type</mat-label>
              <mat-select [(ngModel)]="invoiceType" name="invoiceType">
                @for (type of state.invoiceTypes; track type) {
                  <mat-option [value]="type">{{ type }}</mat-option>
                }
              </mat-select>
            </mat-form-field>

            <button
              mat-flat-button
              color="primary"
              type="button"
              (click)="createInvoice()"
              [disabled]="saving() || !selectedOrderId"
            >
              <mat-icon>add</mat-icon>
              {{ saving() ? 'Creating...' : 'Generate invoice' }}
            </button>
          </section>

          @if (error()) {
            <p class="error" role="alert">{{ error() }}</p>
          }

          <section class="filters-panel">
            <mat-form-field appearance="outline">
              <mat-label>Search invoice, order, customer, mobile</mat-label>
              <input
                matInput
                [ngModel]="searchText()"
                (ngModelChange)="searchText.set($event)"
                name="invoiceSearch"
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
                <h2>Invoice list</h2>
                <p>{{ filteredInvoices(state.invoices).length }} matching invoices</p>
              </div>

              @if (filteredInvoices(state.invoices).length) {
                <div class="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Invoice</th>
                        <th>Order</th>
                        <th>Customer</th>
                        <th>Type</th>
                        <th>Total</th>
                        <th>Due</th>
                        <th>Status</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (invoice of filteredInvoices(state.invoices); track invoice.id) {
                        <tr
                          [class.selected]="selectedInvoice()?.id === invoice.id"
                          (click)="selectedInvoice.set(invoice)"
                          tabindex="0"
                        >
                          <td>
                            <strong>{{ invoice.invoiceNumber }}</strong>
                          </td>
                          <td>{{ invoice.orderNumber }}</td>
                          <td>
                            <span>{{ invoice.customer.name }}</span>
                            <small>{{ invoice.customer.mobile }}</small>
                          </td>
                          <td>{{ invoice.type }}</td>
                          <td>
                            {{
                              rupees(invoice.grandTotalInPaise)
                                | currency: 'INR' : 'symbol' : '1.0-0'
                            }}
                          </td>
                          <td>
                            {{
                              rupees(invoice.dueAmountInPaise)
                                | currency: 'INR' : 'symbol' : '1.0-0'
                            }}
                          </td>
                          <td>
                            <span class="status">{{ invoice.status }}</span>
                          </td>
                          <td>{{ invoice.invoiceDate | date: 'mediumDate' }}</td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              } @else {
                <div class="empty-state">
                  <mat-icon>description</mat-icon>
                  <h2>No invoices match the current filters</h2>
                  <p>Create an invoice from an order or clear filters.</p>
                </div>
              }
            </article>

            <aside class="detail-panel">
              @if (selectedInvoice(); as invoice) {
                <article>
                  <h2>{{ invoice.invoiceNumber }}</h2>
                  <p class="muted">{{ invoice.customer.name }} / {{ invoice.orderNumber }}</p>
                  <dl>
                    <div>
                      <dt>Status</dt>
                      <dd>{{ invoice.status }}</dd>
                    </div>
                    <div>
                      <dt>Type</dt>
                      <dd>{{ invoice.type }}</dd>
                    </div>
                    <div>
                      <dt>Items</dt>
                      <dd>{{ invoice.items.length }}</dd>
                    </div>
                    <div>
                      <dt>Taxable</dt>
                      <dd>
                        {{
                          rupees(invoice.taxableAmountInPaise)
                            | currency: 'INR' : 'symbol' : '1.0-0'
                        }}
                      </dd>
                    </div>
                    <div>
                      <dt>GST</dt>
                      <dd>
                        {{
                          rupees(invoice.taxAmountInPaise) | currency: 'INR' : 'symbol' : '1.0-0'
                        }}
                      </dd>
                    </div>
                    <div>
                      <dt>Grand total</dt>
                      <dd>
                        {{
                          rupees(invoice.grandTotalInPaise) | currency: 'INR' : 'symbol' : '1.0-0'
                        }}
                      </dd>
                    </div>
                    <div>
                      <dt>Due</dt>
                      <dd>
                        {{
                          rupees(invoice.dueAmountInPaise) | currency: 'INR' : 'symbol' : '1.0-0'
                        }}
                      </dd>
                    </div>
                  </dl>
                </article>

                <article>
                  <h2>Invoice items</h2>
                  <ul>
                    @for (item of invoice.items; track $index) {
                      <li>
                        <span>
                          {{ item.productName }}
                          @if (item.sku) {
                            <small>{{ item.sku }}</small>
                          }
                        </span>
                        <strong
                          >{{ item.quantity }} x
                          {{
                            rupees(item.unitPriceInPaise) | currency: 'INR' : 'symbol' : '1.0-0'
                          }}</strong
                        >
                      </li>
                    }
                  </ul>
                </article>
              } @else {
                <article class="empty-detail">
                  <mat-icon>touch_app</mat-icon>
                  <h2>Select an invoice</h2>
                  <p>Click any invoice row to inspect customer, totals, GST, and item lines.</p>
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
      .invoices-page {
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
        grid-template-columns: minmax(260px, 1fr) minmax(240px, 0.8fr) minmax(190px, 0.5fr) auto;
        gap: 14px;
        align-items: center;
        padding: 18px;
      }
      .create-panel h2 {
        margin-bottom: 6px;
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
        min-width: 920px;
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
      td small,
      li small {
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
      .detail-panel {
        display: grid;
        gap: 16px;
        position: sticky;
        top: 92px;
      }
      dl {
        display: grid;
        gap: 12px;
        margin: 18px 0 0;
      }
      dl div,
      li {
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
      ul {
        display: grid;
        gap: 12px;
        padding: 0;
        margin: 18px 0 0;
        list-style: none;
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
        .create-panel,
        .filters-panel,
        .content-grid {
          grid-template-columns: 1fr;
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
export class InvoicesPageComponent {
  private readonly invoices = inject(InvoiceApiService);
  private readonly orders = inject(OrderApiService);
  private readonly masterData = inject(MasterDataApiService);
  private readonly refreshTrigger = new BehaviorSubject<void>(undefined);

  readonly selectedInvoice = signal<InvoiceDto | null>(null);
  readonly searchText = signal('');
  readonly error = signal<string | null>(null);
  readonly saving = signal(false);
  selectedOrderId = '';
  invoiceType: InvoiceType = 'Tax invoice';
  statusFilter: InvoiceStatusFilter = 'All';
  readonly statusOptions: InvoiceStatusFilter[] = ['All', 'Draft', 'Finalised', 'Cancelled'];
  readonly state$ = this.refreshTrigger.pipe(
    switchMap(() =>
      forkJoin({
        invoices: this.invoices.listInvoices(),
        orders: this.orders.listOrders(),
        masterData: this.masterData.listMasterData({
          type: 'Finance',
          status: 'active',
          sort: 'sort_order',
          page: 1,
          pageSize: 100,
        }),
      }).pipe(
        map(({ invoices, orders, masterData }): InvoicesState => {
          if (!this.selectedInvoice() && invoices[0]) {
            this.selectedInvoice.set(invoices[0]);
          }
          return {
            status: 'ready',
            invoices,
            orders,
            invoiceTypes: masterValues(masterData.items, 'Invoice Type'),
          };
        }),
        startWith({ status: 'loading' } as InvoicesState),
        catchError(() =>
          of({
            status: 'error',
            message: 'Check the API server and MongoDB connection, then refresh invoices.',
          } as InvoicesState),
        ),
      ),
    ),
  );

  createInvoice(): void {
    if (!this.selectedOrderId) {
      this.error.set('Select an order first.');
      return;
    }

    this.error.set(null);
    this.saving.set(true);
    this.invoices
      .createInvoice({ orderId: this.selectedOrderId, type: this.invoiceType })
      .subscribe({
        next: (invoice) => {
          this.saving.set(false);
          this.selectedInvoice.set(invoice);
          this.selectedOrderId = '';
          this.refreshTrigger.next();
        },
        error: () => {
          this.saving.set(false);
          this.error.set('Invoice could not be created. It may already exist for this order/type.');
        },
      });
  }

  filteredInvoices(invoices: readonly InvoiceDto[]): InvoiceDto[] {
    const search = this.searchText().trim().toLowerCase();
    return invoices.filter((invoice) => {
      const matchesStatus = this.statusFilter === 'All' || invoice.status === this.statusFilter;
      const searchable = [
        invoice.invoiceNumber,
        invoice.orderNumber,
        invoice.customer.name,
        invoice.customer.mobile,
        invoice.type,
      ]
        .join(' ')
        .toLowerCase();
      return matchesStatus && (!search || searchable.includes(search));
    });
  }

  unInvoicedOrders(orders: readonly OrderDto[], invoices: readonly InvoiceDto[]): OrderDto[] {
    const invoicedOrderIds = new Set(
      invoices
        .filter((invoice) => invoice.type === this.invoiceType)
        .map((invoice) => invoice.orderId),
    );
    return orders.filter((order) => !invoicedOrderIds.has(order.id));
  }

  invoiceValue(invoices: readonly InvoiceDto[]): number {
    return this.rupees(invoices.reduce((sum, invoice) => sum + invoice.grandTotalInPaise, 0));
  }

  invoiceDue(invoices: readonly InvoiceDto[]): number {
    return this.rupees(invoices.reduce((sum, invoice) => sum + invoice.dueAmountInPaise, 0));
  }

  statusCount(invoices: readonly InvoiceDto[], status: InvoiceStatus): number {
    return invoices.filter((invoice) => invoice.status === status).length;
  }

  rupees(valueInPaise: number): number {
    return valueInPaise / 100;
  }
}
