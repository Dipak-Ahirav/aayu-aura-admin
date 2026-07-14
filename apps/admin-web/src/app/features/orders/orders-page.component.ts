import { AsyncPipe, CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import type { OrderDto, OrderFulfilmentStatus, OrderPaymentStatus } from '@aayu-aura/shared-types';
import { BehaviorSubject, catchError, map, of, startWith, switchMap } from 'rxjs';
import { OrderApiService } from './order-api.service';

type OrdersState =
  | { status: 'loading' }
  | { status: 'ready'; orders: OrderDto[] }
  | { status: 'error'; message: string };

type StatusFilter = 'All' | OrderFulfilmentStatus;
type PaymentFilter = 'All' | OrderPaymentStatus;

@Component({
  selector: 'aa-orders-page',
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
    <section class="orders-page">
      <div class="hero">
        <div>
          <p class="breadcrumb">Home / Orders</p>
          <h1 class="page-title">Orders</h1>
          <p class="muted">
            Live order workspace connected to MongoDB. Create manual orders, review payment status,
            and inspect order totals and customer details.
          </p>
        </div>
        <div class="hero-actions">
          <a mat-flat-button color="primary" routerLink="/orders/new">
            <mat-icon>add</mat-icon>
            New order
          </a>
          <button mat-stroked-button type="button" (click)="refresh()">
            <mat-icon>refresh</mat-icon>
            Refresh
          </button>
        </div>
      </div>

      @if (state$ | async; as state) {
        @if (state.status === 'loading') {
          <section class="state-panel" aria-live="polite">
            <mat-icon>hourglass_empty</mat-icon>
            <h2>Loading orders</h2>
            <p>Reading order records from MongoDB.</p>
          </section>
        } @else if (state.status === 'error') {
          <section class="state-panel error" role="alert">
            <mat-icon>error</mat-icon>
            <h2>Orders unavailable</h2>
            <p>{{ state.message }}</p>
          </section>
        } @else {
          <section class="metrics" aria-label="Order summary">
            <article class="maroon">
              <span>Total orders</span><strong>{{ state.orders.length }}</strong>
            </article>
            <article class="plum">
              <span>Total value</span
              ><strong>{{
                totalValue(state.orders) | currency: 'INR' : 'symbol' : '1.0-0'
              }}</strong>
            </article>
            <article class="gold">
              <span>Outstanding</span
              ><strong>{{ totalDue(state.orders) | currency: 'INR' : 'symbol' : '1.0-0' }}</strong>
            </article>
            <article class="green">
              <span>Paid orders</span><strong>{{ paidOrders(state.orders) }}</strong>
            </article>
          </section>

          <section class="filters-panel">
            <mat-form-field appearance="outline">
              <mat-label>Search order, customer, mobile, SKU</mat-label>
              <input
                matInput
                [ngModel]="searchText()"
                (ngModelChange)="searchText.set($event)"
                name="searchText"
              />
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Fulfilment</mat-label>
              <mat-select [(ngModel)]="statusFilter" name="statusFilter">
                @for (status of statusOptions; track status) {
                  <mat-option [value]="status">{{ status }}</mat-option>
                }
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Payment</mat-label>
              <mat-select [(ngModel)]="paymentFilter" name="paymentFilter">
                @for (status of paymentOptions; track status) {
                  <mat-option [value]="status">{{ status }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
          </section>

          <div class="tabs" aria-label="Order status shortcuts">
            @for (tab of statusOptions; track tab) {
              <button
                type="button"
                [class.selected]="statusFilter === tab"
                (click)="statusFilter = tab"
              >
                {{ tab }}
                <span>{{ tabCount(state.orders, tab) }}</span>
              </button>
            }
          </div>

          <section class="content-grid">
            <article class="table-panel">
              <div class="panel-heading">
                <h2>Order list</h2>
                <p>{{ filteredOrders(state.orders).length }} matching orders</p>
              </div>

              @if (filteredOrders(state.orders).length) {
                <div class="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Order</th>
                        <th>Customer</th>
                        <th>Source</th>
                        <th>Total</th>
                        <th>Due</th>
                        <th>Payment</th>
                        <th>Fulfilment</th>
                        <th>Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (order of filteredOrders(state.orders); track order.id) {
                        <tr
                          [class.selected]="selectedOrder()?.id === order.id"
                          (click)="selectedOrder.set(order)"
                          tabindex="0"
                        >
                          <td>
                            <strong>{{ order.orderNumber }}</strong>
                          </td>
                          <td>
                            <span>{{ order.customer.name }}</span>
                            <small>{{ order.customer.mobile }}</small>
                          </td>
                          <td>{{ order.source }}</td>
                          <td>
                            {{ rupees(order.totalInPaise) | currency: 'INR' : 'symbol' : '1.0-0' }}
                          </td>
                          <td>
                            {{
                              rupees(order.dueAmountInPaise) | currency: 'INR' : 'symbol' : '1.0-0'
                            }}
                          </td>
                          <td>
                            <span class="status">{{ order.paymentStatus }}</span>
                          </td>
                          <td>
                            <span class="status">{{ order.fulfilmentStatus }}</span>
                          </td>
                          <td>{{ order.createdAt | date: 'mediumDate' }}</td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              } @else {
                <div class="empty-state">
                  <mat-icon>receipt_long</mat-icon>
                  <h2>No orders match the current filters</h2>
                  <p>Create a new order or clear filters.</p>
                </div>
              }
            </article>

            <aside class="detail-panel">
              @if (selectedOrder(); as order) {
                <article>
                  <h2>{{ order.orderNumber }}</h2>
                  <p class="muted">{{ order.customer.name }} · {{ order.customer.mobile }}</p>
                  <dl>
                    <div>
                      <dt>Payment</dt>
                      <dd>{{ order.paymentStatus }}</dd>
                    </div>
                    <div>
                      <dt>Fulfilment</dt>
                      <dd>{{ order.fulfilmentStatus }}</dd>
                    </div>
                    <div>
                      <dt>Items</dt>
                      <dd>{{ order.items.length }}</dd>
                    </div>
                    <div>
                      <dt>Total</dt>
                      <dd>
                        {{ rupees(order.totalInPaise) | currency: 'INR' : 'symbol' : '1.0-0' }}
                      </dd>
                    </div>
                    <div>
                      <dt>Due</dt>
                      <dd>
                        {{ rupees(order.dueAmountInPaise) | currency: 'INR' : 'symbol' : '1.0-0' }}
                      </dd>
                    </div>
                  </dl>
                </article>

                <article>
                  <h2>Items</h2>
                  <ul>
                    @for (item of order.items; track $index) {
                      <li>
                        <span>
                          {{ item.productName }}
                          @if (item.sku) {
                            <small>{{ item.sku }}</small>
                          }
                        </span>
                        <strong
                          >{{ item.quantity }} ×
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
                  <h2>Select an order</h2>
                  <p>Click any order row to inspect customer, totals, and item lines.</p>
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
      .orders-page {
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
      .hero-actions {
        display: flex;
        flex-wrap: wrap;
        justify-content: flex-end;
        gap: 12px;
      }
      .metrics {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 14px;
      }
      .metrics article,
      .filters-panel,
      .table-panel,
      .detail-panel article,
      .state-panel {
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
      .filters-panel {
        display: grid;
        grid-template-columns: minmax(260px, 1fr) 220px 220px;
        gap: 14px;
        padding: 16px;
      }
      .tabs {
        display: flex;
        gap: 8px;
        overflow-x: auto;
      }
      .tabs button {
        min-height: 36px;
        border: 1px solid var(--aa-border);
        background: var(--aa-surface);
        color: var(--aa-text);
        border-radius: 999px;
        padding: 0 13px;
        white-space: nowrap;
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
      @media (max-width: 1180px) {
        .metrics {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
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
export class OrdersPageComponent {
  private readonly orders = inject(OrderApiService);
  private readonly refreshTrigger = new BehaviorSubject<void>(undefined);

  readonly searchText = signal('');
  readonly selectedOrder = signal<OrderDto | null>(null);
  statusFilter: StatusFilter = 'All';
  paymentFilter: PaymentFilter = 'All';
  readonly statusOptions: StatusFilter[] = [
    'All',
    'Draft',
    'Pending',
    'Confirmed',
    'Packed',
    'Ready to ship',
    'Shipped',
    'Delivered',
    'Cancelled',
  ];
  readonly paymentOptions: PaymentFilter[] = ['All', 'Unpaid', 'Partially paid', 'Paid'];
  readonly state$ = this.refreshTrigger.pipe(
    switchMap(() =>
      this.orders.listOrders().pipe(
        map((orders): OrdersState => {
          if (!this.selectedOrder() && orders[0]) {
            this.selectedOrder.set(orders[0]);
          }
          return { status: 'ready', orders };
        }),
        startWith({ status: 'loading' } as OrdersState),
        catchError(() =>
          of({
            status: 'error',
            message: 'Check the API server and MongoDB connection, then refresh orders.',
          } as OrdersState),
        ),
      ),
    ),
  );

  refresh(): void {
    this.refreshTrigger.next();
  }

  filteredOrders(orders: readonly OrderDto[]): OrderDto[] {
    const search = this.searchText().trim().toLowerCase();
    return orders.filter((order) => {
      const matchesStatus =
        this.statusFilter === 'All' || order.fulfilmentStatus === this.statusFilter;
      const matchesPayment =
        this.paymentFilter === 'All' || order.paymentStatus === this.paymentFilter;
      const searchable = [
        order.orderNumber,
        order.customer.name,
        order.customer.mobile,
        order.source,
        ...order.items.flatMap((item) => [item.productName, item.sku ?? '']),
      ]
        .join(' ')
        .toLowerCase();
      return matchesStatus && matchesPayment && (!search || searchable.includes(search));
    });
  }

  tabCount(orders: readonly OrderDto[], status: StatusFilter): number {
    return status === 'All'
      ? orders.length
      : orders.filter((order) => order.fulfilmentStatus === status).length;
  }

  totalValue(orders: readonly OrderDto[]): number {
    return this.rupees(orders.reduce((sum, order) => sum + order.totalInPaise, 0));
  }

  totalDue(orders: readonly OrderDto[]): number {
    return this.rupees(orders.reduce((sum, order) => sum + order.dueAmountInPaise, 0));
  }

  paidOrders(orders: readonly OrderDto[]): number {
    return orders.filter((order) => order.paymentStatus === 'Paid').length;
  }

  rupees(valueInPaise: number): number {
    return valueInPaise / 100;
  }
}
