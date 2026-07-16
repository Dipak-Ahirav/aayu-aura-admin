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
  category?: string;
  status: 'draft' | 'active' | 'archived';
  purchasePriceInPaise: number;
  landedCostInPaise: number;
  sellingPriceInPaise: number;
  currentPhysicalStock: number;
  reservedStock: number;
  availableStock: number;
  reorderLevel?: number;
  hsn?: string;
  gstRate?: number;
  coverImageUrl?: string;
  internalNotes?: string;
  createdAt?: string;
}

export type ProductStatus = AdminProductDto['status'];

export interface CreateProductDto {
  name: string;
  sku: string;
  category?: string;
  status?: ProductStatus;
  purchasePriceInPaise: number;
  landedCostInPaise: number;
  sellingPriceInPaise: number;
  currentPhysicalStock: number;
  reservedStock?: number;
  reorderLevel?: number;
  hsn?: string;
  gstRate?: number;
  coverImageUrl?: string;
  internalNotes?: string;
}

export type UpdateProductDto = Partial<CreateProductDto>;

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

export type CustomerStatus = 'active' | 'inactive';

export type CustomerType = string;

export type CustomerSource = string;

export interface CreateCustomerDto {
  name: string;
  mobile: string;
  email?: string;
  billingAddress?: string;
  shippingAddress?: string;
  state?: string;
  stateCode?: string;
  source?: CustomerSource;
  customerType?: CustomerType;
  consentWhatsApp?: boolean;
  consentEmail?: boolean;
  internalNotes?: string;
}

export type UpdateCustomerDto = Partial<CreateCustomerDto> & {
  isActive?: boolean;
};

export interface CustomerDto extends CreateCustomerDto {
  id: string;
  isActive: boolean;
  lifetimeValueInPaise: number;
  outstandingInPaise: number;
  orderCount: number;
  lastPurchaseAt?: string;
  createdAt: string;
}

export interface CustomerSummaryDto {
  totalCustomers: number;
  newThisMonth: number;
  outstandingInPaise: number;
  outstandingCustomers: number;
  repeatBuyers: number;
  inactiveCustomers: number;
}

export interface CustomerListDto {
  items: CustomerDto[];
  total: number;
  page: number;
  pageSize: number;
  summary: CustomerSummaryDto;
}

export type MasterDataType = 'Catalogue' | 'Inventory' | 'Finance' | 'Order setup';

export type MasterDataStatus = 'active' | 'inactive' | 'protected';

export interface CreateMasterDataDto {
  master: string;
  type: MasterDataType;
  value: string;
  code?: string;
  description?: string;
  sortOrder?: number;
  status?: MasterDataStatus;
  isProtected?: boolean;
  usedByRecords?: number;
}

export type UpdateMasterDataDto = Partial<CreateMasterDataDto>;

export interface MasterDataDto extends CreateMasterDataDto {
  id: string;
  status: MasterDataStatus;
  isProtected: boolean;
  usedByRecords: number;
  sortOrder: number;
  createdAt: string;
}

export interface MasterDataSummaryDto {
  masters: number;
  activeValues: number;
  inactiveValues: number;
  protectedValues: number;
  catalogueValues: number;
  inventoryValues: number;
  financeValues: number;
  orderSetupValues: number;
}

export interface MasterDataListDto {
  items: MasterDataDto[];
  total: number;
  page: number;
  pageSize: number;
  summary: MasterDataSummaryDto;
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

export type OrderSource = string;

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

export type InvoiceType = string;

export type InvoiceStatus = 'Draft' | 'Finalised' | 'Cancelled';

export interface CreateInvoiceDto {
  orderId: string;
  type: InvoiceType;
  dueDate?: string;
  notes?: string;
}

export interface InvoiceDto {
  id: string;
  invoiceNumber: string;
  type: InvoiceType;
  status: InvoiceStatus;
  orderId: string;
  orderNumber: string;
  customer: CreateOrderDto['customer'];
  items: OrderItemDto[];
  subtotalInPaise: number;
  itemDiscountInPaise: number;
  taxableAmountInPaise: number;
  taxAmountInPaise: number;
  shippingChargeInPaise: number;
  packagingChargeInPaise: number;
  otherChargeInPaise: number;
  grandTotalInPaise: number;
  paidAmountInPaise: number;
  dueAmountInPaise: number;
  invoiceDate: string;
  dueDate?: string;
  notes?: string;
  createdAt: string;
}

export type PaymentDirection = string;

export type PaymentMethod = string;

export type PaymentStatus = 'Recorded' | 'Reconciled' | 'Cancelled';

export interface CreatePaymentDto {
  direction: PaymentDirection;
  orderId?: string;
  invoiceId?: string;
  amountInPaise: number;
  method: PaymentMethod;
  paymentDate?: string;
  referenceNumber?: string;
  notes?: string;
}

export interface PaymentDto {
  id: string;
  paymentNumber: string;
  direction: PaymentDirection;
  status: PaymentStatus;
  orderId?: string;
  orderNumber?: string;
  invoiceId?: string;
  invoiceNumber?: string;
  customer?: CreateOrderDto['customer'];
  amountInPaise: number;
  method: PaymentMethod;
  paymentDate: string;
  referenceNumber?: string;
  notes?: string;
  createdAt: string;
}
