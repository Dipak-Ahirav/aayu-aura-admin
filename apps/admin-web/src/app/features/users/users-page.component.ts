import { AsyncPipe, DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import type {
  AdminUserDto,
  CreateAdminUserDto,
  UserManagementListDto,
  UserRole,
} from '@aayu-aura/shared-types';
import { BehaviorSubject, catchError, map, of, startWith, switchMap } from 'rxjs';
import { UserApiService } from './user-api.service';

type UsersState =
  | { status: 'loading' }
  | { status: 'ready'; data: UserManagementListDto }
  | { status: 'error'; message: string };

type UsersTab = 'Users' | 'Roles' | 'Permissions' | 'Inactive';

@Component({
  selector: 'aa-users-page',
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
          <h1>Loading users</h1>
          <p>Reading users, roles, and permissions from MongoDB.</p>
        </section>
      } @else if (state.status === 'error') {
        <section class="state-panel error" role="alert">
          <mat-icon>error</mat-icon>
          <h1>Users unavailable</h1>
          <p>{{ state.message }}</p>
        </section>
      } @else {
        <section class="users-page">
          <div class="hero">
            <div>
              <p class="breadcrumb">Home / Users & Permissions</p>
              <h1 class="page-title">Users & Permissions</h1>
              <p class="muted">
                Manage admin users, roles, permissions, activation, deactivation, and access
                controls.
              </p>
            </div>
            <div class="hero-actions">
              <button mat-flat-button color="primary" type="button" (click)="inviteUser()">
                <mat-icon>person_add</mat-icon>
                Invite user
              </button>
              <button
                class="secondary"
                mat-flat-button
                color="primary"
                type="button"
                (click)="reviewPermissions()"
              >
                <mat-icon>admin_panel_settings</mat-icon>
                Review permissions
              </button>
            </div>
          </div>

          <section class="metrics" aria-label="User summary">
            <article class="maroon">
              <span>Active users</span><strong>{{ state.data.summary.activeUsers }}</strong>
            </article>
            <article class="plum">
              <span>Roles</span><strong>{{ state.data.summary.roles }}</strong>
            </article>
            <article class="gold">
              <span>Inactive</span><strong>{{ state.data.summary.inactiveUsers }}</strong>
            </article>
            <article class="green">
              <span>Owner</span><strong>{{ state.data.summary.owners }}</strong>
            </article>
          </section>

          <section class="invite-panel">
            <div>
              <h2>{{ editingUserId() ? 'Update user' : 'Invite user' }}</h2>
              <p>Create admin user with role-based permissions.</p>
            </div>
            <div class="form-grid">
              <mat-form-field appearance="outline">
                <mat-label>Name</mat-label>
                <input matInput [(ngModel)]="form.name" name="name" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Email</mat-label>
                <input matInput type="email" [(ngModel)]="form.email" name="email" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Role</mat-label>
                <mat-select [(ngModel)]="form.role" name="role">
                  @for (role of roles; track role) {
                    <mat-option [value]="role">{{ roleLabel(role) }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>{{ editingUserId() ? 'New password' : 'Temporary password' }}</mat-label>
                <input
                  matInput
                  type="password"
                  [(ngModel)]="form.temporaryPassword"
                  name="temporaryPassword"
                />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Status</mat-label>
                <mat-select [(ngModel)]="activeText" name="activeText">
                  <mat-option value="active">Active</mat-option>
                  <mat-option value="inactive">Inactive</mat-option>
                </mat-select>
              </mat-form-field>
            </div>
          </section>

          @if (message()) {
            <p class="success" role="status">{{ message() }}</p>
          }
          @if (error()) {
            <p class="error-message" role="alert">{{ error() }}</p>
          }

          <div class="tabs" aria-label="User tabs">
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
                    Search, role filters, active status, sorting, pagination, and updates are
                    connected to the API.
                  </p>
                </div>
                <div class="filter-strip" aria-label="User filters">
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
                    <mat-label>Role</mat-label>
                    <mat-select
                      [(ngModel)]="roleFilter"
                      name="roleFilter"
                      (selectionChange)="applyFilters()"
                    >
                      <mat-option value="all">All</mat-option>
                      @for (role of roles; track role) {
                        <mat-option [value]="role">{{ roleLabel(role) }}</mat-option>
                      }
                    </mat-select>
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Active status</mat-label>
                    <mat-select
                      [(ngModel)]="statusFilter"
                      name="statusFilter"
                      (selectionChange)="applyFilters()"
                    >
                      <mat-option value="all">All</mat-option>
                      <mat-option value="active">Active</mat-option>
                      <mat-option value="inactive">Inactive</mat-option>
                    </mat-select>
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Sort</mat-label>
                    <mat-select [(ngModel)]="sort" name="sort" (selectionChange)="applyFilters()">
                      <mat-option value="newest">Newest</mat-option>
                      <mat-option value="oldest">Oldest</mat-option>
                      <mat-option value="name_asc">Name A-Z</mat-option>
                      <mat-option value="name_desc">Name Z-A</mat-option>
                      <mat-option value="last_login">Last login</mat-option>
                    </mat-select>
                  </mat-form-field>
                </div>
              </div>

              @if (selectedTab() === 'Roles' || selectedTab() === 'Permissions') {
                <div class="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Role</th>
                        <th>Resources</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (role of state.data.roles; track role.role) {
                        <tr>
                          <td>
                            <strong>{{ roleLabel(role.role) }}</strong>
                          </td>
                          <td>{{ role.permissions.length }}</td>
                          <td>{{ permissionSummary(role.permissions) }}</td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              } @else if (state.data.items.length) {
                <div class="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Status</th>
                        <th>Last login</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (user of state.data.items; track user.id) {
                        <tr>
                          <td>
                            <strong>{{ user.name }}</strong>
                          </td>
                          <td>{{ user.email }}</td>
                          <td>{{ roleLabel(user.role) }}</td>
                          <td>
                            <span class="status" [class.inactive]="!user.isActive">{{
                              user.isActive ? 'Active' : 'Inactive'
                            }}</span>
                          </td>
                          <td>
                            {{ user.lastLoginAt ? (user.lastLoginAt | date: 'medium') : '-' }}
                          </td>
                          <td class="row-actions">
                            <button
                              mat-icon-button
                              type="button"
                              aria-label="Edit user"
                              (click)="editUser(user)"
                            >
                              <mat-icon>edit</mat-icon>
                            </button>
                            <button
                              mat-icon-button
                              type="button"
                              aria-label="Deactivate user"
                              (click)="deactivateUser(user)"
                              [disabled]="!user.isActive"
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
                  <mat-icon>admin_panel_settings</mat-icon>
                  <h2>No users found</h2>
                  <p>Invite a user or adjust search and filters.</p>
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
      .users-page {
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
      .invite-panel,
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
      .invite-panel,
      .table-panel {
        display: grid;
        gap: 14px;
        padding: 18px;
        min-width: 0;
      }
      .form-grid {
        display: grid;
        grid-template-columns: repeat(5, minmax(0, 1fr));
        gap: 12px;
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
        width: 240px;
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
        min-width: 820px;
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
        min-height: 240px;
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
export class UsersPageComponent {
  private readonly users = inject(UserApiService);
  private readonly refreshTrigger = new BehaviorSubject<void>(undefined);

  readonly selectedTab = signal<UsersTab>('Users');
  readonly searchText = signal('');
  readonly editingUserId = signal<string | null>(null);
  readonly message = signal<string | null>(null);
  readonly error = signal<string | null>(null);
  readonly roles: UserRole[] = [
    'owner',
    'administrator',
    'accountant',
    'inventory_manager',
    'order_manager',
    'viewer',
  ];
  roleFilter: 'all' | UserRole = 'all';
  statusFilter: 'all' | 'active' | 'inactive' = 'all';
  sort = 'newest';
  page = 1;
  pageSize = 10;
  activeText: 'active' | 'inactive' = 'active';
  form: CreateAdminUserDto = this.emptyForm();

  readonly state$ = this.refreshTrigger.pipe(
    switchMap(() =>
      this.users
        .listUsers({
          search: this.searchText(),
          role: this.roleFilter,
          status: this.statusFilter,
          tab: this.tabQuery(),
          sort: this.sort,
          page: this.page,
          pageSize: this.pageSize,
        })
        .pipe(
          map((data): UsersState => ({ status: 'ready', data })),
          startWith({ status: 'loading' } as UsersState),
          catchError(() =>
            of({
              status: 'error',
              message: 'Check the API server and MongoDB connection, then refresh users.',
            } as UsersState),
          ),
        ),
    ),
  );

  inviteUser(): void {
    if (!this.form.name.trim() || !this.form.email.trim() || !this.form.role) {
      this.error.set('Name, email, and role are required.');
      return;
    }
    if (!this.editingUserId() && this.form.temporaryPassword.length < 8) {
      this.error.set('Temporary password must be at least 8 characters.');
      return;
    }
    this.error.set(null);
    this.message.set(null);
    const payload = { ...this.form, isActive: this.activeText === 'active' };
    const request = this.editingUserId()
      ? this.users.updateUser(this.editingUserId() ?? '', {
          name: payload.name,
          email: payload.email,
          role: payload.role,
          isActive: payload.isActive,
          ...(payload.temporaryPassword ? { temporaryPassword: payload.temporaryPassword } : {}),
        })
      : this.users.createUser(payload);
    request.subscribe({
      next: () => {
        this.message.set(this.editingUserId() ? 'User updated.' : 'User invited.');
        this.editingUserId.set(null);
        this.form = this.emptyForm();
        this.activeText = 'active';
        this.refresh();
      },
      error: () => this.error.set('User could not be saved. Check email uniqueness and password.'),
    });
  }

  reviewPermissions(): void {
    this.selectedTab.set('Permissions');
    this.page = 1;
    this.refresh();
  }

  editUser(user: AdminUserDto): void {
    this.editingUserId.set(user.id);
    this.activeText = user.isActive ? 'active' : 'inactive';
    this.form = {
      name: user.name,
      email: user.email,
      role: user.role,
      temporaryPassword: '',
      isActive: user.isActive,
    };
  }

  deactivateUser(user: AdminUserDto): void {
    this.users.deactivateUser(user.id).subscribe({
      next: () => {
        this.message.set('User deactivated.');
        this.refresh();
      },
      error: () => this.error.set('User could not be deactivated.'),
    });
  }

  applyFilters(): void {
    this.page = 1;
    this.refresh();
  }

  onSearchChange(value: string): void {
    this.searchText.set(value);
    this.applyFilters();
  }

  selectTab(tab: UsersTab): void {
    this.selectedTab.set(tab);
    if (tab === 'Inactive') this.statusFilter = 'inactive';
    if (tab !== 'Inactive' && this.statusFilter === 'inactive') this.statusFilter = 'all';
    this.page = 1;
    this.refresh();
  }

  previousPage(): void {
    this.page = Math.max(this.page - 1, 1);
    this.refresh();
  }

  nextPage(data: UserManagementListDto): void {
    this.page = Math.min(this.page + 1, this.totalPages(data));
    this.refresh();
  }

  tabs(data: UserManagementListDto) {
    return [
      { label: 'Users' as const, count: data.summary.totalUsers },
      { label: 'Roles' as const, count: data.summary.roles },
      { label: 'Permissions' as const, count: data.summary.permissions },
      { label: 'Inactive' as const, count: data.summary.inactiveUsers },
    ];
  }

  totalPages(data: UserManagementListDto): number {
    return Math.max(Math.ceil(data.total / data.pageSize), 1);
  }

  roleLabel(role: UserRole): string {
    return role.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  permissionSummary(permissions: UserManagementListDto['roles'][number]['permissions']): string {
    return permissions
      .slice(0, 6)
      .map(
        (permission) =>
          `${permission.resource.replace(/_/g, ' ')}: ${permission.actions.join('/')}`,
      )
      .join(' | ');
  }

  private refresh(): void {
    this.refreshTrigger.next();
  }

  private tabQuery(): 'users' | 'roles' | 'permissions' | 'inactive' {
    if (this.selectedTab() === 'Roles') return 'roles';
    if (this.selectedTab() === 'Permissions') return 'permissions';
    if (this.selectedTab() === 'Inactive') return 'inactive';
    return 'users';
  }

  private emptyForm(): CreateAdminUserDto {
    return {
      name: '',
      email: '',
      role: 'viewer',
      temporaryPassword: '',
      isActive: true,
    };
  }
}
