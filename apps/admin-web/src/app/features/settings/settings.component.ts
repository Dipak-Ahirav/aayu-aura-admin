import { AsyncPipe, DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import type {
  BusinessSettingsDto,
  SettingsBackupDto,
  SettingsListDto,
} from '@aayu-aura/shared-types';
import { BehaviorSubject, catchError, map, of, startWith, switchMap, tap } from 'rxjs';
import { SettingsApiService } from './settings-api.service';

type SettingsState =
  | { status: 'loading' }
  | { status: 'ready'; data: SettingsListDto }
  | { status: 'error'; message: string };

interface SettingsForm {
  displayName: string;
  legalName: string;
  gstEnabled: boolean;
  gstin: string;
  pan: string;
  address: string;
  state: string;
  stateCode: string;
  email: string;
  phone: string;
  invoicePrefix: string;
  bankName: string;
  bankAccountNumber: string;
  bankIfsc: string;
  upiId: string;
  invoiceFooter: string;
  allowNegativeStock: boolean;
  lowStockAlertEnabled: boolean;
  emailProvider: string;
  whatsappProvider: string;
}

@Component({
  selector: 'aa-settings',
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
          <h1>Loading settings</h1>
          <p>Reading business profile, controls, and backups from MongoDB.</p>
        </section>
      } @else if (state.status === 'error') {
        <section class="state-panel error" role="alert">
          <mat-icon>error</mat-icon>
          <h1>Settings unavailable</h1>
          <p>{{ state.message }}</p>
        </section>
      } @else {
        <section class="settings-page">
          <div class="heading-row">
            <div>
              <p class="breadcrumb">Home / Settings</p>
              <h1 class="page-title">Business settings</h1>
              <p class="muted">
                Configure business identity, invoice defaults, communication providers, and data
                controls.
              </p>
            </div>
            <div class="heading-actions">
              <button mat-flat-button color="primary" type="button" (click)="saveProfile()">
                <mat-icon>save</mat-icon>
                Update profile
              </button>
              <button
                class="secondary"
                mat-flat-button
                color="primary"
                type="button"
                (click)="backupData()"
              >
                <mat-icon>backup</mat-icon>
                Backup data
              </button>
            </div>
          </div>

          <section class="metrics" aria-label="Settings summary">
            <article class="maroon">
              <span>Profile</span><strong>{{ state.data.summary.businessProfile }}</strong>
            </article>
            <article class="plum">
              <span>GST</span><strong>{{ state.data.summary.gst }}</strong>
            </article>
            <article class="gold">
              <span>Sections</span><strong>{{ state.data.summary.sections }}</strong>
            </article>
            <article class="green">
              <span>Backups</span><strong>{{ state.data.summary.backups }}</strong>
            </article>
          </section>

          @if (message()) {
            <p class="success" role="status">{{ message() }}</p>
          }
          @if (error()) {
            <p class="error-message" role="alert">{{ error() }}</p>
          }

          <div class="settings-grid">
            <article>
              <mat-icon>storefront</mat-icon>
              <div>
                <h2>Business profile</h2>
                <p>
                  Logo, legal name, address, GSTIN, PAN, state, timezone, currency, and financial
                  year.
                </p>
              </div>
              <div class="form-grid">
                <mat-form-field appearance="outline">
                  <mat-label>Display name</mat-label>
                  <input matInput [(ngModel)]="form.displayName" name="displayName" />
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Legal name</mat-label>
                  <input matInput [(ngModel)]="form.legalName" name="legalName" />
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Email</mat-label>
                  <input matInput type="email" [(ngModel)]="form.email" name="email" />
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Phone</mat-label>
                  <input matInput [(ngModel)]="form.phone" name="phone" />
                </mat-form-field>
                <mat-form-field appearance="outline" class="wide">
                  <mat-label>Address</mat-label>
                  <textarea matInput rows="2" [(ngModel)]="form.address" name="address"></textarea>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>State</mat-label>
                  <input matInput [(ngModel)]="form.state" name="state" />
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>State code</mat-label>
                  <input matInput [(ngModel)]="form.stateCode" name="stateCode" />
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>GST enabled</mat-label>
                  <mat-select [(ngModel)]="form.gstEnabled" name="gstEnabled">
                    <mat-option [value]="true">Yes</mat-option>
                    <mat-option [value]="false">No</mat-option>
                  </mat-select>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>GSTIN</mat-label>
                  <input matInput [(ngModel)]="form.gstin" name="gstin" />
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>PAN</mat-label>
                  <input matInput [(ngModel)]="form.pan" name="pan" />
                </mat-form-field>
              </div>
            </article>

            <article>
              <mat-icon>receipt</mat-icon>
              <div>
                <h2>Billing and invoice</h2>
                <p>
                  GST settings, invoice numbering, bank details, UPI QR code, signatures, and footer
                  text.
                </p>
              </div>
              <div class="form-grid">
                <mat-form-field appearance="outline">
                  <mat-label>Invoice prefix</mat-label>
                  <input matInput [(ngModel)]="form.invoicePrefix" name="invoicePrefix" />
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Bank name</mat-label>
                  <input matInput [(ngModel)]="form.bankName" name="bankName" />
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Account number</mat-label>
                  <input matInput [(ngModel)]="form.bankAccountNumber" name="bankAccountNumber" />
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>IFSC</mat-label>
                  <input matInput [(ngModel)]="form.bankIfsc" name="bankIfsc" />
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>UPI ID</mat-label>
                  <input matInput [(ngModel)]="form.upiId" name="upiId" />
                </mat-form-field>
                <mat-form-field appearance="outline" class="wide">
                  <mat-label>Invoice footer</mat-label>
                  <textarea
                    matInput
                    rows="2"
                    [(ngModel)]="form.invoiceFooter"
                    name="invoiceFooter"
                  ></textarea>
                </mat-form-field>
              </div>
            </article>

            <article>
              <mat-icon>inventory</mat-icon>
              <div>
                <h2>Inventory rules</h2>
                <p>Negative stock, reservations, low-stock alerts, and return-to-stock behavior.</p>
              </div>
              <div class="form-grid compact">
                <mat-form-field appearance="outline">
                  <mat-label>Negative stock</mat-label>
                  <mat-select [(ngModel)]="form.allowNegativeStock" name="allowNegativeStock">
                    <mat-option [value]="true">Allowed</mat-option>
                    <mat-option [value]="false">Blocked</mat-option>
                  </mat-select>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Low-stock alerts</mat-label>
                  <mat-select [(ngModel)]="form.lowStockAlertEnabled" name="lowStockAlertEnabled">
                    <mat-option [value]="true">Enabled</mat-option>
                    <mat-option [value]="false">Disabled</mat-option>
                  </mat-select>
                </mat-form-field>
              </div>
            </article>

            <article>
              <mat-icon>forum</mat-icon>
              <div>
                <h2>Communication</h2>
                <p>
                  Email provider, WhatsApp provider, invoice templates, consent-aware messaging, and
                  logs.
                </p>
              </div>
              <div class="form-grid compact">
                <mat-form-field appearance="outline">
                  <mat-label>Email provider</mat-label>
                  <input matInput [(ngModel)]="form.emailProvider" name="emailProvider" />
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>WhatsApp provider</mat-label>
                  <input matInput [(ngModel)]="form.whatsappProvider" name="whatsappProvider" />
                </mat-form-field>
              </div>
            </article>
          </div>

          <section class="table-panel">
            <div class="panel-heading">
              <div>
                <h2>Configuration status</h2>
                <p>Search and filters are API-backed and refresh from MongoDB.</p>
              </div>
              <div class="filter-strip">
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
                  <mat-label>Section</mat-label>
                  <mat-select
                    [(ngModel)]="sectionFilter"
                    name="sectionFilter"
                    (selectionChange)="reload()"
                  >
                    <mat-option value="all">All sections</mat-option>
                    <mat-option value="business-profile">Business profile</mat-option>
                    <mat-option value="billing-and-invoice">Billing and invoice</mat-option>
                    <mat-option value="inventory-rules">Inventory rules</mat-option>
                    <mat-option value="communication">Communication</mat-option>
                    <mat-option value="data-safety">Data safety</mat-option>
                  </mat-select>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Configured</mat-label>
                  <mat-select
                    [(ngModel)]="configuredFilter"
                    name="configuredFilter"
                    (selectionChange)="reload()"
                  >
                    <mat-option value="all">All</mat-option>
                    <mat-option value="configured">Configured</mat-option>
                    <mat-option value="partial">Partial</mat-option>
                    <mat-option value="missing">Missing</mat-option>
                  </mat-select>
                </mat-form-field>
              </div>
            </div>

            @if (state.data.sections.length) {
              <div class="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Section</th>
                      <th>Configured</th>
                      <th>Critical</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (section of state.data.sections; track section.section) {
                      <tr>
                        <td>{{ section.section }}</td>
                        <td>{{ section.configured }}</td>
                        <td>{{ section.critical ? 'Yes' : 'No' }}</td>
                        <td>
                          <span class="status" [class.warning]="section.status !== 'Configured'">
                            {{ section.status }}
                          </span>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            } @else {
              <div class="empty-state">
                <mat-icon>settings</mat-icon>
                <p>No settings sections match the selected filters.</p>
              </div>
            }
          </section>

          <section class="table-panel">
            <div class="panel-heading">
              <div>
                <h2>Data backups</h2>
                <p>
                  Generated backups include key MongoDB collections and can be downloaded as JSON.
                </p>
              </div>
            </div>
            @if (state.data.backups.length) {
              <div class="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Backup</th>
                      <th>Collections</th>
                      <th>Records</th>
                      <th>Status</th>
                      <th>Generated</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (backup of state.data.backups; track backup.id) {
                      <tr>
                        <td>{{ backup.backupNumber }}</td>
                        <td>{{ backup.collections.length }}</td>
                        <td>{{ backup.records }}</td>
                        <td>{{ backup.status }}</td>
                        <td>{{ backup.generatedAt | date: 'dd MMM yyyy, h:mm a' }}</td>
                        <td>
                          <button mat-stroked-button type="button" (click)="downloadBackup(backup)">
                            <mat-icon>download</mat-icon>
                            Download
                          </button>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            } @else {
              <div class="empty-state">
                <mat-icon>backup</mat-icon>
                <p>No backups generated yet.</p>
              </div>
            }
          </section>
        </section>
      }
    }
  `,
  styles: [
    `
      .settings-page {
        display: grid;
        gap: 18px;
      }

      .heading-row,
      .panel-heading {
        display: flex;
        justify-content: space-between;
        gap: 18px;
        align-items: flex-start;
      }

      .breadcrumb {
        margin: 0;
        color: var(--aa-maroon);
        font-weight: 700;
      }

      .settings-page .muted {
        max-width: 720px;
        margin: 0 0 10px;
        line-height: 1.7;
      }

      .heading-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        justify-content: flex-end;
      }

      .heading-actions button,
      td button {
        border-radius: 999px;
      }

      .heading-actions .secondary {
        background: var(--aa-plum);
      }

      .metrics {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 14px;
      }

      .metrics article {
        display: grid;
        gap: 20px;
        min-height: 118px;
        padding: 22px;
        border: 1px solid var(--aa-border);
        border-top: 5px solid var(--aa-maroon);
        border-radius: 8px;
        background: var(--aa-surface-strong);
      }

      .metrics span {
        color: var(--aa-muted);
        font-weight: 700;
      }

      .metrics strong {
        font-size: 1.55rem;
      }

      .metrics .plum {
        border-top-color: var(--aa-plum);
      }

      .metrics .gold {
        border-top-color: var(--aa-gold);
      }

      .metrics .green {
        border-top-color: var(--aa-green);
      }

      .settings-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 14px;
      }

      .settings-grid article,
      .table-panel {
        border: 1px solid var(--aa-border);
        border-radius: 8px;
        background: var(--aa-surface-strong);
      }

      .settings-grid article {
        min-height: 150px;
        display: grid;
        grid-template-columns: auto minmax(0, 1fr);
        gap: 16px;
        align-items: start;
        padding: 22px;
      }

      .settings-grid article > .form-grid {
        grid-column: 1 / -1;
      }

      mat-icon {
        color: var(--aa-maroon);
      }

      h2 {
        margin: 0 0 8px;
        font-size: 1.05rem;
      }

      p {
        margin: 0;
        color: var(--aa-muted);
        line-height: 1.55;
      }

      .form-grid,
      .filter-strip {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
      }

      .form-grid.compact {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .form-grid .wide {
        grid-column: 1 / -1;
      }

      .table-panel {
        display: grid;
        gap: 16px;
        padding: 22px;
      }

      .filter-strip {
        min-width: min(620px, 100%);
        grid-template-columns: repeat(3, minmax(150px, 1fr));
      }

      .table-scroll {
        overflow-x: auto;
      }

      table {
        width: 100%;
        border-collapse: collapse;
      }

      th,
      td {
        padding: 14px 12px;
        border-bottom: 1px solid var(--aa-border);
        text-align: left;
        vertical-align: middle;
      }

      th {
        color: var(--aa-muted);
        font-size: 0.82rem;
        text-transform: uppercase;
      }

      .status {
        display: inline-flex;
        padding: 6px 10px;
        border-radius: 999px;
        background: rgba(40, 121, 75, 0.1);
        color: var(--aa-green);
        font-weight: 800;
      }

      .status.warning {
        background: rgba(145, 31, 59, 0.1);
        color: var(--aa-maroon);
      }

      .success,
      .error-message,
      .empty-state,
      .state-panel {
        padding: 18px;
        border: 1px solid var(--aa-border);
        border-radius: 8px;
        background: var(--aa-surface-strong);
      }

      .success {
        color: var(--aa-green);
        font-weight: 800;
      }

      .error-message,
      .state-panel.error {
        color: var(--aa-maroon);
      }

      .empty-state,
      .state-panel {
        display: grid;
        justify-items: center;
        gap: 8px;
        text-align: center;
      }

      @media (max-width: 1060px) {
        .metrics,
        .settings-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .heading-row,
        .panel-heading {
          display: grid;
        }

        .heading-actions {
          justify-content: flex-start;
        }
      }

      @media (max-width: 760px) {
        .metrics,
        .settings-grid,
        .form-grid,
        .form-grid.compact,
        .filter-strip {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class SettingsComponent {
  private readonly settingsApi = inject(SettingsApiService);
  private readonly refresh$ = new BehaviorSubject<void>(undefined);
  private hydrated = false;

  readonly message = signal('');
  readonly error = signal('');
  readonly searchText = signal('');

  sectionFilter = 'all';
  configuredFilter: 'all' | 'configured' | 'partial' | 'missing' = 'all';

  form: SettingsForm = {
    displayName: '',
    legalName: '',
    gstEnabled: false,
    gstin: '',
    pan: '',
    address: '',
    state: '',
    stateCode: '',
    email: '',
    phone: '',
    invoicePrefix: '',
    bankName: '',
    bankAccountNumber: '',
    bankIfsc: '',
    upiId: '',
    invoiceFooter: '',
    allowNegativeStock: false,
    lowStockAlertEnabled: true,
    emailProvider: '',
    whatsappProvider: '',
  };

  readonly state$ = this.refresh$.pipe(
    switchMap(() =>
      this.settingsApi
        .listSettings({
          search: this.searchText(),
          section: this.sectionFilter,
          configured: this.configuredFilter,
          page: 1,
          pageSize: 10,
        })
        .pipe(
          tap((data) => this.hydrateForm(data.business)),
          map((data) => ({ status: 'ready', data }) as SettingsState),
          catchError(() =>
            of({
              status: 'error',
              message: 'Settings could not be loaded. Check the API server and MongoDB connection.',
            } as SettingsState),
          ),
          startWith({ status: 'loading' } as SettingsState),
        ),
    ),
  );

  onSearchChange(value: string): void {
    this.searchText.set(value);
    this.reload();
  }

  reload(): void {
    this.refresh$.next();
  }

  saveProfile(): void {
    this.message.set('');
    this.error.set('');
    if (!this.form.displayName.trim()) {
      this.error.set('Display name is required.');
      return;
    }

    this.settingsApi.updateBusiness(this.form).subscribe({
      next: () => {
        this.message.set('Business profile updated.');
        this.hydrated = false;
        this.reload();
      },
      error: () => this.error.set('Business profile could not be updated.'),
    });
  }

  backupData(): void {
    this.message.set('');
    this.error.set('');
    this.settingsApi.createBackup().subscribe({
      next: (backup) => {
        this.message.set(`${backup.backupNumber} generated with ${backup.records} records.`);
        this.reload();
      },
      error: () => this.error.set('Backup could not be generated.'),
    });
  }

  downloadBackup(backup: SettingsBackupDto): void {
    this.settingsApi.downloadBackup(backup.id).subscribe({
      next: (response) => {
        const blob = new Blob([response.body ?? ''], { type: 'application/json;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = backup.fileName;
        link.click();
        URL.revokeObjectURL(url);
        this.message.set('Backup downloaded.');
      },
      error: () => this.error.set('Backup could not be downloaded.'),
    });
  }

  private hydrateForm(settings: BusinessSettingsDto): void {
    if (this.hydrated) return;
    this.form = {
      displayName: settings.displayName ?? '',
      legalName: settings.legalName ?? '',
      gstEnabled: settings.gstEnabled ?? false,
      gstin: settings.gstin ?? '',
      pan: settings.pan ?? '',
      address: settings.address ?? '',
      state: settings.state ?? '',
      stateCode: settings.stateCode ?? '',
      email: settings.email ?? '',
      phone: settings.phone ?? '',
      invoicePrefix: settings.invoicePrefix ?? '',
      bankName: settings.bankName ?? '',
      bankAccountNumber: settings.bankAccountNumber ?? '',
      bankIfsc: settings.bankIfsc ?? '',
      upiId: settings.upiId ?? '',
      invoiceFooter: settings.invoiceFooter ?? '',
      allowNegativeStock: settings.allowNegativeStock ?? false,
      lowStockAlertEnabled: settings.lowStockAlertEnabled ?? true,
      emailProvider: settings.emailProvider ?? '',
      whatsappProvider: settings.whatsappProvider ?? '',
    };
    this.hydrated = true;
  }
}
