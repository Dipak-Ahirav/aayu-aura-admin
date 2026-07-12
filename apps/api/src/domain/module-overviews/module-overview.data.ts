import type { ModuleOverviewDto, OperationalModuleSlug } from '@aayu-aura/shared-types';

type ModuleSeed = Omit<ModuleOverviewDto, 'slug' | 'breadcrumb' | 'status'>;

const commonFilters = ['Search', 'Status', 'Date range', 'Saved filters'];

function table(columns: string[], rows: Record<string, string>[]): ModuleOverviewDto['table'] {
  return { columns, rows };
}

function moduleSeed(seed: ModuleSeed): ModuleSeed {
  return seed;
}

const moduleSeeds: Record<OperationalModuleSlug, ModuleSeed> = {
  products: moduleSeed({
    title: 'Products',
    description:
      'Manage saree catalogue, variants, images, pricing, stock visibility, labels, and import/export workflows.',
    metrics: [
      { label: 'Active sarees', value: '486', tone: 'maroon' },
      { label: 'Pieces in stock', value: '1,248', tone: 'plum' },
      { label: 'Low stock', value: '14', tone: 'gold' },
      { label: 'Archived', value: '22', tone: 'green' },
    ],
    actions: [
      {
        label: 'Add product',
        icon: 'add',
        kind: 'primary',
        description: 'Create a saree with pricing, stock, attributes, variants, and images.',
      },
      {
        label: 'Bulk import',
        icon: 'upload_file',
        kind: 'secondary',
        description: 'Prepare CSV or Excel import for catalogue updates.',
      },
    ],
    tabs: [
      { label: 'All products', count: 508 },
      { label: 'Low stock', count: 14 },
      { label: 'Drafts', count: 9 },
      { label: 'Archived', count: 22 },
    ],
    filters: [...commonFilters, 'Category', 'Fabric', 'Colour', 'Collection'],
    table: table(
      ['Product', 'SKU', 'Category', 'Stock', 'Selling price', 'Status'],
      [
        {
          Product: 'Banarasi Silk Saree',
          SKU: 'AA-BAN-001',
          Category: 'Banarasi',
          Stock: '12',
          'Selling price': 'Rs 8,499',
          Status: 'Active',
        },
        {
          Product: 'Linen Cotton Saree',
          SKU: 'AA-LIN-014',
          Category: 'Daily Wear',
          Stock: '4',
          'Selling price': 'Rs 2,199',
          Status: 'Low stock',
        },
      ],
    ),
    workflowSteps: [
      'Add basic details',
      'Attach attributes',
      'Set pricing',
      'Upload images',
      'Publish',
    ],
    apiRoutes: ['/api/v1/products', '/api/v1/product-variants', '/api/v1/categories'],
  }),
  'master-data': moduleSeed({
    title: 'Master Data',
    description:
      'Configure categories, saree types, fabrics, colours, GST rates, warehouses, payment methods, and order sources.',
    metrics: [
      { label: 'Masters', value: '18', tone: 'maroon' },
      { label: 'Active values', value: '214', tone: 'plum' },
      { label: 'Inactive values', value: '17', tone: 'gold' },
      { label: 'Protected values', value: '96', tone: 'green' },
    ],
    actions: [
      {
        label: 'Add master value',
        icon: 'playlist_add',
        kind: 'primary',
        description: 'Create a reusable catalogue, order, tax, or inventory setting.',
      },
      {
        label: 'Reorder values',
        icon: 'swap_vert',
        kind: 'secondary',
        description: 'Adjust display order without deleting used records.',
      },
    ],
    tabs: [
      { label: 'Catalogue', count: 10 },
      { label: 'Inventory', count: 3 },
      { label: 'Finance', count: 3 },
      { label: 'Order setup', count: 2 },
    ],
    filters: [...commonFilters, 'Master type'],
    table: table(
      ['Master', 'Values', 'Used by records', 'Status'],
      [
        { Master: 'Saree types', Values: '18', 'Used by records': '428', Status: 'Active' },
        { Master: 'GST rates', Values: '5', 'Used by records': '201', Status: 'Protected' },
      ],
    ),
    workflowSteps: ['Create', 'Activate', 'Reorder', 'Prevent used deletion'],
    apiRoutes: ['/api/v1/master-data', '/api/v1/categories', '/api/v1/settings'],
  }),
  suppliers: moduleSeed({
    title: 'Suppliers',
    description:
      'Manage supplier profiles, GST details, payment terms, ledgers, purchase history, and outstanding balances.',
    metrics: [
      { label: 'Active suppliers', value: '38', tone: 'maroon' },
      { label: 'Payable', value: 'Rs 1,18,400', tone: 'plum' },
      { label: 'Due this week', value: '6', tone: 'gold' },
      { label: 'GST verified', value: '29', tone: 'green' },
    ],
    actions: [
      {
        label: 'Add supplier',
        icon: 'person_add',
        kind: 'primary',
        description: 'Create supplier profile with GST, address, bank, and payment terms.',
      },
      {
        label: 'Export statement',
        icon: 'download',
        kind: 'secondary',
        description: 'Download supplier ledger statement.',
      },
    ],
    tabs: [
      { label: 'All suppliers', count: 38 },
      { label: 'Outstanding', count: 11 },
      { label: 'Inactive', count: 3 },
    ],
    filters: [...commonFilters, 'State', 'Payment due'],
    table: table(
      ['Supplier', 'GSTIN', 'Payable', 'Credit days', 'Status'],
      [
        {
          Supplier: 'Shree Silk Traders',
          GSTIN: '24ABCDE1234F1Z5',
          Payable: 'Rs 48,400',
          'Credit days': '30',
          Status: 'Active',
        },
        {
          Supplier: 'Aura Handloom House',
          GSTIN: '27ABCDE1234F1Z2',
          Payable: 'Rs 70,000',
          'Credit days': '15',
          Status: 'Payment due',
        },
      ],
    ),
    workflowSteps: ['Create profile', 'Record purchases', 'Track payable', 'Export ledger'],
    apiRoutes: ['/api/v1/suppliers', '/api/v1/supplier-payments'],
  }),
  purchases: moduleSeed({
    title: 'Purchases',
    description:
      'Record supplier purchases, partial receipts, supplier invoices, stock updates, debit notes, and payable balances.',
    metrics: [
      { label: 'This month', value: 'Rs 3,42,000', tone: 'maroon' },
      { label: 'Pending receipt', value: '7', tone: 'plum' },
      { label: 'Drafts', value: '4', tone: 'gold' },
      { label: 'Received', value: '31', tone: 'green' },
    ],
    actions: [
      {
        label: 'Create purchase',
        icon: 'add_shopping_cart',
        kind: 'primary',
        description: 'Create a supplier purchase and prepare stock receipt.',
      },
      {
        label: 'Receive stock',
        icon: 'inventory',
        kind: 'secondary',
        description: 'Post receipt with stock ledger transaction.',
      },
    ],
    tabs: [
      { label: 'All purchases', count: 42 },
      { label: 'Draft', count: 4 },
      { label: 'Ordered', count: 7 },
      { label: 'Received', count: 31 },
    ],
    filters: [...commonFilters, 'Supplier', 'Purchase status'],
    table: table(
      ['Purchase no', 'Supplier', 'Amount', 'Paid', 'Status'],
      [
        {
          'Purchase no': 'PUR-00041',
          Supplier: 'Shree Silk Traders',
          Amount: 'Rs 84,000',
          Paid: 'Rs 40,000',
          Status: 'Partially received',
        },
        {
          'Purchase no': 'PUR-00042',
          Supplier: 'Aura Handloom House',
          Amount: 'Rs 58,500',
          Paid: 'Rs 58,500',
          Status: 'Received',
        },
      ],
    ),
    workflowSteps: ['Draft purchase', 'Receive stock', 'Update payable', 'Audit stock ledger'],
    apiRoutes: ['/api/v1/purchases', '/api/v1/stock-transactions', '/api/v1/supplier-payments'],
  }),
  inventory: moduleSeed({
    title: 'Inventory',
    description:
      'Monitor physical, reserved, available, damaged, returned, and low-stock quantities with immutable stock movements.',
    metrics: [
      { label: 'Available stock', value: '1,176', tone: 'maroon' },
      { label: 'Reserved stock', value: '72', tone: 'plum' },
      { label: 'Damaged stock', value: '8', tone: 'gold' },
      { label: 'Movements today', value: '19', tone: 'green' },
    ],
    actions: [
      {
        label: 'Stock adjustment',
        icon: 'tune',
        kind: 'primary',
        description: 'Create an audited manual stock movement.',
      },
      {
        label: 'Low stock report',
        icon: 'warning',
        kind: 'secondary',
        description: 'Review reorder candidates.',
      },
    ],
    tabs: [
      { label: 'Stock summary', count: 486 },
      { label: 'Low stock', count: 14 },
      { label: 'Transactions', count: 182 },
      { label: 'Reservations', count: 23 },
    ],
    filters: [...commonFilters, 'Warehouse', 'Stock status'],
    table: table(
      ['SKU', 'Physical', 'Reserved', 'Available', 'Status'],
      [
        { SKU: 'AA-BAN-001', Physical: '12', Reserved: '2', Available: '10', Status: 'In stock' },
        { SKU: 'AA-LIN-014', Physical: '4', Reserved: '1', Available: '3', Status: 'Low stock' },
      ],
    ),
    workflowSteps: ['Reserve on confirm', 'Deduct on shipment', 'Return to stock after inspection'],
    apiRoutes: ['/api/v1/inventory', '/api/v1/stock-transactions', '/api/v1/stock-reservations'],
  }),
  customers: moduleSeed({
    title: 'Customers',
    description:
      'Manage customer profiles, addresses, consent, order history, invoices, payments, returns, and ledgers.',
    metrics: [
      { label: 'Total customers', value: '814', tone: 'maroon' },
      { label: 'New this month', value: '42', tone: 'plum' },
      { label: 'Outstanding', value: 'Rs 42,800', tone: 'gold' },
      { label: 'Repeat buyers', value: '218', tone: 'green' },
    ],
    actions: [
      {
        label: 'Add customer',
        icon: 'person_add',
        kind: 'primary',
        description: 'Create customer with address and communication consent.',
      },
      {
        label: 'Find duplicates',
        icon: 'manage_search',
        kind: 'secondary',
        description: 'Detect duplicate mobile or email records.',
      },
    ],
    tabs: [
      { label: 'All customers', count: 814 },
      { label: 'Outstanding', count: 21 },
      { label: 'Repeat', count: 218 },
    ],
    filters: [...commonFilters, 'Source', 'Customer type', 'Consent'],
    table: table(
      ['Customer', 'Mobile', 'Lifetime value', 'Outstanding', 'Last purchase'],
      [
        {
          Customer: 'Priya Shah',
          Mobile: '+91 98765 43210',
          'Lifetime value': 'Rs 28,400',
          Outstanding: 'Rs 0',
          'Last purchase': '2026-07-08',
        },
        {
          Customer: 'Neha Patel',
          Mobile: '+91 98765 43000',
          'Lifetime value': 'Rs 12,900',
          Outstanding: 'Rs 3,500',
          'Last purchase': '2026-07-04',
        },
      ],
    ),
    workflowSteps: ['Create profile', 'Add addresses', 'Capture consent', 'Track ledger'],
    apiRoutes: ['/api/v1/customers', '/api/v1/customer-addresses'],
  }),
  orders: moduleSeed({
    title: 'Orders',
    description:
      'Create manual orders, reserve stock, capture payments, generate invoices, manage shipment, returns, and exchanges.',
    metrics: [
      { label: 'Total orders', value: '1,246', tone: 'maroon' },
      { label: 'Pending', value: '23', tone: 'plum' },
      { label: 'Ready to ship', value: '8', tone: 'gold' },
      { label: 'Delivered', value: '1,084', tone: 'green' },
    ],
    actions: [
      {
        label: 'Create order',
        icon: 'add',
        kind: 'primary',
        description: 'Create order with customer, items, totals, and notes.',
      },
      {
        label: 'Generate invoice',
        icon: 'receipt',
        kind: 'secondary',
        description: 'Create invoice from confirmed order.',
      },
    ],
    tabs: [
      { label: 'All orders', count: 1246 },
      { label: 'Pending', count: 23 },
      { label: 'Packed', count: 12 },
      { label: 'Shipped', count: 19 },
      { label: 'Returns', count: 5 },
    ],
    filters: [...commonFilters, 'Order source', 'Payment status', 'Fulfilment status'],
    table: table(
      ['Order no', 'Customer', 'Total', 'Payment', 'Fulfilment'],
      [
        {
          'Order no': 'ORD-01084',
          Customer: 'Priya Shah',
          Total: 'Rs 8,499',
          Payment: 'Paid',
          Fulfilment: 'Ready to ship',
        },
        {
          'Order no': 'ORD-01085',
          Customer: 'Neha Patel',
          Total: 'Rs 4,299',
          Payment: 'Partial',
          Fulfilment: 'Confirmed',
        },
      ],
    ),
    workflowSteps: ['Draft', 'Confirm and reserve', 'Invoice', 'Ship and deduct stock', 'Close'],
    apiRoutes: ['/api/v1/orders', '/api/v1/order-items', '/api/v1/stock-reservations'],
  }),
  payments: moduleSeed({
    title: 'Payments',
    description:
      'Record customer receipts, supplier payments, partial allocations, refunds, proof uploads, and reconciliation.',
    metrics: [
      { label: 'Received today', value: 'Rs 28,400', tone: 'maroon' },
      { label: 'Customer due', value: 'Rs 42,800', tone: 'plum' },
      { label: 'Supplier due', value: 'Rs 1,18,400', tone: 'gold' },
      { label: 'Pending verify', value: '3', tone: 'green' },
    ],
    actions: [
      {
        label: 'Record payment',
        icon: 'payments',
        kind: 'primary',
        description: 'Record receipt or supplier payment with allocation.',
      },
      {
        label: 'Reconcile',
        icon: 'fact_check',
        kind: 'secondary',
        description: 'Review pending verification and daily cash summary.',
      },
    ],
    tabs: [
      { label: 'Receipts', count: 64 },
      { label: 'Supplier payments', count: 18 },
      { label: 'Refunds', count: 4 },
      { label: 'Pending verification', count: 3 },
    ],
    filters: [...commonFilters, 'Payment method', 'Payment status'],
    table: table(
      ['Reference', 'Party', 'Method', 'Amount', 'Status'],
      [
        {
          Reference: 'PAY-0088',
          Party: 'Priya Shah',
          Method: 'UPI',
          Amount: 'Rs 8,499',
          Status: 'Paid',
        },
        {
          Reference: 'PAY-0089',
          Party: 'Shree Silk Traders',
          Method: 'Bank transfer',
          Amount: 'Rs 40,000',
          Status: 'Recorded',
        },
      ],
    ),
    workflowSteps: ['Record', 'Allocate', 'Verify', 'Reconcile', 'Audit'],
    apiRoutes: ['/api/v1/payments', '/api/v1/refunds'],
  }),
  invoices: moduleSeed({
    title: 'Invoices',
    description:
      'Generate GST-ready invoices, quotations, receipts, credit notes, debit notes, PDFs, email, and WhatsApp shares.',
    metrics: [
      { label: 'This month', value: '142', tone: 'maroon' },
      { label: 'Finalised', value: '129', tone: 'plum' },
      { label: 'Due amount', value: 'Rs 36,200', tone: 'gold' },
      { label: 'Shared', value: '96', tone: 'green' },
    ],
    actions: [
      {
        label: 'Create invoice',
        icon: 'description',
        kind: 'primary',
        description: 'Create tax invoice, retail invoice, quotation, or receipt.',
      },
      {
        label: 'Send invoice',
        icon: 'send',
        kind: 'secondary',
        description: 'Email or WhatsApp invoice link.',
      },
    ],
    tabs: [
      { label: 'All documents', count: 142 },
      { label: 'Draft', count: 13 },
      { label: 'Finalised', count: 129 },
      { label: 'Credit notes', count: 4 },
    ],
    filters: [...commonFilters, 'Document type', 'Payment status'],
    table: table(
      ['Invoice no', 'Customer', 'Grand total', 'Paid', 'Status'],
      [
        {
          'Invoice no': 'AA/2026-27/000001',
          Customer: 'Priya Shah',
          'Grand total': 'Rs 8,499',
          Paid: 'Rs 8,499',
          Status: 'Finalised',
        },
        {
          'Invoice no': 'AA/2026-27/000002',
          Customer: 'Neha Patel',
          'Grand total': 'Rs 4,299',
          Paid: 'Rs 799',
          Status: 'Partially paid',
        },
      ],
    ),
    workflowSteps: ['Preview', 'Finalise', 'Generate PDF', 'Send', 'Lock corrections'],
    apiRoutes: ['/api/v1/invoices', '/api/v1/communications'],
  }),
  shipping: moduleSeed({
    title: 'Shipping',
    description:
      'Manage courier providers, tracking, dispatch dates, delivery status, packing slips, and shipment history.',
    metrics: [
      { label: 'Ready to ship', value: '8', tone: 'maroon' },
      { label: 'In transit', value: '19', tone: 'plum' },
      { label: 'Delayed', value: '2', tone: 'gold' },
      { label: 'Delivered week', value: '47', tone: 'green' },
    ],
    actions: [
      {
        label: 'Add shipment',
        icon: 'local_shipping',
        kind: 'primary',
        description: 'Assign courier, tracking number, and expected delivery.',
      },
      {
        label: 'Packing slip',
        icon: 'print',
        kind: 'secondary',
        description: 'Generate printable packing slip.',
      },
    ],
    tabs: [
      { label: 'Ready', count: 8 },
      { label: 'Shipped', count: 19 },
      { label: 'Delivered', count: 47 },
      { label: 'Delayed', count: 2 },
    ],
    filters: [...commonFilters, 'Courier', 'Shipment status'],
    table: table(
      ['Order no', 'Courier', 'Tracking', 'Status', 'Expected'],
      [
        {
          'Order no': 'ORD-01084',
          Courier: 'Delhivery',
          Tracking: 'DLV123456',
          Status: 'Ready',
          Expected: '2026-07-14',
        },
        {
          'Order no': 'ORD-01075',
          Courier: 'Bluedart',
          Tracking: 'BD98765',
          Status: 'In transit',
          Expected: '2026-07-13',
        },
      ],
    ),
    workflowSteps: ['Pack', 'Create shipment', 'Deduct stock', 'Track delivery'],
    apiRoutes: ['/api/v1/shipments', '/api/v1/orders'],
  }),
  returns: moduleSeed({
    title: 'Returns & Exchanges',
    description:
      'Process return requests, inspections, exchange orders, refunds, credit notes, and return-to-stock decisions.',
    metrics: [
      { label: 'Return requests', value: '5', tone: 'maroon' },
      { label: 'Awaiting inspect', value: '3', tone: 'plum' },
      { label: 'Refund due', value: 'Rs 6,800', tone: 'gold' },
      { label: 'Exchanges', value: '2', tone: 'green' },
    ],
    actions: [
      {
        label: 'Process return',
        icon: 'assignment_return',
        kind: 'primary',
        description: 'Inspect returned item and choose sellable, damaged, or refund flow.',
      },
      {
        label: 'Create exchange',
        icon: 'sync_alt',
        kind: 'secondary',
        description: 'Exchange product with stock and payment adjustment.',
      },
    ],
    tabs: [
      { label: 'Requests', count: 5 },
      { label: 'Inspection', count: 3 },
      { label: 'Refunds', count: 2 },
      { label: 'Closed', count: 18 },
    ],
    filters: [...commonFilters, 'Return status', 'Inspection result'],
    table: table(
      ['Return no', 'Order no', 'Customer', 'Amount', 'Status'],
      [
        {
          'Return no': 'RET-0005',
          'Order no': 'ORD-01072',
          Customer: 'Isha Mehta',
          Amount: 'Rs 3,400',
          Status: 'Inspection',
        },
        {
          'Return no': 'RET-0006',
          'Order no': 'ORD-01080',
          Customer: 'Priya Shah',
          Amount: 'Rs 3,400',
          Status: 'Refund due',
        },
      ],
    ),
    workflowSteps: ['Request', 'Inspect', 'Restock or mark damaged', 'Refund or exchange', 'Audit'],
    apiRoutes: ['/api/v1/returns', '/api/v1/exchanges', '/api/v1/refunds'],
  }),
  expenses: moduleSeed({
    title: 'Expenses',
    description:
      'Record operating expenses, categories, payment proof, monthly totals, and profit and loss inputs.',
    metrics: [
      { label: 'This month', value: 'Rs 86,200', tone: 'maroon' },
      { label: 'Marketing', value: 'Rs 22,000', tone: 'plum' },
      { label: 'Packaging', value: 'Rs 14,500', tone: 'gold' },
      { label: 'Approved', value: '31', tone: 'green' },
    ],
    actions: [
      {
        label: 'Add expense',
        icon: 'add_card',
        kind: 'primary',
        description: 'Record expense with category, proof, tax, and payment method.',
      },
      {
        label: 'Export expenses',
        icon: 'download',
        kind: 'secondary',
        description: 'Download expense details for accounting review.',
      },
    ],
    tabs: [
      { label: 'All expenses', count: 38 },
      { label: 'Draft', count: 3 },
      { label: 'Approved', count: 31 },
      { label: 'Rejected', count: 4 },
    ],
    filters: [...commonFilters, 'Expense category', 'Payment method'],
    table: table(
      ['Expense', 'Category', 'Amount', 'Method', 'Status'],
      [
        {
          Expense: 'Instagram ads',
          Category: 'Marketing',
          Amount: 'Rs 12,000',
          Method: 'Card',
          Status: 'Approved',
        },
        {
          Expense: 'Saree boxes',
          Category: 'Packaging',
          Amount: 'Rs 8,500',
          Method: 'UPI',
          Status: 'Draft',
        },
      ],
    ),
    workflowSteps: ['Record', 'Attach proof', 'Approve', 'Report in P&L'],
    apiRoutes: ['/api/v1/expenses', '/api/v1/expense-categories'],
  }),
  reports: moduleSeed({
    title: 'Reports',
    description:
      'View dashboard analytics, monthly sales, profit and loss, GST, inventory, purchases, customers, and exports.',
    metrics: [
      { label: 'Month sales', value: 'Rs 7,82,900', tone: 'maroon' },
      { label: 'Gross profit', value: 'Rs 1,86,250', tone: 'plum' },
      { label: 'Expenses', value: 'Rs 86,200', tone: 'gold' },
      { label: 'Net profit', value: 'Rs 1,00,050', tone: 'green' },
    ],
    actions: [
      {
        label: 'Run report',
        icon: 'analytics',
        kind: 'primary',
        description: 'Generate report for a selected period.',
      },
      {
        label: 'Export Excel',
        icon: 'table_view',
        kind: 'secondary',
        description: 'Download report output.',
      },
    ],
    tabs: [
      { label: 'Sales', count: 8 },
      { label: 'Inventory', count: 4 },
      { label: 'Finance', count: 7 },
      { label: 'GST', count: 3 },
    ],
    filters: ['Today', 'Last 7 days', 'Current month', 'Financial year', 'Custom range'],
    table: table(
      ['Report', 'Period', 'Records', 'Export formats', 'Status'],
      [
        {
          Report: 'Monthly business report',
          Period: 'July 2026',
          Records: '142',
          'Export formats': 'PDF, Excel',
          Status: 'Ready',
        },
        {
          Report: 'GST summary',
          Period: 'Q1 FY 2026-27',
          Records: '129',
          'Export formats': 'PDF, Excel',
          Status: 'Draft',
        },
      ],
    ),
    workflowSteps: ['Choose report', 'Select period', 'Preview', 'Export or email'],
    apiRoutes: ['/api/v1/reports'],
  }),
  'accounting-exports': moduleSeed({
    title: 'Tally Export',
    description:
      'Map ledgers and export sales, purchases, receipts, payments, notes, expenses, and inventory movements for Tally.',
    metrics: [
      { label: 'Mapped ledgers', value: '24', tone: 'maroon' },
      { label: 'Pending mappings', value: '5', tone: 'plum' },
      { label: 'Exports', value: '12', tone: 'gold' },
      { label: 'Ready records', value: '348', tone: 'green' },
    ],
    actions: [
      {
        label: 'Generate export',
        icon: 'ios_share',
        kind: 'primary',
        description: 'Validate mappings and generate XML, JSON, CSV, or Excel.',
      },
      {
        label: 'Map ledgers',
        icon: 'account_tree',
        kind: 'secondary',
        description: 'Map app values to Tally ledgers and voucher types.',
      },
    ],
    tabs: [
      { label: 'Mappings', count: 29 },
      { label: 'Ready', count: 348 },
      { label: 'Export history', count: 12 },
      { label: 'Errors', count: 5 },
    ],
    filters: [...commonFilters, 'Voucher type', 'Export status'],
    table: table(
      ['Export ID', 'Range', 'Format', 'Records', 'Status'],
      [
        {
          'Export ID': 'EXP-0012',
          Range: '2026-07-01 to 2026-07-12',
          Format: 'XML',
          Records: '96',
          Status: 'Generated',
        },
        {
          'Export ID': 'EXP-0013',
          Range: '2026-07-01 to 2026-07-12',
          Format: 'Excel',
          Records: '348',
          Status: 'Validation pending',
        },
      ],
    ),
    workflowSteps: ['Select date range', 'Validate mappings', 'Generate file', 'Save history'],
    apiRoutes: ['/api/v1/accounting-exports', '/api/v1/accounting-mappings'],
  }),
  users: moduleSeed({
    title: 'Users & Permissions',
    description:
      'Manage admin users, roles, permissions, activation, deactivation, and access controls.',
    metrics: [
      { label: 'Active users', value: '6', tone: 'maroon' },
      { label: 'Roles', value: '6', tone: 'plum' },
      { label: 'Inactive', value: '1', tone: 'gold' },
      { label: 'Owner', value: '1', tone: 'green' },
    ],
    actions: [
      {
        label: 'Invite user',
        icon: 'person_add',
        kind: 'primary',
        description: 'Create admin user with role-based permissions.',
      },
      {
        label: 'Review permissions',
        icon: 'admin_panel_settings',
        kind: 'secondary',
        description: 'Audit module access by role.',
      },
    ],
    tabs: [
      { label: 'Users', count: 7 },
      { label: 'Roles', count: 6 },
      { label: 'Permissions', count: 15 },
      { label: 'Inactive', count: 1 },
    ],
    filters: [...commonFilters, 'Role', 'Active status'],
    table: table(
      ['Name', 'Email', 'Role', 'Status', 'Last login'],
      [
        {
          Name: 'Aayu & Aura Owner',
          Email: 'owner@aayuaura.local',
          Role: 'Owner',
          Status: 'Active',
          'Last login': 'Today',
        },
        {
          Name: 'Accountant',
          Email: 'accountant@aayuaura.local',
          Role: 'Accountant',
          Status: 'Planned',
          'Last login': '-',
        },
      ],
    ),
    workflowSteps: ['Create user', 'Assign role', 'Activate', 'Audit role changes'],
    apiRoutes: ['/api/v1/users', '/api/v1/roles'],
  }),
  'audit-logs': moduleSeed({
    title: 'Audit Logs',
    description:
      'Review immutable history for login, stock changes, invoices, payments, settings, exports, and role changes.',
    metrics: [
      { label: 'Events today', value: '42', tone: 'maroon' },
      { label: 'Security', value: '8', tone: 'plum' },
      { label: 'Inventory', value: '19', tone: 'gold' },
      { label: 'Finance', value: '15', tone: 'green' },
    ],
    actions: [
      {
        label: 'Export audit',
        icon: 'download',
        kind: 'primary',
        description: 'Export filtered audit history for review.',
      },
      {
        label: 'Review changes',
        icon: 'history',
        kind: 'secondary',
        description: 'Inspect previous and new values for critical records.',
      },
    ],
    tabs: [
      { label: 'All events', count: 420 },
      { label: 'Security', count: 82 },
      { label: 'Inventory', count: 122 },
      { label: 'Finance', count: 216 },
    ],
    filters: [...commonFilters, 'Module', 'Action', 'User'],
    table: table(
      ['Timestamp', 'User', 'Module', 'Action', 'Entity'],
      [
        {
          Timestamp: '2026-07-12 08:14',
          User: 'Owner',
          Module: 'Auth',
          Action: 'Login',
          Entity: 'User',
        },
        {
          Timestamp: '2026-07-12 08:11',
          User: 'Owner',
          Module: 'Users',
          Action: 'Seed owner',
          Entity: 'User',
        },
      ],
    ),
    workflowSteps: ['Capture action', 'Store immutable event', 'Filter', 'Export'],
    apiRoutes: ['/api/v1/audit-logs'],
  }),
  settings: moduleSeed({
    title: 'Settings',
    description:
      'Configure business profile, billing, inventory rules, communication providers, and backup controls.',
    metrics: [
      { label: 'Business profile', value: 'Draft', tone: 'maroon' },
      { label: 'GST', value: 'Off', tone: 'plum' },
      { label: 'WhatsApp', value: 'Click link', tone: 'gold' },
      { label: 'Email', value: 'Pending', tone: 'green' },
    ],
    actions: [
      {
        label: 'Update profile',
        icon: 'storefront',
        kind: 'primary',
        description: 'Set legal details, contact, logo, GSTIN, and invoice identity.',
      },
      {
        label: 'Backup data',
        icon: 'backup',
        kind: 'secondary',
        description: 'Prepare export and restore controls.',
      },
    ],
    tabs: [
      { label: 'Business', count: 1 },
      { label: 'Billing', count: 1 },
      { label: 'Inventory', count: 1 },
      { label: 'Communication', count: 1 },
      { label: 'Data', count: 1 },
    ],
    filters: ['Settings section', 'Configured status'],
    table: table(
      ['Section', 'Configured', 'Critical', 'Status'],
      [
        {
          Section: 'Business profile',
          Configured: 'Partial',
          Critical: 'Yes',
          Status: 'Needs review',
        },
        {
          Section: 'Invoice numbering',
          Configured: 'Default',
          Critical: 'Yes',
          Status: 'Ready for review',
        },
      ],
    ),
    workflowSteps: ['Profile', 'Billing', 'Inventory', 'Communication', 'Data safety'],
    apiRoutes: ['/api/v1/settings/business', '/api/v1/settings'],
  }),
};

export function getModuleOverview(slug: OperationalModuleSlug): ModuleOverviewDto {
  const seed = moduleSeeds[slug];

  return {
    slug,
    breadcrumb: `Home / ${seed.title}`,
    status: 'foundation',
    ...seed,
  };
}

export const operationalModuleSlugs = Object.keys(moduleSeeds) as OperationalModuleSlug[];
