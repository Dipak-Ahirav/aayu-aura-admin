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

export type DashboardPeriod =
  | 'today'
  | 'yesterday'
  | 'last_7_days'
  | 'last_30_days'
  | 'current_month'
  | 'previous_month'
  | 'financial_year';

export interface DashboardMetricDto {
  label: string;
  value: string;
  tone: 'maroon' | 'plum' | 'gold' | 'green';
}

export interface DashboardSeriesPointDto {
  label: string;
  value: number;
}

export interface DashboardAttentionItemDto {
  label: string;
  value: string;
}

export interface DashboardSummaryDto {
  period: DashboardPeriod;
  dateRange: {
    from: string;
    to: string;
  };
  metrics: DashboardMetricDto[];
  dailySales: DashboardSeriesPointDto[];
  orderStatus: DashboardSeriesPointDto[];
  salesByChannel: DashboardSeriesPointDto[];
  attentionItems: DashboardAttentionItemDto[];
  collectionStatus: Record<string, boolean>;
}

export type OrderSource =
  | 'Admin'
  | 'WhatsApp'
  | 'Instagram'
  | 'Facebook'
  | 'Phone'
  | 'Offline'
  | 'Marketplace'
  | 'Referral';

export type OrderPaymentStatus = 'Unpaid' | 'Partially paid' | 'Paid';

export type OrderFulfilmentStatus =
  | 'Draft'
  | 'Pending'
  | 'Confirmed'
  | 'Packed'
  | 'Ready to ship'
  | 'Shipped'
  | 'Delivered'
  | 'Cancelled';

export interface CreateOrderItemDto {
  productName: string;
  sku?: string;
  hsn?: string;
  quantity: number;
  unitPriceInPaise: number;
  discountInPaise: number;
  gstRate: number;
}

export interface CreateOrderDto {
  source: OrderSource;
  customer: {
    name: string;
    mobile: string;
    email?: string;
    billingAddress?: string;
    shippingAddress?: string;
    state?: string;
    stateCode?: string;
  };
  items: CreateOrderItemDto[];
  shippingChargeInPaise: number;
  packagingChargeInPaise: number;
  otherChargeInPaise: number;
  advancePaidInPaise: number;
  notes?: string;
  internalNotes?: string;
}

export interface OrderItemDto extends CreateOrderItemDto {
  taxableAmountInPaise: number;
  taxAmountInPaise: number;
  lineTotalInPaise: number;
}

export interface OrderDto {
  id: string;
  orderNumber: string;
  source: OrderSource;
  customer: CreateOrderDto['customer'] & { id?: string };
  items: OrderItemDto[];
  subtotalInPaise: number;
  itemDiscountInPaise: number;
  taxableAmountInPaise: number;
  taxAmountInPaise: number;
  shippingChargeInPaise: number;
  packagingChargeInPaise: number;
  otherChargeInPaise: number;
  totalInPaise: number;
  advancePaidInPaise: number;
  dueAmountInPaise: number;
  paymentStatus: OrderPaymentStatus;
  fulfilmentStatus: OrderFulfilmentStatus;
  notes?: string;
  internalNotes?: string;
  createdAt: string;
}
