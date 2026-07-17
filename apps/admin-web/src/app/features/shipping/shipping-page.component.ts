import { AsyncPipe, DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import type {
  CreateShipmentDto,
  OrderDto,
  ShipmentDto,
  ShipmentStatus,
  ShippingListDto,
} from '@aayu-aura/shared-types';
import { BehaviorSubject, catchError, forkJoin, map, of, startWith, switchMap } from 'rxjs';
import { MasterDataApiService } from '../master-data/master-data-api.service';
import { masterValues } from '../master-data/master-data-registry';
import { ShippingApiService } from './shipping-api.service';

type ShippingState =
  | { status: 'loading' }
  | { status: 'ready'; data: ShippingListDto; couriers: string[] }
  | { status: 'error'; message: string };

type ShipmentStatusFilter = 'all' | ShipmentStatus;
type ShippingSegment = 'ready' | 'shipped' | 'delivered' | 'delayed';

@Component({
  selector: 'aa-shipping-page',
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
          <h1>Loading shipping</h1>
          <p>Reading shipments and ready orders from MongoDB.</p>
        </section>
      } @else if (state.status === 'error') {
        <section class="state-panel error" role="alert">
          <mat-icon>error</mat-icon>
          <h1>Shipping unavailable</h1>
          <p>{{ state.message }}</p>
        </section>
      } @else {
        <section class="shipping-page">
          <div class="hero">
            <div>
              <p class="breadcrumb">Home / Shipping</p>
              <h1 class="page-title">Shipping</h1>
              <p class="muted">
                Manage courier providers, tracking, dispatch dates, delivery status, packing slips,
                and shipment history.
              </p>
            </div>
            <div class="hero-actions">
              <button mat-flat-button color="primary" type="button" (click)="showForm.set(true)">
                <mat-icon>local_shipping</mat-icon>
                Add shipment
              </button>
              <button
                class="secondary"
                mat-flat-button
                color="primary"
                type="button"
                (click)="downloadSelectedPackingSlip()"
                [disabled]="!selectedShipment() && !selectedReadyOrder()"
              >
                <mat-icon>print</mat-icon>
                Packing slip
              </button>
            </div>
          </div>

          <section class="metrics" aria-label="Shipping summary">
            <article class="maroon">
              <span>Ready to ship</span><strong>{{ state.data.summary.readyToShip }}</strong>
            </article>
            <article class="plum">
              <span>In transit</span><strong>{{ state.data.summary.inTransit }}</strong>
            </article>
            <article class="gold">
              <span>Delayed</span><strong>{{ state.data.summary.delayed }}</strong>
            </article>
            <article class="green">
              <span>Delivered week</span><strong>{{ state.data.summary.deliveredWeek }}</strong>
            </article>
          </section>

          @if (showForm()) {
            <section class="shipment-form">
              <div>
                <h2>{{ editingShipmentId() ? 'Update shipment' : 'Add shipment' }}</h2>
                <p>
                  Courier, tracking, dispatch dates, status, and package details persist to MongoDB.
                </p>
              </div>
              <div class="form-grid">
                <mat-form-field appearance="outline">
                  <mat-label>Order</mat-label>
                  <mat-select
                    [(ngModel)]="form.orderId"
                    name="shipmentOrder"
                    [disabled]="isEditing()"
                  >
                    @for (order of state.data.readyOrders; track order.id) {
                      <mat-option [value]="order.id"
                        >{{ order.orderNumber }} / {{ order.customer.name }}</mat-option
                      >
                    }
                  </mat-select>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Courier</mat-label>
                  <mat-select [(ngModel)]="form.courier" name="shipmentCourier">
                    @for (courier of state.couriers; track courier) {
                      <mat-option [value]="courier">{{ courier }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Tracking</mat-label>
                  <input matInput [(ngModel)]="form.trackingNumber" name="trackingNumber" />
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Status</mat-label>
                  <mat-select [(ngModel)]="form.status" name="shipmentStatus">
                    @for (status of statusOptions; track status) {
                      <mat-option [value]="status">{{ status }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Dispatch date</mat-label>
                  <input matInput type="date" [(ngModel)]="dispatchDate" name="dispatchDate" />
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Expected delivery</mat-label>
                  <input
                    matInput
                    type="date"
                    [(ngModel)]="expectedDeliveryDate"
                    name="expectedDeliveryDate"
                  />
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Delivered date</mat-label>
                  <input matInput type="date" [(ngModel)]="deliveredAt" name="deliveredAt" />
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Package count</mat-label>
                  <input
                    matInput
                    type="number"
                    [(ngModel)]="form.packageCount"
                    name="packageCount"
                  />
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Weight grams</mat-label>
                  <input
                    matInput
                    type="number"
                    [(ngModel)]="form.packageWeightGrams"
                    name="packageWeight"
                  />
                </mat-form-field>
                <mat-form-field appearance="outline" class="wide">
                  <mat-label>Notes</mat-label>
                  <input matInput [(ngModel)]="form.notes" name="shipmentNotes" />
                </mat-form-field>
              </div>
              <div class="form-actions">
                <button
                  mat-flat-button
                  color="primary"
                  type="button"
                  (click)="saveShipment()"
                  [disabled]="saving()"
                >
                  <mat-icon>{{ editingShipmentId() ? 'save' : 'local_shipping' }}</mat-icon>
                  {{
                    saving()
                      ? 'Saving...'
                      : editingShipmentId()
                        ? 'Save shipment'
                        : 'Create shipment'
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

          <div class="tabs" aria-label="Shipping tabs">
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
                    Search, filters, sorting, pagination, edits, and packing slips are connected to
                    the API.
                  </p>
                </div>
                <div class="filter-strip" aria-label="Shipping filters">
                  <mat-form-field appearance="outline">
                    <mat-label>Search</mat-label>
                    <input
                      matInput
                      [ngModel]="searchText()"
                      (ngModelChange)="onSearchChange($event)"
                      name="shippingSearch"
                    />
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Courier</mat-label>
                    <mat-select
                      [(ngModel)]="courierFilter"
                      name="courierFilter"
                      (selectionChange)="applyFilters()"
                    >
                      <mat-option value="all">All</mat-option>
                      @for (courier of state.couriers; track courier) {
                        <mat-option [value]="courier">{{ courier }}</mat-option>
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
                      <mat-option value="expected_asc">Expected early</mat-option>
                      <mat-option value="expected_desc">Expected late</mat-option>
                    </mat-select>
                  </mat-form-field>
                </div>
              </div>

              @if (
                state.data.items.length || (segment === 'ready' && state.data.readyOrders.length)
              ) {
                <div class="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Order no</th>
                        <th>Customer</th>
                        <th>Courier</th>
                        <th>Tracking</th>
                        <th>Status</th>
                        <th>Expected</th>
                        <th>Packages</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (shipment of state.data.items; track shipment.id) {
                        <tr
                          [class.selected]="selectedShipment()?.id === shipment.id"
                          (click)="selectedShipment.set(shipment)"
                          tabindex="0"
                        >
                          <td>
                            <strong>{{ shipment.orderNumber }}</strong>
                            <small>{{ shipment.shipmentNumber }}</small>
                          </td>
                          <td>
                            <span>{{ shipment.customer.name }}</span>
                            <small>{{ shipment.customer.mobile }}</small>
                          </td>
                          <td>{{ shipment.courier }}</td>
                          <td>{{ shipment.trackingNumber || '-' }}</td>
                          <td>
                            <span
                              class="status"
                              [class.due]="shipment.status === 'Delayed'"
                              [class.inactive]="shipment.status === 'Cancelled'"
                            >
                              {{ shipment.status }}
                            </span>
                          </td>
                          <td>{{ shipment.expectedDeliveryDate | date: 'mediumDate' }}</td>
                          <td>{{ shipment.packageCount }} / {{ shipment.packageWeightGrams }} g</td>
                          <td class="row-actions">
                            <button
                              mat-icon-button
                              type="button"
                              aria-label="Edit shipment"
                              (click)="editShipment(shipment); $event.stopPropagation()"
                            >
                              <mat-icon>edit</mat-icon>
                            </button>
                            <button
                              mat-icon-button
                              type="button"
                              aria-label="Download packing slip"
                              (click)="downloadPackingSlip(shipment); $event.stopPropagation()"
                            >
                              <mat-icon>print</mat-icon>
                            </button>
                            <button
                              mat-icon-button
                              type="button"
                              aria-label="Cancel shipment"
                              (click)="cancelShipment(shipment); $event.stopPropagation()"
                              [disabled]="shipment.status === 'Cancelled'"
                            >
                              <mat-icon>cancel</mat-icon>
                            </button>
                          </td>
                        </tr>
                      }
                      @if (segment === 'ready') {
                        @for (order of state.data.readyOrders; track order.id) {
                          <tr
                            [class.selected]="selectedReadyOrder()?.id === order.id"
                            (click)="selectReadyOrder(order)"
                            tabindex="0"
                          >
                            <td>
                              <strong>{{ order.orderNumber }}</strong>
                              <small>Ready order</small>
                            </td>
                            <td>
                              <span>{{ order.customer.name }}</span>
                              <small>{{ order.customer.mobile }}</small>
                            </td>
                            <td>-</td>
                            <td>-</td>
                            <td><span class="status">Ready</span></td>
                            <td>-</td>
                            <td>{{ order.items.length }} items</td>
                            <td class="row-actions">
                              <button
                                mat-icon-button
                                type="button"
                                aria-label="Download packing slip"
                                (click)="downloadOrderPackingSlip(order); $event.stopPropagation()"
                              >
                                <mat-icon>print</mat-icon>
                              </button>
                              <button
                                mat-icon-button
                                type="button"
                                aria-label="Create shipment"
                                (click)="startShipment(order); $event.stopPropagation()"
                              >
                                <mat-icon>local_shipping</mat-icon>
                              </button>
                            </td>
                          </tr>
                        }
                      }
                    </tbody>
                  </table>
                </div>
              } @else {
                <div class="empty-state">
                  <mat-icon>local_shipping</mat-icon>
                  <h2>No shipments found</h2>
                  <p>Create a shipment or adjust search and filters.</p>
                </div>
              }

              <div class="pagination">
                <span
                  >Page {{ state.data.page }} of {{ totalPages(state.data) }} /
                  {{ displayTotal(state.data) }} records</span
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
      .shipping-page {
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
      .shipment-form,
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
      .shipment-form {
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
export class ShippingPageComponent {
  private readonly shipping = inject(ShippingApiService);
  private readonly masterData = inject(MasterDataApiService);
  private readonly refreshTrigger = new BehaviorSubject<void>(undefined);

  readonly selectedShipment = signal<ShipmentDto | null>(null);
  readonly selectedReadyOrder = signal<OrderDto | null>(null);
  readonly selectedTab = signal('Ready');
  readonly searchText = signal('');
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly message = signal<string | null>(null);
  readonly showForm = signal(false);
  readonly editingShipmentId = signal<string | null>(null);
  readonly statusOptions: ShipmentStatus[] = [
    'Ready',
    'Shipped',
    'In transit',
    'Delivered',
    'Delayed',
    'Cancelled',
  ];
  segment: ShippingSegment = 'ready';
  statusFilter: ShipmentStatusFilter = 'all';
  courierFilter = 'all';
  sort = 'newest';
  page = 1;
  pageSize = 10;
  dispatchDate = '';
  expectedDeliveryDate = '';
  deliveredAt = '';
  form: CreateShipmentDto = this.emptyForm();

  readonly state$ = this.refreshTrigger.pipe(
    switchMap(() =>
      forkJoin({
        data: this.shipping.listShipments({
          search: this.searchText(),
          status: this.statusFilter,
          courier: this.courierFilter,
          segment: this.segment,
          sort: this.sort,
          page: this.page,
          pageSize: this.pageSize,
        }),
        masterData: this.masterData.listMasterData({
          type: 'Order setup',
          status: 'active',
          pageSize: 100,
        }),
      }).pipe(
        map(({ data, masterData }): ShippingState => {
          if (!this.selectedShipment() && data.items[0]) this.selectedShipment.set(data.items[0]);
          if (!this.selectedReadyOrder() && !data.items[0] && data.readyOrders[0]) {
            this.selectedReadyOrder.set(data.readyOrders[0]);
          }
          return {
            status: 'ready',
            data,
            couriers: masterValues(masterData.items, 'Courier Provider', [
              'Delhivery',
              'Bluedart',
              'DTDC',
              'India Post',
              'Other',
            ]),
          };
        }),
        startWith({ status: 'loading' } as ShippingState),
        catchError(() =>
          of({
            status: 'error',
            message: 'Check the API server and MongoDB connection, then refresh shipping.',
          } as ShippingState),
        ),
      ),
    ),
  );

  saveShipment(): void {
    if (!this.editingShipmentId() && !this.form.orderId) {
      this.error.set('Order is required.');
      return;
    }
    if (!this.form.courier.trim()) {
      this.error.set('Courier is required.');
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    this.message.set(null);
    const request = this.editingShipmentId()
      ? this.shipping.updateShipment(this.editingShipmentId() ?? '', this.formPayload())
      : this.shipping.createShipment(this.formPayload());
    request.subscribe({
      next: (shipment) => {
        this.saving.set(false);
        this.selectedShipment.set(shipment);
        this.message.set(this.editingShipmentId() ? 'Shipment updated.' : 'Shipment created.');
        this.resetForm();
        this.refresh();
      },
      error: () => {
        this.saving.set(false);
        this.error.set(
          'Shipment could not be saved. Check required fields and duplicate order shipment.',
        );
      },
    });
  }

  editShipment(shipment: ShipmentDto): void {
    this.selectedReadyOrder.set(null);
    this.selectedShipment.set(shipment);
    this.showForm.set(true);
    this.editingShipmentId.set(shipment.id);
    this.dispatchDate = this.dateInput(shipment.dispatchDate);
    this.expectedDeliveryDate = this.dateInput(shipment.expectedDeliveryDate);
    this.deliveredAt = this.dateInput(shipment.deliveredAt);
    this.form = {
      orderId: shipment.orderId,
      courier: shipment.courier,
      trackingNumber: shipment.trackingNumber ?? '',
      status: shipment.status,
      packageWeightGrams: shipment.packageWeightGrams,
      packageCount: shipment.packageCount,
      notes: shipment.notes ?? '',
    };
  }

  startShipment(order: OrderDto): void {
    this.selectReadyOrder(order);
    this.showForm.set(true);
    this.editingShipmentId.set(null);
    this.dispatchDate = '';
    this.expectedDeliveryDate = '';
    this.deliveredAt = '';
    this.form = {
      ...this.emptyForm(),
      orderId: order.id,
    };
  }

  cancelShipment(shipment: ShipmentDto): void {
    this.shipping.cancelShipment(shipment.id).subscribe({
      next: (updated) => {
        this.selectedShipment.set(updated);
        this.message.set('Shipment cancelled.');
        this.refresh();
      },
      error: () => this.error.set('Shipment could not be cancelled.'),
    });
  }

  downloadPackingSlip(shipment: ShipmentDto): void {
    this.shipping.downloadPackingSlip(shipment.id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${shipment.shipmentNumber.replace(/[^a-zA-Z0-9-]+/g, '-')}-packing-slip.pdf`;
        link.click();
        URL.revokeObjectURL(url);
      },
      error: () => this.error.set('Packing slip could not be downloaded.'),
    });
  }

  downloadOrderPackingSlip(order: OrderDto): void {
    this.shipping.downloadOrderPackingSlip(order.id).subscribe({
      next: (blob) =>
        this.saveBlob(
          blob,
          `${order.orderNumber.replace(/[^a-zA-Z0-9-]+/g, '-')}-packing-slip.pdf`,
        ),
      error: () => this.error.set('Packing slip could not be downloaded.'),
    });
  }

  downloadSelectedPackingSlip(): void {
    const shipment = this.selectedShipment();
    if (shipment) {
      this.downloadPackingSlip(shipment);
      return;
    }
    const order = this.selectedReadyOrder();
    if (order) this.downloadOrderPackingSlip(order);
  }

  selectReadyOrder(order: OrderDto): void {
    this.selectedReadyOrder.set(order);
    this.selectedShipment.set(null);
  }

  resetForm(): void {
    this.editingShipmentId.set(null);
    this.dispatchDate = '';
    this.expectedDeliveryDate = '';
    this.deliveredAt = '';
    this.form = this.emptyForm();
  }

  isEditing(): boolean {
    return this.editingShipmentId() !== null;
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
    this.statusFilter = 'all';
    this.segment = 'ready';
    if (tab === 'Shipped') this.segment = 'shipped';
    if (tab === 'Delivered') this.segment = 'delivered';
    if (tab === 'Delayed') this.segment = 'delayed';
    this.applyFilters();
  }

  previousPage(): void {
    this.page = Math.max(this.page - 1, 1);
    this.refresh();
  }

  nextPage(data: ShippingListDto): void {
    this.page = Math.min(this.page + 1, this.totalPages(data));
    this.refresh();
  }

  tabs(data: ShippingListDto) {
    return [
      { label: 'Ready', count: data.summary.readyToShip },
      { label: 'Shipped', count: data.summary.shipped },
      { label: 'Delivered', count: data.summary.delivered },
      { label: 'Delayed', count: data.summary.delayed },
    ];
  }

  totalPages(data: ShippingListDto): number {
    return Math.max(Math.ceil(this.displayTotal(data) / data.pageSize), 1);
  }

  displayTotal(data: ShippingListDto): number {
    return data.total + (this.segment === 'ready' ? data.readyOrders.length : 0);
  }

  private refresh(): void {
    this.refreshTrigger.next();
  }

  private saveBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  private formPayload(): CreateShipmentDto {
    return {
      ...this.form,
      dispatchDate: this.toIso(this.dispatchDate),
      expectedDeliveryDate: this.toIso(this.expectedDeliveryDate),
      deliveredAt: this.toIso(this.deliveredAt),
      packageCount: Number(this.form.packageCount) || 1,
      packageWeightGrams: Number(this.form.packageWeightGrams) || 0,
    };
  }

  private toIso(value: string): string | undefined {
    return value ? new Date(`${value}T00:00:00.000Z`).toISOString() : undefined;
  }

  private dateInput(value: string | undefined): string {
    return value ? value.slice(0, 10) : '';
  }

  private emptyForm(): CreateShipmentDto {
    return {
      orderId: '',
      courier: '',
      trackingNumber: '',
      status: 'Ready',
      packageWeightGrams: 0,
      packageCount: 1,
      notes: '',
    };
  }
}
