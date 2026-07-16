import type { MasterDataDto, MasterDataType } from '@aayu-aura/shared-types';

export interface MasterDefinition {
  type: MasterDataType;
  master: string;
  usedIn: string;
  fallbackValues: string[];
}

export const MASTER_DEFINITIONS: MasterDefinition[] = [
  {
    type: 'Catalogue',
    master: 'Product Category',
    usedIn: 'Products / Category',
    fallbackValues: [],
  },
  {
    type: 'Catalogue',
    master: 'Product Status',
    usedIn: 'Products / Status',
    fallbackValues: ['active', 'draft', 'archived'],
  },
  {
    type: 'Order setup',
    master: 'Order Source',
    usedIn: 'Orders / Order source',
    fallbackValues: [
      'Admin',
      'WhatsApp',
      'Instagram',
      'Facebook',
      'Phone',
      'Offline',
      'Marketplace',
      'Referral',
    ],
  },
  {
    type: 'Order setup',
    master: 'Customer Source',
    usedIn: 'Customers / Source',
    fallbackValues: [
      'Admin',
      'WhatsApp',
      'Instagram',
      'Facebook',
      'Phone',
      'Offline',
      'Marketplace',
      'Referral',
    ],
  },
  {
    type: 'Order setup',
    master: 'Customer Type',
    usedIn: 'Customers / Customer type',
    fallbackValues: ['Retail', 'Wholesale', 'VIP'],
  },
  {
    type: 'Finance',
    master: 'Payment Direction',
    usedIn: 'Payments / Direction',
    fallbackValues: ['Customer receipt', 'Supplier payment', 'Refund'],
  },
  {
    type: 'Finance',
    master: 'Payment Method',
    usedIn: 'Payments / Method',
    fallbackValues: ['UPI', 'Cash', 'Card', 'Bank transfer', 'Cheque', 'Wallet', 'Other'],
  },
  {
    type: 'Finance',
    master: 'Invoice Type',
    usedIn: 'Invoices / Invoice type',
    fallbackValues: [
      'Tax invoice',
      'Retail invoice',
      'Proforma invoice',
      'Quotation',
      'Payment receipt',
    ],
  },
  {
    type: 'Inventory',
    master: 'Warehouse',
    usedIn: 'Inventory / Warehouse',
    fallbackValues: [],
  },
  {
    type: 'Inventory',
    master: 'Stock Movement Reason',
    usedIn: 'Inventory / Stock movement reason',
    fallbackValues: [],
  },
  {
    type: 'Inventory',
    master: 'Damage Reason',
    usedIn: 'Inventory / Damage reason',
    fallbackValues: [],
  },
  {
    type: 'Inventory',
    master: 'Return Reason',
    usedIn: 'Inventory / Return reason',
    fallbackValues: [],
  },
];

export function mastersForType(type: MasterDataType): MasterDefinition[] {
  return MASTER_DEFINITIONS.filter((definition) => definition.type === type);
}

export function fallbackValuesForMaster(master: string): string[] {
  return (
    MASTER_DEFINITIONS.find((definition) => definition.master === master)?.fallbackValues ?? []
  );
}

export function masterValues(
  items: readonly MasterDataDto[],
  master: string,
  fallbackValues: readonly string[] = fallbackValuesForMaster(master),
): string[] {
  const activeValues = items
    .filter((item) => item.status === 'active' && item.master === master)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.value.localeCompare(b.value))
    .map((item) => item.value.trim())
    .filter(Boolean);

  return [...new Set([...activeValues, ...fallbackValues])];
}
