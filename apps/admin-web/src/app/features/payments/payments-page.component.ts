import { AsyncPipe, CurrencyPipe, DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import type {
  InvoiceDto,
  OrderDto,
  PaymentDirection,
  PaymentDto,
  PaymentMethod,
  PaymentStatus,
} from '@aayu-aura/shared-types';
import { BehaviorSubject, catchError, forkJoin, map, of, startWith, switchMap } from 'rxjs';
import { InvoiceApiService } from '../invoices/invoice-api.service';
import { MasterDataApiService } from '../master-data/master-data-api.service';
import { masterValues } from '../master-data/master-data-registry';
import { OrderApiService } from '../orders/order-api.service';
import { PaymentApiService } from './payment-api.service';

type PaymentsState =
  | { status: 'loading' }
  | {
      status: 'ready';
      payments: PaymentDto[];
      orders: OrderDto[];
      invoices: InvoiceDto[];
      directions: string[];
      methods: string[];
    }
  | { status: 'error'; message: string };

type StatusFilter = 'All' | PaymentStatus;

@Component({
  selector: 'aa-payments-page',
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
    <section class="payments-page">
      <div class="hero">
        <div>
          <p class="breadcrumb">Home / Payments</p>
          <h1 class="page-title">Payments</h1>
          <p class="muted">
            Record customer receipts against orders or invoices, track due balances, methods,
            references, and reconciliation status from MongoDB.
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
            <h2>Loading payments</h2>
            <p>Reading receipts, orders, and invoices from MongoDB.</p>
          </section>
        } @else if (state.status === 'error') {
          <section class="state-panel error" role="alert">
            <mat-icon>error</mat-icon>
            <h2>Payments unavailable</h2>
            <p>{{ state.message }}</p>
          </section>
        } @else {
          <section class="metrics" aria-label="Payment summary">
            <article class="maroon">
              <span>Total receipts</span><strong>{{ state.payments.length }}</strong>
            </article>
            <article class="plum">
              <span>Collected</span
              ><strong>{{
                totalCollected(state.payments) | currency: 'INR' : 'symbol' : '1.0-0'
              }}</strong>
            </article>
            <article class="gold">
              <span>Open order due</span
              ><strong>{{ orderDue(state.orders) | currency: 'INR' : 'symbol' : '1.0-0' }}</strong>
            </article>
            <article class="green">
              <span>Reconciled</span
              ><strong>{{ statusCount(state.payments, 'Reconciled') }}</strong>
            </article>
          </section>

          <section class="create-panel">
            <div>
              <h2>Record payment</h2>
              <p>Select an order, optionally allocate to one invoice, and save the receipt.</p>
            </div>

            <div class="form-grid">
              <mat-form-field appearance="outline">
                <mat-label>Direction</mat-label>
                <mat-select [(ngModel)]="direction" name="direction">
                  @for (item of state.directions; track item) {
                    <mat-option [value]="item">{{ item }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Order</mat-label>
                <mat-select
                  [(ngModel)]="selectedOrderId"
                  name="order"
                  (selectionChange)="invoiceId = ''"
                >
                  @for (order of payableOrders(state.orders); track order.id) {
                    <mat-option [value]="order.id">
                      {{ order.orderNumber }} / {{ order.customer.name }} /
                      {{ rupees(order.dueAmountInPaise) | currency: 'INR' : 'symbol' : '1.0-0' }}
                    </mat-option>
                  }
                </mat-select>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Invoice allocation</mat-label>
                <mat-select [(ngModel)]="invoiceId" name="invoice">
                  <mat-option value="">No invoice</mat-option>
                  @for (invoice of invoicesForOrder(state.invoices); track invoice.id) {
                    <mat-option [value]="invoice.id">
                      {{ invoice.invoiceNumber }} / due
                      {{ rupees(invoice.dueAmountInPaise) | currency: 'INR' : 'symbol' : '1.0-0' }}
                    </mat-option>
                  }
                </mat-select>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Amount</mat-label>
                <input matInput type="number" [(ngModel)]="amount" name="amount" />
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Method</mat-label>
                <mat-select [(ngModel)]="method" name="method">
                  @for (item of state.methods; track item) {
                    <mat-option [value]="item">{{ item }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Payment date</mat-label>
                <input matInput type="date" [(ngModel)]="paymentDate" name="paymentDate" />
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Reference number</mat-label>
                <input matInput [(ngModel)]="referenceNumber" name="reference" />
              </mat-form-field>

              <mat-form-field appearance="outline" class="wide">
                <mat-label>Notes</mat-label>
                <input matInput [(ngModel)]="notes" name="notes" />
              </mat-form-field>
            </div>

            <div class="due-line">
              Selected due:
              <strong>{{
                selectedDue(state.orders, state.invoices) | currency: 'INR' : 'symbol' : '1.0-0'
              }}</strong>
            </div>

            <button
              mat-flat-button
              color="primary"
              type="button"
              (click)="createPayment()"
              [disabled]="saving()"
            >
              <mat-icon>payments</mat-icon>
              {{ saving() ? 'Saving...' : 'Record payment' }}
            </button>
          </section>

          @if (error()) {
            <p class="error" role="alert">{{ error() }}</p>
          }

          <section class="filters-panel">
            <mat-form-field appearance="outline">
              <mat-label>Search receipt, order, invoice, customer, reference</mat-label>
              <input
                matInput
                [ngModel]="searchText()"
                (ngModelChange)="searchText.set($event)"
                name="search"
              />
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Status</mat-label>
              <mat-select [(ngModel)]="statusFilter" name="status">
                @for (status of statusOptions; track status) {
                  <mat-option [value]="status">{{ status }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
          </section>

          <section class="content-grid">
            <article class="table-panel">
              <div class="panel-heading">
                <h2>Payment list</h2>
                <p>{{ filteredPayments(state.payments).length }} matching payments</p>
              </div>

              @if (filteredPayments(state.payments).length) {
                <div class="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Receipt</th>
                        <th>Customer</th>
                        <th>Order</th>
                        <th>Invoice</th>
                        <th>Amount</th>
                        <th>Method</th>
                        <th>Status</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (payment of filteredPayments(state.payments); track payment.id) {
                        <tr
                          [class.selected]="selectedPayment()?.id === payment.id"
                          (click)="selectedPayment.set(payment)"
                          tabindex="0"
                        >
                          <td>
                            <strong>{{ payment.paymentNumber }}</strong>
                          </td>
                          <td>
                            <span>{{ payment.customer?.name || 'Unassigned' }}</span>
                            <small>{{ payment.customer?.mobile || '' }}</small>
                          </td>
                          <td>{{ payment.orderNumber || '-' }}</td>
                          <td>{{ payment.invoiceNumber || '-' }}</td>
                          <td>
                            {{
                              rupees(payment.amountInPaise) | currency: 'INR' : 'symbol' : '1.0-0'
                            }}
                          </td>
                          <td>{{ payment.method }}</td>
                          <td>
                            <span class="status">{{ payment.status }}</span>
                          </td>
                          <td>{{ payment.paymentDate | date: 'mediumDate' }}</td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              } @else {
                <div class="empty-state">
                  <mat-icon>payments</mat-icon>
                  <h2>No payments match the current filters</h2>
                  <p>Record a payment or clear filters.</p>
                </div>
              }
            </article>

            <aside class="detail-panel">
              @if (selectedPayment(); as payment) {
                <article>
                  <h2>{{ payment.paymentNumber }}</h2>
                  <p class="muted">{{ payment.customer?.name || 'Customer receipt' }}</p>
                  <dl>
                    <div>
                      <dt>Direction</dt>
                      <dd>{{ payment.direction }}</dd>
                    </div>
                    <div>
                      <dt>Status</dt>
                      <dd>{{ payment.status }}</dd>
                    </div>
                    <div>
                      <dt>Method</dt>
                      <dd>{{ payment.method }}</dd>
                    </div>
                    <div>
                      <dt>Amount</dt>
                      <dd>
                        {{ rupees(payment.amountInPaise) | currency: 'INR' : 'symbol' : '1.0-0' }}
                      </dd>
                    </div>
                    <div>
                      <dt>Order</dt>
                      <dd>{{ payment.orderNumber || '-' }}</dd>
                    </div>
                    <div>
                      <dt>Invoice</dt>
                      <dd>{{ payment.invoiceNumber || '-' }}</dd>
                    </div>
                    <div>
                      <dt>Reference</dt>
                      <dd>{{ payment.referenceNumber || '-' }}</dd>
                    </div>
                  </dl>
                  @if (payment.notes) {
                    <p>{{ payment.notes }}</p>
                  }
                </article>
              } @else {
                <article class="empty-detail">
                  <mat-icon>touch_app</mat-icon>
                  <h2>Select a payment</h2>
                  <p>Click any payment row to inspect allocation, method, and reference.</p>
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
      .payments-page {
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
      .metrics {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 12px;
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
      .create-panel {
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
      .due-line {
        color: var(--aa-muted);
        font-size: 0.9rem;
      }
      .filters-panel {
        display: grid;
        grid-template-columns: minmax(260px, 1fr) 200px;
        gap: 12px;
        padding: 14px;
      }
      .content-grid {
        display: grid;
        grid-template-columns: minmax(0, 1.35fr) minmax(300px, 0.65fr);
        gap: 14px;
        align-items: start;
      }
      .table-panel,
      .detail-panel article {
        padding: 18px;
      }
      .panel-heading {
        display: flex;
        justify-content: space-between;
        gap: 14px;
        align-items: center;
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
      .detail-panel {
        display: grid;
        gap: 14px;
        position: sticky;
        top: 78px;
      }
      dl {
        display: grid;
        gap: 10px;
        margin: 16px 0 0;
      }
      dl div {
        display: flex;
        justify-content: space-between;
        gap: 14px;
        padding-bottom: 10px;
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
      .state-panel mat-icon,
      .empty-detail mat-icon {
        width: 42px;
        height: 42px;
        font-size: 42px;
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
export class PaymentsPageComponent {
  private readonly payments = inject(PaymentApiService);
  private readonly orders = inject(OrderApiService);
  private readonly invoices = inject(InvoiceApiService);
  private readonly masterData = inject(MasterDataApiService);
  private readonly refreshTrigger = new BehaviorSubject<void>(undefined);

  readonly selectedPayment = signal<PaymentDto | null>(null);
  readonly searchText = signal('');
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  direction: PaymentDirection = 'Customer receipt';
  selectedOrderId = '';
  invoiceId = '';
  amount = 0;
  method: PaymentMethod = 'UPI';
  paymentDate = new Date().toISOString().slice(0, 10);
  referenceNumber = '';
  notes = '';
  statusFilter: StatusFilter = 'All';
  readonly statusOptions: StatusFilter[] = ['All', 'Recorded', 'Reconciled', 'Cancelled'];
  readonly state$ = this.refreshTrigger.pipe(
    switchMap(() =>
      forkJoin({
        payments: this.payments.listPayments(),
        orders: this.orders.listOrders(),
        invoices: this.invoices.listInvoices(),
        masterData: this.masterData.listMasterData({
          type: 'Finance',
          status: 'active',
          sort: 'sort_order',
          page: 1,
          pageSize: 100,
        }),
      }).pipe(
        map(({ payments, orders, invoices, masterData }): PaymentsState => {
          if (!this.selectedPayment() && payments[0]) {
            this.selectedPayment.set(payments[0]);
          }
          return {
            status: 'ready',
            payments,
            orders,
            invoices,
            directions: masterValues(masterData.items, 'Payment Direction'),
            methods: masterValues(masterData.items, 'Payment Method'),
          };
        }),
        startWith({ status: 'loading' } as PaymentsState),
        catchError(() =>
          of({
            status: 'error',
            message: 'Check the API server and MongoDB connection, then refresh payments.',
          } as PaymentsState),
        ),
      ),
    ),
  );

  refresh(): void {
    this.refreshTrigger.next();
  }

  createPayment(): void {
    if (!this.selectedOrderId && !this.invoiceId) {
      this.error.set('Select an order or invoice.');
      return;
    }
    if (this.amount <= 0) {
      this.error.set('Enter a payment amount greater than zero.');
      return;
    }

    this.error.set(null);
    this.saving.set(true);
    this.payments
      .createPayment({
        direction: this.direction,
        orderId: this.selectedOrderId || undefined,
        invoiceId: this.invoiceId || undefined,
        amountInPaise: this.paise(this.amount),
        method: this.method,
        paymentDate: new Date(this.paymentDate).toISOString(),
        referenceNumber: this.referenceNumber,
        notes: this.notes,
      })
      .subscribe({
        next: (payment) => {
          this.saving.set(false);
          this.selectedPayment.set(payment);
          this.resetForm();
          this.refresh();
        },
        error: () => {
          this.saving.set(false);
          this.error.set('Payment could not be recorded. Check selected due amount and try again.');
        },
      });
  }

  payableOrders(orders: readonly OrderDto[]): OrderDto[] {
    return orders.filter((order) => order.dueAmountInPaise > 0);
  }

  invoicesForOrder(invoices: readonly InvoiceDto[]): InvoiceDto[] {
    return invoices.filter(
      (invoice) => invoice.orderId === this.selectedOrderId && invoice.dueAmountInPaise > 0,
    );
  }

  selectedDue(orders: readonly OrderDto[], invoices: readonly InvoiceDto[]): number {
    const invoice = invoices.find((item) => item.id === this.invoiceId);
    if (invoice) {
      return this.rupees(invoice.dueAmountInPaise);
    }
    const order = orders.find((item) => item.id === this.selectedOrderId);
    return this.rupees(order?.dueAmountInPaise ?? 0);
  }

  filteredPayments(payments: readonly PaymentDto[]): PaymentDto[] {
    const search = this.searchText().trim().toLowerCase();
    return payments.filter((payment) => {
      const matchesStatus = this.statusFilter === 'All' || payment.status === this.statusFilter;
      const searchable = [
        payment.paymentNumber,
        payment.orderNumber ?? '',
        payment.invoiceNumber ?? '',
        payment.customer?.name ?? '',
        payment.customer?.mobile ?? '',
        payment.referenceNumber ?? '',
        payment.method,
      ]
        .join(' ')
        .toLowerCase();
      return matchesStatus && (!search || searchable.includes(search));
    });
  }

  totalCollected(payments: readonly PaymentDto[]): number {
    return this.rupees(
      payments
        .filter(
          (payment) => payment.status !== 'Cancelled' && payment.direction === 'Customer receipt',
        )
        .reduce((sum, payment) => sum + payment.amountInPaise, 0),
    );
  }

  orderDue(orders: readonly OrderDto[]): number {
    return this.rupees(orders.reduce((sum, order) => sum + order.dueAmountInPaise, 0));
  }

  statusCount(payments: readonly PaymentDto[], status: PaymentStatus): number {
    return payments.filter((payment) => payment.status === status).length;
  }

  rupees(valueInPaise: number): number {
    return valueInPaise / 100;
  }

  private resetForm(): void {
    this.selectedOrderId = '';
    this.invoiceId = '';
    this.amount = 0;
    this.referenceNumber = '';
    this.notes = '';
    this.paymentDate = new Date().toISOString().slice(0, 10);
  }

  private paise(value: number): number {
    return Math.round((Number(value) || 0) * 100);
  }
}
