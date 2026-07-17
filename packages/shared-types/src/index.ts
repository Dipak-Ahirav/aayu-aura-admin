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

export interface AdminUserDto extends UserProfileDto {
  failedLoginAttempts: number;
  lastLoginAt?: string;
  createdAt: string;
}

export interface CreateAdminUserDto {
  name: string;
  email: string;
  role: UserRole;
  temporaryPassword: string;
  isActive?: boolean;
}

export type UpdateAdminUserDto = Partial<Omit<CreateAdminUserDto, 'temporaryPassword'>> & {
  temporaryPassword?: string;
};

export interface RolePermissionDto {
  role: UserRole;
  permissions: PermissionDto[];
}

export interface UserManagementSummaryDto {
  activeUsers: number;
  roles: number;
  inactiveUsers: number;
  owners: number;
  totalUsers: number;
  permissions: number;
}

export interface UserManagementListDto {
  items: AdminUserDto[];
  roles: RolePermissionDto[];
  total: number;
  page: number;
  pageSize: number;
  summary: UserManagementSummaryDto;
}

export type AuditModule =
  | 'Auth'
  | 'Products'
  | 'Inventory'
  | 'Invoices'
  | 'Payments'
  | 'Users'
  | 'Exports'
  | 'Settings'
  | 'Orders'
  | 'Finance';

export type AuditSeverity = 'Info' | 'Warning' | 'Critical';

export interface CreateAuditLogDto {
  module: AuditModule;
  action: string;
  entity: string;
  entityId?: string;
  userName?: string;
  userEmail?: string;
  previousValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  severity?: AuditSeverity;
  metadata?: Record<string, unknown>;
}

export interface AuditLogDto extends CreateAuditLogDto {
  id: string;
  userName: string;
  severity: AuditSeverity;
  reviewed: boolean;
  reviewedAt?: string;
  createdAt: string;
}

export interface AuditLogSummaryDto {
  eventsToday: number;
  security: number;
  inventory: number;
  finance: number;
  totalEvents: number;
  critical: number;
}

export interface AuditLogListDto {
  items: AuditLogDto[];
  total: number;
  page: number;
  pageSize: number;
  summary: AuditLogSummaryDto;
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

export type InventorySegment = 'all' | 'low_stock' | 'transactions' | 'reservations';

export type InventoryStockStatus = 'in_stock' | 'low_stock' | 'out_of_stock';

export type StockMovementType =
  'adjustment' | 'damage' | 'return' | 'reservation' | 'release' | 'purchase_receipt';

export type StockMovementDirection = 'in' | 'out';

export interface InventoryStockItemDto {
  productId: string;
  name: string;
  sku: string;
  category?: string;
  warehouse?: string;
  physicalStock: number;
  reservedStock: number;
  availableStock: number;
  reorderLevel: number;
  damagedStock: number;
  returnedStock: number;
  stockStatus: InventoryStockStatus;
  updatedAt?: string;
}

export interface StockMovementDto {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  warehouse?: string;
  movementType: StockMovementType;
  direction: StockMovementDirection;
  quantity: number;
  previousPhysicalStock: number;
  newPhysicalStock: number;
  previousReservedStock: number;
  newReservedStock: number;
  reason?: string;
  reference?: string;
  notes?: string;
  createdAt: string;
}

export interface CreateStockMovementDto {
  productId: string;
  warehouse?: string;
  movementType: StockMovementType;
  direction: StockMovementDirection;
  quantity: number;
  reason?: string;
  reference?: string;
  notes?: string;
}

export type UpdateStockMovementDto = Partial<
  Pick<CreateStockMovementDto, 'warehouse' | 'reason' | 'reference' | 'notes'>
>;

export interface InventorySummaryDto {
  availableStock: number;
  reservedStock: number;
  damagedStock: number;
  movementsToday: number;
  totalProducts: number;
  lowStock: number;
  transactions: number;
  reservations: number;
}

export interface InventoryListDto {
  stockItems: InventoryStockItemDto[];
  movements: StockMovementDto[];
  total: number;
  page: number;
  pageSize: number;
  summary: InventorySummaryDto;
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
  gstin?: string;
  pan?: string;
  address?: string;
  state?: string;
  stateCode?: string;
  email?: string;
  phone?: string;
  invoicePrefix?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankIfsc?: string;
  upiId?: string;
  invoiceFooter?: string;
  allowNegativeStock?: boolean;
  lowStockAlertEnabled?: boolean;
  emailProvider?: string;
  whatsappProvider?: string;
  updatedAt?: string;
}

export interface UpdateBusinessSettingsDto extends Partial<BusinessSettingsDto> {}

export type SettingsBackupStatus = 'Generated' | 'Failed' | 'Archived';

export interface SettingsBackupDto {
  id: string;
  backupNumber: string;
  status: SettingsBackupStatus;
  collections: string[];
  records: number;
  fileName: string;
  generatedAt: string;
  createdAt: string;
}

export interface SettingsSectionDto {
  section: string;
  configured: string;
  critical: boolean;
  status: string;
}

export interface SettingsSummaryDto {
  businessProfile: string;
  gst: string;
  whatsapp: string;
  email: string;
  sections: number;
  backups: number;
}

export interface SettingsListDto {
  business: BusinessSettingsDto;
  sections: SettingsSectionDto[];
  backups: SettingsBackupDto[];
  total: number;
  page: number;
  pageSize: number;
  summary: SettingsSummaryDto;
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

export type SupplierStatus = 'active' | 'payment_due' | 'inactive';

export interface CreateSupplierDto {
  name: string;
  contactPerson?: string;
  mobile: string;
  email?: string;
  gstin?: string;
  address?: string;
  state?: string;
  stateCode?: string;
  paymentTermsDays?: number;
  openingBalanceInPaise?: number;
  currentPayableInPaise?: number;
  bankName?: string;
  accountNumber?: string;
  ifsc?: string;
  status?: SupplierStatus;
  notes?: string;
}

export type UpdateSupplierDto = Partial<CreateSupplierDto>;

export interface SupplierDto extends CreateSupplierDto {
  id: string;
  status: SupplierStatus;
  paymentTermsDays: number;
  openingBalanceInPaise: number;
  currentPayableInPaise: number;
  isActive: boolean;
  createdAt: string;
}

export interface SupplierSummaryDto {
  totalSuppliers: number;
  activeSuppliers: number;
  payableInPaise: number;
  paymentDueSuppliers: number;
  inactiveSuppliers: number;
  gstRegistered: number;
}

export interface SupplierListDto {
  items: SupplierDto[];
  total: number;
  page: number;
  pageSize: number;
  summary: SupplierSummaryDto;
}

export type PurchaseStatus = 'Draft' | 'Ordered' | 'Partially received' | 'Received' | 'Cancelled';

export type PurchasePaymentStatus = 'Unpaid' | 'Partially paid' | 'Paid';

export interface CreatePurchaseItemDto {
  productId?: string;
  productName: string;
  sku?: string;
  hsn?: string;
  quantity: number;
  receivedQuantity?: number;
  unitCostInPaise: number;
  discountInPaise?: number;
  gstRate?: number;
}

export interface CreatePurchaseDto {
  supplierId: string;
  purchaseDate?: string;
  expectedReceiptDate?: string;
  supplierInvoiceNumber?: string;
  items: CreatePurchaseItemDto[];
  shippingChargeInPaise?: number;
  otherChargeInPaise?: number;
  paidAmountInPaise?: number;
  status?: PurchaseStatus;
  notes?: string;
  internalNotes?: string;
}

export type UpdatePurchaseDto = Partial<CreatePurchaseDto>;

export interface PurchaseItemDto extends CreatePurchaseItemDto {
  receivedQuantity: number;
  discountInPaise: number;
  gstRate: number;
  taxableAmountInPaise: number;
  taxAmountInPaise: number;
  lineTotalInPaise: number;
}

export interface PurchaseDto {
  id: string;
  purchaseNumber: string;
  supplierId: string;
  supplierName: string;
  supplierMobile?: string;
  supplierInvoiceNumber?: string;
  items: PurchaseItemDto[];
  subtotalInPaise: number;
  itemDiscountInPaise: number;
  taxableAmountInPaise: number;
  taxAmountInPaise: number;
  shippingChargeInPaise: number;
  otherChargeInPaise: number;
  totalInPaise: number;
  paidAmountInPaise: number;
  dueAmountInPaise: number;
  status: PurchaseStatus;
  paymentStatus: PurchasePaymentStatus;
  purchaseDate: string;
  expectedReceiptDate?: string;
  receivedAt?: string;
  notes?: string;
  internalNotes?: string;
  createdAt: string;
}

export interface PurchaseSummaryDto {
  purchaseValueInPaise: number;
  pendingReceipt: number;
  drafts: number;
  received: number;
  payableInPaise: number;
}

export interface PurchaseListDto {
  items: PurchaseDto[];
  total: number;
  page: number;
  pageSize: number;
  summary: PurchaseSummaryDto;
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

export type ShipmentStatus =
  'Ready' | 'Shipped' | 'In transit' | 'Delivered' | 'Delayed' | 'Cancelled';

export interface CreateShipmentDto {
  orderId: string;
  courier: string;
  trackingNumber?: string;
  status?: ShipmentStatus;
  dispatchDate?: string;
  expectedDeliveryDate?: string;
  deliveredAt?: string;
  packageWeightGrams?: number;
  packageCount?: number;
  notes?: string;
}

export type UpdateShipmentDto = Partial<CreateShipmentDto>;

export interface ShipmentDto {
  id: string;
  shipmentNumber: string;
  orderId: string;
  orderNumber: string;
  customer: CreateOrderDto['customer'];
  items: OrderItemDto[];
  courier: string;
  trackingNumber?: string;
  status: ShipmentStatus;
  dispatchDate?: string;
  expectedDeliveryDate?: string;
  deliveredAt?: string;
  packageWeightGrams: number;
  packageCount: number;
  notes?: string;
  createdAt: string;
}

export interface ShippingSummaryDto {
  readyToShip: number;
  inTransit: number;
  delayed: number;
  deliveredWeek: number;
  totalShipments: number;
  shipped: number;
  delivered: number;
}

export interface ShippingListDto {
  items: ShipmentDto[];
  readyOrders: OrderDto[];
  total: number;
  page: number;
  pageSize: number;
  summary: ShippingSummaryDto;
}

export type ReturnResolution = 'Refund' | 'Exchange' | 'Store credit' | 'Reject';

export type ReturnStatus =
  | 'Requested'
  | 'Inspection'
  | 'Refund due'
  | 'Exchange pending'
  | 'Closed'
  | 'Rejected'
  | 'Cancelled';

export type InspectionResult = 'Pending' | 'Sellable' | 'Damaged' | 'Missing item' | 'Rejected';

export interface CreateReturnRequestDto {
  orderId: string;
  reason: string;
  status?: ReturnStatus;
  inspectionResult?: InspectionResult;
  resolution?: ReturnResolution;
  refundAmountInPaise?: number;
  exchangeProductName?: string;
  exchangeSku?: string;
  exchangeAmountInPaise?: number;
  requestedDate?: string;
  inspectedAt?: string;
  closedAt?: string;
  notes?: string;
}

export type UpdateReturnRequestDto = Partial<CreateReturnRequestDto>;

export interface ReturnRequestDto {
  id: string;
  returnNumber: string;
  orderId: string;
  orderNumber: string;
  customer: CreateOrderDto['customer'];
  items: OrderItemDto[];
  reason: string;
  status: ReturnStatus;
  inspectionResult: InspectionResult;
  resolution: ReturnResolution;
  refundAmountInPaise: number;
  exchangeProductName?: string;
  exchangeSku?: string;
  exchangeAmountInPaise: number;
  requestedDate: string;
  inspectedAt?: string;
  closedAt?: string;
  notes?: string;
  createdAt: string;
}

export interface ReturnsSummaryDto {
  returnRequests: number;
  awaitingInspect: number;
  refundDueInPaise: number;
  exchanges: number;
  closed: number;
}

export interface ReturnsListDto {
  items: ReturnRequestDto[];
  orders: OrderDto[];
  total: number;
  page: number;
  pageSize: number;
  summary: ReturnsSummaryDto;
}

export type ExpenseStatus = 'Draft' | 'Approved' | 'Rejected' | 'Cancelled';

export type ExpensePaymentMethod = string;

export type ExpenseCategory = string;

export interface CreateExpenseDto {
  title: string;
  category: ExpenseCategory;
  amountInPaise: number;
  taxAmountInPaise?: number;
  paymentMethod: ExpensePaymentMethod;
  status?: ExpenseStatus;
  expenseDate?: string;
  vendor?: string;
  referenceNumber?: string;
  proofUrl?: string;
  notes?: string;
}

export type UpdateExpenseDto = Partial<CreateExpenseDto>;

export interface ExpenseDto extends CreateExpenseDto {
  id: string;
  status: ExpenseStatus;
  taxAmountInPaise: number;
  totalInPaise: number;
  expenseDate: string;
  createdAt: string;
}

export interface ExpenseSummaryDto {
  monthTotalInPaise: number;
  marketingInPaise: number;
  packagingInPaise: number;
  approved: number;
  totalExpenses: number;
  draft: number;
  rejected: number;
}

export interface ExpenseListDto {
  items: ExpenseDto[];
  total: number;
  page: number;
  pageSize: number;
  summary: ExpenseSummaryDto;
}

export type ReportCategory = 'Sales' | 'Inventory' | 'Finance' | 'GST';

export type ReportPeriod =
  'today' | 'last_7_days' | 'current_month' | 'previous_month' | 'financial_year';

export type ReportStatus = 'Ready' | 'Draft' | 'Failed' | 'Archived';

export type ReportFormat = 'CSV' | 'Excel' | 'PDF';

export interface CreateReportRunDto {
  reportName: string;
  category: ReportCategory;
  period: ReportPeriod;
  formats?: ReportFormat[];
  notes?: string;
}

export type UpdateReportRunDto = Partial<CreateReportRunDto> & {
  status?: ReportStatus;
};

export interface ReportRunDto extends CreateReportRunDto {
  id: string;
  status: ReportStatus;
  formats: ReportFormat[];
  records: number;
  periodLabel: string;
  generatedAt: string;
  createdAt: string;
}

export interface ReportsSummaryDto {
  monthSalesInPaise: number;
  grossProfitInPaise: number;
  expensesInPaise: number;
  netProfitInPaise: number;
  salesReports: number;
  inventoryReports: number;
  financeReports: number;
  gstReports: number;
}

export interface ReportsListDto {
  items: ReportRunDto[];
  total: number;
  page: number;
  pageSize: number;
  summary: ReportsSummaryDto;
}

export type AccountingVoucherType =
  | 'Sales'
  | 'Purchase'
  | 'Receipt'
  | 'Payment'
  | 'Debit Note'
  | 'Credit Note'
  | 'Journal'
  | 'Stock Journal';

export type AccountingExportFormat = 'XML' | 'CSV' | 'Excel' | 'JSON';

export type AccountingExportStatus = 'Validation pending' | 'Generated' | 'Failed' | 'Archived';

export interface CreateLedgerMappingDto {
  sourceType: string;
  sourceValue: string;
  tallyLedgerName: string;
  voucherType: AccountingVoucherType;
  taxLedgerName?: string;
  isActive?: boolean;
  notes?: string;
}

export type UpdateLedgerMappingDto = Partial<CreateLedgerMappingDto>;

export interface LedgerMappingDto extends CreateLedgerMappingDto {
  id: string;
  isActive: boolean;
  createdAt: string;
}

export interface CreateAccountingExportDto {
  fromDate?: string;
  toDate?: string;
  format: AccountingExportFormat;
  voucherType?: 'all' | AccountingVoucherType;
  notes?: string;
}

export type UpdateAccountingExportDto = Partial<CreateAccountingExportDto> & {
  status?: AccountingExportStatus;
};

export interface AccountingExportDto {
  id: string;
  exportNumber: string;
  fromDate: string;
  toDate: string;
  format: AccountingExportFormat;
  voucherType: 'all' | AccountingVoucherType;
  records: number;
  status: AccountingExportStatus;
  fileName?: string;
  notes?: string;
  generatedAt: string;
  createdAt: string;
}

export interface AccountingExportSummaryDto {
  mappedLedgers: number;
  pendingMappings: number;
  exports: number;
  readyRecords: number;
  errors: number;
}

export interface AccountingExportListDto {
  mappings: LedgerMappingDto[];
  exports: AccountingExportDto[];
  total: number;
  page: number;
  pageSize: number;
  summary: AccountingExportSummaryDto;
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
