import type { PermissionDto, PermissionResource, UserRole } from '@aayu-aura/shared-types';

const allResources = [
  'dashboard',
  'products',
  'master_data',
  'suppliers',
  'purchases',
  'customers',
  'orders',
  'payments',
  'invoices',
  'inventory',
  'reports',
  'accounting_exports',
  'settings',
  'users',
  'audit_logs',
] as const satisfies readonly PermissionResource[];

function grant(
  resources: readonly PermissionResource[],
  actions: PermissionDto['actions'],
): PermissionDto[] {
  return resources.map((resource) => ({ resource, actions }));
}

export const permissionsByRole: Record<UserRole, PermissionDto[]> = {
  owner: allResources.map((resource) => ({
    resource,
    actions: ['create', 'read', 'update', 'delete', 'export', 'approve'],
  })),
  administrator: allResources.map((resource) => ({
    resource,
    actions:
      resource === 'users' ? ['create', 'read', 'update'] : ['create', 'read', 'update', 'export'],
  })),
  accountant: grant(
    ['dashboard', 'purchases', 'payments', 'invoices', 'reports', 'accounting_exports'],
    ['create', 'read', 'update', 'export'],
  ),
  inventory_manager: grant(
    ['dashboard', 'products', 'master_data', 'suppliers', 'purchases', 'inventory'],
    ['create', 'read', 'update', 'export'],
  ),
  order_manager: grant(
    ['dashboard', 'customers', 'orders', 'invoices', 'payments'],
    ['create', 'read', 'update', 'export'],
  ),
  viewer: allResources.map((resource) => ({ resource, actions: ['read'] })),
};
