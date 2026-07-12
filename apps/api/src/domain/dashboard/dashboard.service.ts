import mongoose from 'mongoose';
import type {
  DashboardAttentionItemDto,
  DashboardPeriod,
  DashboardSeriesPointDto,
  DashboardSummaryDto,
} from '@aayu-aura/shared-types';

type Tone = 'maroon' | 'plum' | 'gold' | 'green';

interface DateRange {
  from: Date;
  to: Date;
}

interface CollectionStatus {
  name: string;
  exists: boolean;
}

type MongoDocument = Record<string, unknown>;

const expectedCollections = [
  'orders',
  'payments',
  'products',
  'productvariants',
  'customers',
  'suppliers',
  'expenses',
  'returns',
  'purchases',
  'invoices',
] as const;

const orderTotalFields = [
  'totalInPaise',
  'grandTotalInPaise',
  'totalAmountInPaise',
  'total',
  'grandTotal',
  'totalAmount',
  'amount',
];

const paymentAmountFields = [
  'amountInPaise',
  'paidAmountInPaise',
  'receivedAmountInPaise',
  'amount',
  'paidAmount',
  'receivedAmount',
];

const expenseAmountFields = ['amountInPaise', 'totalInPaise', 'amount', 'total'];
const purchaseAmountFields = [
  'balancePayableInPaise',
  'balancePayable',
  'dueAmountInPaise',
  'dueAmount',
];
const stockFields = ['currentPhysicalStock', 'physicalStock', 'stock', 'quantity'];
const reservedStockFields = ['reservedStock', 'reservedQuantity'];

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function getDateRange(period: DashboardPeriod): DateRange {
  const now = new Date();
  const today = startOfDay(now);

  if (period === 'today') {
    return { from: today, to: addDays(today, 1) };
  }

  if (period === 'yesterday') {
    const yesterday = addDays(today, -1);
    return { from: yesterday, to: today };
  }

  if (period === 'last_7_days') {
    return { from: addDays(today, -6), to: addDays(today, 1) };
  }

  if (period === 'last_30_days') {
    return { from: addDays(today, -29), to: addDays(today, 1) };
  }

  if (period === 'previous_month') {
    const from = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const to = new Date(today.getFullYear(), today.getMonth(), 1);
    return { from, to };
  }

  if (period === 'financial_year') {
    const startYear = today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1;
    return { from: new Date(startYear, 3, 1), to: addDays(today, 1) };
  }

  return {
    from: new Date(today.getFullYear(), today.getMonth(), 1),
    to: addDays(today, 1),
  };
}

function dateMatch(range: DateRange): MongoDocument {
  return {
    $or: [
      { createdAt: { $gte: range.from, $lt: range.to } },
      { orderDate: { $gte: range.from, $lt: range.to } },
      { invoiceDate: { $gte: range.from, $lt: range.to } },
      { paymentDate: { $gte: range.from, $lt: range.to } },
      { expenseDate: { $gte: range.from, $lt: range.to } },
      { purchaseDate: { $gte: range.from, $lt: range.to } },
    ],
  };
}

function formatInr(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Math.round(value));
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Math.round(value));
}

function metric(label: string, value: string, tone: Tone) {
  return { label, value, tone };
}

async function collectionExists(name: string): Promise<boolean> {
  const db = mongoose.connection.db;
  if (!db) {
    return false;
  }

  const matches = await db.listCollections({ name }).toArray();
  return matches.length > 0;
}

async function countDocuments(collectionName: string, filter: MongoDocument = {}): Promise<number> {
  const db = mongoose.connection.db;
  if (!db || !(await collectionExists(collectionName))) {
    return 0;
  }

  return db.collection(collectionName).countDocuments(filter);
}

function numericExpression(field: string): MongoDocument {
  return {
    $convert: {
      input: `$${field}`,
      to: 'double',
      onError: 0,
      onNull: 0,
    },
  };
}

async function sumFields(
  collectionName: string,
  fields: readonly string[],
  filter: MongoDocument = {},
): Promise<number> {
  const db = mongoose.connection.db;
  if (!db || !(await collectionExists(collectionName))) {
    return 0;
  }

  const [result] = await db
    .collection(collectionName)
    .aggregate<{ total: number }>([
      { $match: filter },
      {
        $group: {
          _id: null,
          total: {
            $sum: {
              $add: fields.map((field) => numericExpression(field)),
            },
          },
        },
      },
    ])
    .toArray();

  const total = result?.total ?? 0;
  const hasPaiseField = fields.some((field) => field.toLowerCase().includes('paise'));
  return hasPaiseField ? total / 100 : total;
}

async function groupedCount(
  collectionName: string,
  groupField: string,
  filter: MongoDocument = {},
): Promise<DashboardSeriesPointDto[]> {
  const db = mongoose.connection.db;
  if (!db || !(await collectionExists(collectionName))) {
    return [];
  }

  const rows = await db
    .collection(collectionName)
    .aggregate<{ _id: string | null; count: number }>([
      { $match: filter },
      { $group: { _id: `$${groupField}`, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 8 },
    ])
    .toArray();

  return rows.map((row) => ({
    label: row._id || 'Unknown',
    value: row.count,
  }));
}

async function dailySales(range: DateRange): Promise<DashboardSeriesPointDto[]> {
  const db = mongoose.connection.db;
  if (!db || !(await collectionExists('orders'))) {
    return [];
  }

  const rows = await db
    .collection('orders')
    .aggregate<{ _id: string; total: number }>([
      { $match: dateMatch(range) },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%d %b',
              date: { $ifNull: ['$orderDate', '$createdAt'] },
            },
          },
          total: {
            $sum: {
              $add: orderTotalFields.map((field) => numericExpression(field)),
            },
          },
        },
      },
      { $sort: { _id: 1 } },
    ])
    .toArray();

  return rows.map((row) => ({
    label: row._id,
    value: row.total / 100,
  }));
}

async function collectionStatuses(): Promise<Record<string, boolean>> {
  const statuses = await Promise.all(
    expectedCollections.map(async (name): Promise<CollectionStatus> => ({
      name,
      exists: await collectionExists(name),
    })),
  );

  return Object.fromEntries(statuses.map((status) => [status.name, status.exists]));
}

export async function getDashboardSummary(period: DashboardPeriod): Promise<DashboardSummaryDto> {
  const range = getDateRange(period);
  const currentPeriodFilter = dateMatch(range);
  const todayFilter = dateMatch(getDateRange('today'));

  const [
    todaySales,
    periodSales,
    periodExpenses,
    totalOrders,
    pendingOrders,
    confirmedOrders,
    shippedOrders,
    deliveredOrders,
    cancelledOrders,
    returnRequests,
    totalProducts,
    stockPieces,
    reservedPieces,
    lowStockProducts,
    outOfStockProducts,
    totalCustomers,
    customerPaymentsReceived,
    supplierPayable,
    orderStatus,
    salesByChannel,
    salesSeries,
    statusMap,
  ] = await Promise.all([
    sumFields('orders', orderTotalFields, todayFilter),
    sumFields('orders', orderTotalFields, currentPeriodFilter),
    sumFields('expenses', expenseAmountFields, currentPeriodFilter),
    countDocuments('orders'),
    countDocuments('orders', { status: { $in: ['pending', 'Pending'] } }),
    countDocuments('orders', { status: { $in: ['confirmed', 'Confirmed'] } }),
    countDocuments('orders', { status: { $in: ['shipped', 'Shipped'] } }),
    countDocuments('orders', { status: { $in: ['delivered', 'Delivered'] } }),
    countDocuments('orders', { status: { $in: ['cancelled', 'Cancelled'] } }),
    countDocuments('returns', { status: { $in: ['requested', 'Return requested', 'Pending'] } }),
    countDocuments('products', { status: { $ne: 'archived' } }),
    sumFields('products', stockFields),
    sumFields('products', reservedStockFields),
    countDocuments('products', {
      $expr: {
        $lte: [
          { $ifNull: ['$currentPhysicalStock', { $ifNull: ['$stock', 0] }] },
          { $ifNull: ['$reorderLevel', 5] },
        ],
      },
    }),
    countDocuments('products', {
      $expr: { $lte: [{ $ifNull: ['$currentPhysicalStock', { $ifNull: ['$stock', 0] }] }, 0] },
    }),
    countDocuments('customers', { isActive: { $ne: false } }),
    sumFields('payments', paymentAmountFields, currentPeriodFilter),
    sumFields('purchases', purchaseAmountFields),
    groupedCount('orders', 'status', currentPeriodFilter),
    groupedCount('orders', 'source', currentPeriodFilter),
    dailySales(range),
    collectionStatuses(),
  ]);

  const estimatedProfit = periodSales - periodExpenses;
  const availableStock = Math.max(stockPieces - reservedPieces, 0);
  const customerOutstanding = Math.max(periodSales - customerPaymentsReceived, 0);

  const attentionItems: DashboardAttentionItemDto[] = [
    { label: 'Low stock products', value: formatNumber(lowStockProducts) },
    { label: 'Orders waiting for dispatch', value: formatNumber(confirmedOrders) },
    { label: 'Customer payments due', value: formatInr(customerOutstanding) },
    { label: 'Supplier payments due', value: formatInr(supplierPayable) },
  ];

  return {
    period,
    dateRange: {
      from: range.from.toISOString(),
      to: range.to.toISOString(),
    },
    metrics: [
      metric('Today sales', formatInr(todaySales), 'maroon'),
      metric('Period sales', formatInr(periodSales), 'plum'),
      metric('Estimated profit', formatInr(estimatedProfit), 'gold'),
      metric('Total orders', formatNumber(totalOrders), 'green'),
      metric('Pending orders', formatNumber(pendingOrders), 'maroon'),
      metric('Confirmed orders', formatNumber(confirmedOrders), 'plum'),
      metric('Shipped orders', formatNumber(shippedOrders), 'gold'),
      metric('Delivered orders', formatNumber(deliveredOrders), 'green'),
      metric('Cancelled orders', formatNumber(cancelledOrders), 'maroon'),
      metric('Return requests', formatNumber(returnRequests), 'plum'),
      metric('Total products', formatNumber(totalProducts), 'gold'),
      metric('Available stock', formatNumber(availableStock), 'green'),
      metric('Low stock', formatNumber(lowStockProducts), 'maroon'),
      metric('Out of stock', formatNumber(outOfStockProducts), 'plum'),
      metric('Total customers', formatNumber(totalCustomers), 'gold'),
      metric('Period expenses', formatInr(periodExpenses), 'green'),
    ],
    dailySales: salesSeries,
    orderStatus,
    salesByChannel,
    attentionItems,
    collectionStatus: statusMap,
  };
}
