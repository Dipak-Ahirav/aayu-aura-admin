export type UserRole =
  'owner' | 'administrator' | 'accountant' | 'inventory_manager' | 'order_manager' | 'viewer';

export type PermissionAction = 'create' | 'read' | 'update' | 'delete' | 'export' | 'approve';

export type PermissionResource =
  | 'dashboard'
  | 'products'
  | 'master_data'
  | 'suppliers'
  | 'purchases'
  | 'customers'
  | 'orders'
  | 'payments'
  | 'invoices'
  | 'inventory'
  | 'reports'
  | 'accounting_exports'
  | 'settings'
  | 'users'
  | 'audit_logs';

export interface PermissionDto {
  resource: PermissionResource;
  actions: PermissionAction[];
}

export interface UserProfileDto {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  permissions: PermissionDto[];
  isActive: boolean;
}

export interface ApiSuccess<TData, TMeta = Record<string, unknown>> {
  success: true;
  data: TData;
  meta?: TMeta;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    fieldErrors?: Record<string, string>;
  };
}

export type ApiResponse<TData, TMeta = Record<string, unknown>> =
  ApiSuccess<TData, TMeta> | ApiError;

export interface AdminProductDto {
  id: string;
  name: string;
  sku: string;
  status: 'draft' | 'active' | 'archived';
  purchasePriceInPaise: number;
  landedCostInPaise: number;
  sellingPriceInPaise: number;
  currentPhysicalStock: number;
  reservedStock: number;
  availableStock: number;
  internalNotes?: string;
}

export interface PublicProductDto {
  id: string;
  name: string;
  sku: string;
  shortDescription?: string;
  sellingPriceInPaise: number;
  coverImageUrl?: string;
  isAvailable: boolean;
}

export interface BusinessSettingsDto {
  displayName: string;
  legalName?: string;
  currency: 'INR';
  locale: 'en-IN';
  timeZone: 'Asia/Kolkata';
  financialYearStartMonth: 4;
  gstEnabled: boolean;
}

export type OperationalModuleSlug =
  | 'products'
  | 'master-data'
  | 'suppliers'
  | 'purchases'
  | 'inventory'
  | 'customers'
  | 'orders'
  | 'payments'
  | 'invoices'
  | 'shipping'
  | 'returns'
  | 'expenses'
  | 'reports'
  | 'accounting-exports'
  | 'users'
  | 'audit-logs'
  | 'settings';

export interface ModuleMetricDto {
  label: string;
  value: string;
  tone: 'maroon' | 'plum' | 'gold' | 'green';
}

export interface ModuleActionDto {
  label: string;
  icon: string;
  kind: 'primary' | 'secondary';
  description: string;
}

export interface ModuleTabDto {
  label: string;
  count?: number;
}

export interface ModuleTableDto {
  columns: string[];
  rows: Record<string, string>[];
}

export interface ModuleOverviewDto {
  slug: OperationalModuleSlug;
  title: string;
  breadcrumb: string;
  description: string;
  status: 'foundation' | 'ready' | 'planned';
  metrics: ModuleMetricDto[];
  actions: ModuleActionDto[];
  tabs: ModuleTabDto[];
  filters: string[];
  table: ModuleTableDto;
  workflowSteps: string[];
  apiRoutes: string[];
}
