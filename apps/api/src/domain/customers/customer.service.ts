import { Types, type SortOrder } from 'mongoose';
import type { CustomerDto, CustomerListDto, CustomerSummaryDto } from '@aayu-aura/shared-types';
import { OrderModel } from '../orders/order.model.js';
import { AppError } from '../../infrastructure/http/app-error.js';
import { CustomerModel, type CustomerDocument } from './customer.model.js';
import type {
  CreateCustomerInput,
  CustomerQueryInput,
  UpdateCustomerInput,
} from './customer.schemas.js';

interface CustomerStats {
  lifetimeValueInPaise: number;
  outstandingInPaise: number;
  orderCount: number;
  lastPurchaseAt?: Date;
}

function cleanEmpty(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function normalizeMobile(value: string): string {
  return value.trim();
}

function toPayload(input: CreateCustomerInput | UpdateCustomerInput) {
  return {
    ...(input.name !== undefined ? { name: input.name.trim() } : {}),
    ...(input.mobile !== undefined ? { mobile: normalizeMobile(input.mobile) } : {}),
    ...(input.email !== undefined ? { email: cleanEmpty(input.email) } : {}),
    ...(input.billingAddress !== undefined
      ? { billingAddress: cleanEmpty(input.billingAddress) }
      : {}),
    ...(input.shippingAddress !== undefined
      ? { shippingAddress: cleanEmpty(input.shippingAddress) }
      : {}),
    ...(input.state !== undefined ? { state: cleanEmpty(input.state) } : {}),
    ...(input.stateCode !== undefined ? { stateCode: cleanEmpty(input.stateCode) } : {}),
    ...(input.source !== undefined ? { source: input.source } : {}),
    ...(input.customerType !== undefined ? { customerType: input.customerType } : {}),
    ...(input.consentWhatsApp !== undefined ? { consentWhatsApp: input.consentWhatsApp } : {}),
    ...(input.consentEmail !== undefined ? { consentEmail: input.consentEmail } : {}),
    ...(input.internalNotes !== undefined
      ? { internalNotes: cleanEmpty(input.internalNotes) }
      : {}),
    ...('isActive' in input && input.isActive !== undefined ? { isActive: input.isActive } : {}),
  };
}

function toDto(
  customer: CustomerDocument & { _id: Types.ObjectId },
  stats: CustomerStats = { lifetimeValueInPaise: 0, outstandingInPaise: 0, orderCount: 0 },
): CustomerDto {
  return {
    id: customer._id.toString(),
    name: customer.name,
    mobile: customer.mobile,
    email: customer.email,
    billingAddress: customer.billingAddress,
    shippingAddress: customer.shippingAddress,
    state: customer.state,
    stateCode: customer.stateCode,
    source: customer.source ?? 'Admin',
    customerType: customer.customerType ?? 'Retail',
    consentWhatsApp: customer.consentWhatsApp ?? false,
    consentEmail: customer.consentEmail ?? false,
    internalNotes: customer.internalNotes,
    isActive: customer.isActive,
    lifetimeValueInPaise: stats.lifetimeValueInPaise,
    outstandingInPaise: stats.outstandingInPaise,
    orderCount: stats.orderCount,
    lastPurchaseAt: stats.lastPurchaseAt?.toISOString(),
    createdAt: customer.createdAt.toISOString(),
  };
}

async function customerStats(ids: Types.ObjectId[]): Promise<Map<string, CustomerStats>> {
  if (!ids.length) {
    return new Map();
  }

  const rows = await OrderModel.aggregate<{
    _id: Types.ObjectId;
    lifetimeValueInPaise: number;
    outstandingInPaise: number;
    orderCount: number;
    lastPurchaseAt?: Date;
  }>([
    { $match: { customerId: { $in: ids } } },
    {
      $group: {
        _id: '$customerId',
        lifetimeValueInPaise: { $sum: '$totalInPaise' },
        outstandingInPaise: { $sum: '$dueAmountInPaise' },
        orderCount: { $sum: 1 },
        lastPurchaseAt: { $max: '$orderDate' },
      },
    },
  ]);

  return new Map(
    rows.map((row) => [
      row._id.toString(),
      {
        lifetimeValueInPaise: row.lifetimeValueInPaise,
        outstandingInPaise: row.outstandingInPaise,
        orderCount: row.orderCount,
        lastPurchaseAt: row.lastPurchaseAt,
      },
    ]),
  );
}

function baseFilter(input: CustomerQueryInput): Record<string, unknown> {
  const filter: Record<string, unknown> = {};

  if (input.status === 'active') {
    filter['isActive'] = true;
  } else if (input.status === 'inactive') {
    filter['isActive'] = false;
  }

  if (input.source !== 'all') {
    filter['source'] = input.source;
  }

  if (input.customerType !== 'all') {
    filter['customerType'] = input.customerType;
  }

  if (input.search) {
    const search = new RegExp(input.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter['$or'] = [{ name: search }, { mobile: search }, { email: search }];
  }

  return filter;
}

function sortFor(input: CustomerQueryInput): Record<string, SortOrder> {
  if (input.sort === 'oldest') return { createdAt: 1 };
  if (input.sort === 'name_asc') return { name: 1 };
  if (input.sort === 'name_desc') return { name: -1 };
  return { createdAt: -1 };
}

export class CustomerService {
  async list(input: CustomerQueryInput): Promise<CustomerListDto> {
    const filter = baseFilter(input);
    const customers = await CustomerModel.find(filter).sort(sortFor(input));
    const stats = await customerStats(customers.map((customer) => customer._id));
    const allItems = customers.map((customer) =>
      toDto(customer, stats.get(customer._id.toString())),
    );

    const segmentedItems = allItems.filter((customer) => {
      if (input.segment === 'outstanding') return customer.outstandingInPaise > 0;
      if (input.segment === 'repeat') return customer.orderCount > 1;
      if (input.segment === 'inactive') return !customer.isActive;
      return true;
    });

    if (input.sort === 'lifetime_desc' || input.segment === 'repeat') {
      segmentedItems.sort((a, b) => b.lifetimeValueInPaise - a.lifetimeValueInPaise);
    } else if (input.sort === 'outstanding_desc' || input.segment === 'outstanding') {
      segmentedItems.sort((a, b) => b.outstandingInPaise - a.outstandingInPaise);
    }

    const total = segmentedItems.length;
    const items = segmentedItems.slice(
      (input.page - 1) * input.pageSize,
      input.page * input.pageSize,
    );

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const summary: CustomerSummaryDto = {
      totalCustomers: allItems.length,
      newThisMonth: allItems.filter((customer) => new Date(customer.createdAt) >= monthStart)
        .length,
      outstandingInPaise: allItems.reduce((sum, customer) => sum + customer.outstandingInPaise, 0),
      outstandingCustomers: allItems.filter((customer) => customer.outstandingInPaise > 0).length,
      repeatBuyers: allItems.filter((customer) => customer.orderCount > 1).length,
      inactiveCustomers: allItems.filter((customer) => !customer.isActive).length,
    };

    return { items, total, page: input.page, pageSize: input.pageSize, summary };
  }

  async create(input: CreateCustomerInput): Promise<CustomerDto> {
    const existing = await CustomerModel.findOne({ mobile: normalizeMobile(input.mobile) });
    if (existing) {
      throw new AppError(
        409,
        'CUSTOMER_MOBILE_EXISTS',
        'A customer with this mobile already exists.',
      );
    }

    const customer = await CustomerModel.create({ ...toPayload(input), isActive: true });
    return toDto(customer);
  }

  async getById(id: string): Promise<CustomerDto> {
    const customer = await CustomerModel.findById(id);
    if (!customer) {
      throw new AppError(404, 'CUSTOMER_NOT_FOUND', 'Customer was not found.');
    }
    const stats = await customerStats([customer._id]);
    return toDto(customer, stats.get(customer._id.toString()));
  }

  async update(id: string, input: UpdateCustomerInput): Promise<CustomerDto> {
    const mobile = cleanEmpty(input.mobile);
    if (mobile) {
      const existing = await CustomerModel.findOne({
        mobile: normalizeMobile(mobile),
        _id: { $ne: id },
      });
      if (existing) {
        throw new AppError(
          409,
          'CUSTOMER_MOBILE_EXISTS',
          'A customer with this mobile already exists.',
        );
      }
    }

    const customer = await CustomerModel.findByIdAndUpdate(
      id,
      { $set: toPayload(input) },
      { new: true },
    );
    if (!customer) {
      throw new AppError(404, 'CUSTOMER_NOT_FOUND', 'Customer was not found.');
    }
    const stats = await customerStats([customer._id]);
    return toDto(customer, stats.get(customer._id.toString()));
  }

  async deactivate(id: string): Promise<CustomerDto> {
    return this.update(id, { isActive: false });
  }
}
