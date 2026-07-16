import { AsyncPipe, DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import type {
  CreateMasterDataDto,
  MasterDataDto,
  MasterDataListDto,
  MasterDataStatus,
  MasterDataType,
} from '@aayu-aura/shared-types';
import { BehaviorSubject, catchError, map, of, startWith, switchMap } from 'rxjs';
import { MasterDataApiService } from './master-data-api.service';
import { MASTER_DEFINITIONS, mastersForType } from './master-data-registry';

type MasterDataState =
  | { status: 'loading' }
  | { status: 'ready'; data: MasterDataListDto }
  | { status: 'error'; message: string };

type TypeFilter = 'all' | MasterDataType;
type StatusFilter = 'all' | MasterDataStatus;

@Component({
  selector: 'aa-master-data-page',
  standalone: true,
  imports: [
    AsyncPipe,
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
          <h1>Loading master data</h1>
          <p>Reading configuration values from MongoDB.</p>
        </section>
      } @else if (state.status === 'error') {
        <section class="state-panel error" role="alert">
          <mat-icon>error</mat-icon>
          <h1>Master data unavailable</h1>
          <p>{{ state.message }}</p>
        </section>
      } @else {
        <section class="master-data-page">
          <div class="hero">
            <div>
              <p class="breadcrumb">Home / Master Data</p>
              <h1 class="page-title">Master Data</h1>
              <p class="muted">
                Manage categories, statuses, payment settings, order options, and reusable admin
                values.
              </p>
            </div>
            <div class="hero-actions">
              <button mat-flat-button color="primary" type="button" (click)="startNewItem()">
                <mat-icon>add_circle</mat-icon>
                Add value
              </button>
              <button
                class="secondary"
                mat-flat-button
                color="primary"
                type="button"
                (click)="showProtectedCount(state.data)"
              >
                <mat-icon>lock</mat-icon>
                Protected values
              </button>
            </div>
          </div>

          <section class="metrics" aria-label="Master data summary">
            <article class="maroon">
              <span>Masters</span><strong>{{ state.data.summary.masters }}</strong>
            </article>
            <article class="plum">
              <span>Active values</span><strong>{{ state.data.summary.activeValues }}</strong>
            </article>
            <article class="gold">
              <span>Inactive values</span><strong>{{ state.data.summary.inactiveValues }}</strong>
            </article>
            <article class="green">
              <span>Protected values</span><strong>{{ state.data.summary.protectedValues }}</strong>
            </article>
          </section>

          <section class="master-form">
            <div>
              <h2>{{ editingItemId() ? 'Update value' : 'Create value' }}</h2>
              <p>{{ selectedMasterUsage() }}</p>
            </div>

            <div class="form-grid">
              <mat-form-field appearance="outline">
                <mat-label>Master</mat-label>
                <mat-select [(ngModel)]="form.master" name="master">
                  @for (definition of masterOptions(); track definition.master) {
                    <mat-option [value]="definition.master">
                      {{ definition.master }} / {{ definition.usedIn }}
                    </mat-option>
                  }
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Type</mat-label>
                <mat-select
                  [(ngModel)]="form.type"
                  name="type"
                  (selectionChange)="onTypeChange($event.value)"
                >
                  @for (type of types; track type) {
                    <mat-option [value]="type">{{ type }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Value</mat-label>
                <input matInput [(ngModel)]="form.value" name="value" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Code</mat-label>
                <input matInput [(ngModel)]="form.code" name="code" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Status</mat-label>
                <mat-select [(ngModel)]="form.status" name="status">
                  @for (status of statuses; track status) {
                    <mat-option [value]="status">{{ labelStatus(status) }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Sort order</mat-label>
                <input matInput type="number" [(ngModel)]="form.sortOrder" name="sortOrder" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Used by records</mat-label>
                <input
                  matInput
                  type="number"
                  [(ngModel)]="form.usedByRecords"
                  name="usedByRecords"
                />
              </mat-form-field>
              <mat-form-field appearance="outline" class="wide">
                <mat-label>Description</mat-label>
                <input matInput [(ngModel)]="form.description" name="description" />
              </mat-form-field>
            </div>

            <div class="option-row">
              <mat-checkbox [(ngModel)]="form.isProtected" name="isProtected"
                >Protected value</mat-checkbox
              >
            </div>

            <div class="form-actions">
              <button
                mat-flat-button
                color="primary"
                type="button"
                (click)="saveItem()"
                [disabled]="saving()"
              >
                <mat-icon>{{ editingItemId() ? 'save' : 'add_circle' }}</mat-icon>
                {{ saving() ? 'Saving...' : editingItemId() ? 'Save value' : 'Create value' }}
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

          <div class="tabs" aria-label="Master data tabs">
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
                    Search, filters, sorting, pagination, create, update, and deactivate use the
                    API.
                  </p>
                </div>
                <div class="filter-strip" aria-label="Master data filters">
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
                      @for (status of statuses; track status) {
                        <mat-option [value]="status">{{ labelStatus(status) }}</mat-option>
                      }
                    </mat-select>
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Type</mat-label>
                    <mat-select
                      [(ngModel)]="typeFilter"
                      name="typeFilter"
                      (selectionChange)="selectTypeFilter($event.value)"
                    >
                      <mat-option value="all">All</mat-option>
                      @for (type of types; track type) {
                        <mat-option [value]="type">{{ type }}</mat-option>
                      }
                    </mat-select>
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Sort</mat-label>
                    <mat-select [(ngModel)]="sort" name="sort" (selectionChange)="applyFilters()">
                      <mat-option value="newest">Newest</mat-option>
                      <mat-option value="oldest">Oldest</mat-option>
                      <mat-option value="master_asc">Master A-Z</mat-option>
                      <mat-option value="value_asc">Value A-Z</mat-option>
                      <mat-option value="sort_order">Sort order</mat-option>
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
                        <th>Master</th>
                        <th>Value</th>
                        <th>Type</th>
                        <th>Code</th>
                        <th>Used by records</th>
                        <th>Status</th>
                        <th>Updated</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (item of state.data.items; track item.id) {
                        <tr
                          [class.selected]="selectedItem()?.id === item.id"
                          (click)="selectedItem.set(item)"
                          tabindex="0"
                        >
                          <td>
                            <strong>{{ item.master }}</strong>
                            <small>{{ item.description || 'Reusable admin value' }}</small>
                          </td>
                          <td>{{ item.value }}</td>
                          <td>{{ item.type }}</td>
                          <td>{{ item.code || '-' }}</td>
                          <td>{{ item.usedByRecords }}</td>
                          <td>
                            <span
                              class="status"
                              [class.inactive]="item.status === 'inactive'"
                              [class.protected]="item.status === 'protected'"
                            >
                              {{ labelStatus(item.status) }}
                            </span>
                          </td>
                          <td>{{ item.createdAt | date: 'mediumDate' }}</td>
                          <td class="row-actions">
                            <button
                              mat-icon-button
                              type="button"
                              aria-label="Edit master data"
                              (click)="editItem(item); $event.stopPropagation()"
                            >
                              <mat-icon>edit</mat-icon>
                            </button>
                            <button
                              mat-icon-button
                              type="button"
                              aria-label="Deactivate master data"
                              (click)="deactivateItem(item); $event.stopPropagation()"
                              [disabled]="item.status !== 'active'"
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
                  <mat-icon>category</mat-icon>
                  <h2>No master data found</h2>
                  <p>Create a value or adjust search and filters.</p>
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
      .master-data-page {
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
      .option-row,
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
      .master-form,
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
      .master-form {
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
        min-width: 920px;
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
      .status.inactive {
        background: rgba(108, 100, 102, 0.12);
        color: var(--aa-muted);
      }
      .status.protected {
        background: rgba(189, 139, 58, 0.16);
        color: #7a5521;
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
export class MasterDataPageComponent {
  private readonly masterData = inject(MasterDataApiService);
  private readonly refreshTrigger = new BehaviorSubject<void>(undefined);

  readonly selectedItem = signal<MasterDataDto | null>(null);
  readonly selectedTab = signal('All values');
  readonly editingItemId = signal<string | null>(null);
  readonly searchText = signal('');
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly message = signal<string | null>(null);
  readonly types: MasterDataType[] = ['Catalogue', 'Inventory', 'Finance', 'Order setup'];
  readonly statuses: MasterDataStatus[] = ['active', 'inactive', 'protected'];
  readonly masterDefinitions = MASTER_DEFINITIONS;
  statusFilter: StatusFilter = 'all';
  typeFilter: TypeFilter = 'all';
  sort = 'newest';
  page = 1;
  pageSize = 10;
  form: CreateMasterDataDto = this.emptyForm();

  readonly state$ = this.refreshTrigger.pipe(
    switchMap(() =>
      this.masterData
        .listMasterData({
          search: this.searchText(),
          status: this.statusFilter,
          type: this.typeFilter,
          sort: this.sort,
          page: this.page,
          pageSize: this.pageSize,
        })
        .pipe(
          map((data): MasterDataState => {
            if (!this.selectedItem() && data.items[0]) {
              this.selectedItem.set(data.items[0]);
            }
            return { status: 'ready', data };
          }),
          startWith({ status: 'loading' } as MasterDataState),
          catchError(() =>
            of({
              status: 'error',
              message: 'Check the API server and MongoDB connection, then refresh master data.',
            } as MasterDataState),
          ),
        ),
    ),
  );

  saveItem(): void {
    if (!this.form.master.trim() || !this.form.value.trim()) {
      this.error.set('Master and value are required.');
      return;
    }

    this.saving.set(true);
    this.error.set(null);
    this.message.set(null);
    const request = this.editingItemId()
      ? this.masterData.updateMasterData(this.editingItemId() ?? '', this.form)
      : this.masterData.createMasterData(this.form);

    request.subscribe({
      next: (item) => {
        this.saving.set(false);
        this.selectedItem.set(item);
        this.message.set(this.editingItemId() ? 'Master data updated.' : 'Master data created.');
        this.resetForm();
        this.refresh();
      },
      error: () => {
        this.saving.set(false);
        this.error.set('Master data could not be saved. Check required fields and duplicates.');
      },
    });
  }

  editItem(item: MasterDataDto): void {
    this.editingItemId.set(item.id);
    this.form = {
      master: item.master,
      type: item.type,
      value: item.value,
      code: item.code ?? '',
      description: item.description ?? '',
      sortOrder: item.sortOrder,
      status: item.status,
      isProtected: item.isProtected,
      usedByRecords: item.usedByRecords,
    };
  }

  deactivateItem(item: MasterDataDto): void {
    this.masterData.deactivateMasterData(item.id).subscribe({
      next: (updated) => {
        this.selectedItem.set(updated);
        this.message.set('Master data deactivated.');
        this.refresh();
      },
      error: () => this.error.set('Protected master data cannot be deactivated.'),
    });
  }

  startNewItem(): void {
    this.resetForm();
  }

  resetForm(): void {
    this.editingItemId.set(null);
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
    this.typeFilter = tab === 'All values' ? 'all' : (tab as MasterDataType);
    this.applyFilters();
  }

  selectTypeFilter(type: TypeFilter): void {
    this.selectedTab.set(type === 'all' ? 'All values' : type);
    this.applyFilters();
  }

  onTypeChange(type: MasterDataType): void {
    const options = mastersForType(type);
    if (!options.some((option) => option.master === this.form.master)) {
      this.form.master = options[0]?.master ?? '';
    }
  }

  previousPage(): void {
    this.page = Math.max(this.page - 1, 1);
    this.refresh();
  }

  nextPage(data: MasterDataListDto): void {
    this.page = Math.min(this.page + 1, this.totalPages(data));
    this.refresh();
  }

  tabs(data: MasterDataListDto) {
    return [
      { label: 'All values', count: data.total },
      { label: 'Catalogue', count: data.summary.catalogueValues },
      { label: 'Inventory', count: data.summary.inventoryValues },
      { label: 'Finance', count: data.summary.financeValues },
      { label: 'Order setup', count: data.summary.orderSetupValues },
    ];
  }

  totalPages(data: MasterDataListDto): number {
    return Math.max(Math.ceil(data.total / data.pageSize), 1);
  }

  labelStatus(status: MasterDataStatus): string {
    if (status === 'protected') return 'Protected';
    if (status === 'inactive') return 'Inactive';
    return 'Active';
  }

  masterOptions() {
    return mastersForType(this.form.type);
  }

  selectedMasterUsage(): string {
    const usage = this.masterDefinitions.find(
      (definition) => definition.master === this.form.master,
    );
    return usage
      ? `${usage.master} values appear in ${usage.usedIn}.`
      : 'Choose where this reusable value should appear in the application.';
  }

  showProtectedCount(data: MasterDataListDto): void {
    this.statusFilter = 'protected';
    this.message.set(`${data.summary.protectedValues} protected values are configured.`);
    this.applyFilters();
  }

  private refresh(): void {
    this.refreshTrigger.next();
  }

  private emptyForm(): CreateMasterDataDto {
    return {
      master: 'Product Category',
      type: 'Catalogue',
      value: '',
      code: '',
      description: '',
      sortOrder: 0,
      status: 'active',
      isProtected: false,
      usedByRecords: 0,
    };
  }
}
