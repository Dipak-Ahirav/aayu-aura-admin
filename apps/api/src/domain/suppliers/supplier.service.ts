import { Types, type SortOrder } from 'mongoose';
import type { SupplierDto, SupplierListDto, SupplierSummaryDto } from '@aayu-aura/shared-types';
import { AppError } from '../../infrastructure/http/app-error.js';
import { SupplierModel, type SupplierDocument } from './supplier.model.js';
import type {
  CreateSupplierInput,
  SupplierQueryInput,
  UpdateSupplierInput,
} from './supplier.schemas.js';

function cleanEmpty(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function toPayload(input: CreateSupplierInput | UpdateSupplierInput) {
  return {
    ...(input.name !== undefined ? { name: input.name.trim() } : {}),
    ...(input.contactPerson !== undefined
      ? { contactPerson: cleanEmpty(input.contactPerson) }
      : {}),
    ...(input.mobile !== undefined ? { mobile: input.mobile.trim() } : {}),
    ...(input.email !== undefined ? { email: cleanEmpty(input.email) } : {}),
    ...(input.gstin !== undefined ? { gstin: cleanEmpty(input.gstin)?.toUpperCase() } : {}),
    ...(input.address !== undefined ? { address: cleanEmpty(input.address) } : {}),
    ...(input.state !== undefined ? { state: cleanEmpty(input.state) } : {}),
    ...(input.stateCode !== undefined ? { stateCode: cleanEmpty(input.stateCode) } : {}),
    ...(input.paymentTermsDays !== undefined ? { paymentTermsDays: input.paymentTermsDays } : {}),
    ...(input.openingBalanceInPaise !== undefined
      ? { openingBalanceInPaise: input.openingBalanceInPaise }
      : {}),
    ...(input.currentPayableInPaise !== undefined
      ? { currentPayableInPaise: input.currentPayableInPaise }
      : {}),
    ...(input.bankName !== undefined ? { bankName: cleanEmpty(input.bankName) } : {}),
    ...(input.accountNumber !== undefined
      ? { accountNumber: cleanEmpty(input.accountNumber) }
      : {}),
    ...(input.ifsc !== undefined ? { ifsc: cleanEmpty(input.ifsc)?.toUpperCase() } : {}),
    ...(input.status !== undefined
      ? { status: input.status, isActive: input.status !== 'inactive' }
      : {}),
    ...(input.notes !== undefined ? { notes: cleanEmpty(input.notes) } : {}),
    ...('isActive' in input && input.isActive !== undefined ? { isActive: input.isActive } : {}),
  };
}

function toDto(supplier: SupplierDocument & { _id: Types.ObjectId }): SupplierDto {
  return {
    id: supplier._id.toString(),
    name: supplier.name,
    contactPerson: supplier.contactPerson,
    mobile: supplier.mobile,
    email: supplier.email,
    gstin: supplier.gstin,
    address: supplier.address,
    state: supplier.state,
    stateCode: supplier.stateCode,
    paymentTermsDays: supplier.paymentTermsDays,
    openingBalanceInPaise: supplier.openingBalanceInPaise,
    currentPayableInPaise: supplier.currentPayableInPaise,
    bankName: supplier.bankName,
    accountNumber: supplier.accountNumber,
    ifsc: supplier.ifsc,
    status: supplier.status,
    notes: supplier.notes,
    isActive: supplier.isActive,
    createdAt: supplier.createdAt.toISOString(),
  };
}

function baseFilter(input: SupplierQueryInput): Record<string, unknown> {
  const filter: Record<string, unknown> = {};

  if (input.status !== 'all') {
    filter['status'] = input.status;
  }

  if (input.state !== 'all') {
    filter['state'] = input.state;
  }

  if (input.segment === 'outstanding') {
    filter['currentPayableInPaise'] = { $gt: 0 };
  } else if (input.segment === 'inactive') {
    filter['status'] = 'inactive';
  }

  if (input.search) {
    const search = new RegExp(input.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter['$or'] = [{ name: search }, { mobile: search }, { gstin: search }, { email: search }];
  }

  return filter;
}

function sortFor(input: SupplierQueryInput): Record<string, SortOrder> {
  if (input.sort === 'oldest') return { createdAt: 1 };
  if (input.sort === 'name_asc') return { name: 1 };
  if (input.sort === 'name_desc') return { name: -1 };
  if (input.sort === 'payable_desc') return { currentPayableInPaise: -1 };
  if (input.sort === 'credit_days') return { paymentTermsDays: -1 };
  return { createdAt: -1 };
}

function buildSummary(items: SupplierDto[]): SupplierSummaryDto {
  return {
    totalSuppliers: items.length,
    activeSuppliers: items.filter((supplier) => supplier.status === 'active').length,
    payableInPaise: items.reduce((sum, supplier) => sum + supplier.currentPayableInPaise, 0),
    paymentDueSuppliers: items.filter((supplier) => supplier.currentPayableInPaise > 0).length,
    inactiveSuppliers: items.filter((supplier) => supplier.status === 'inactive').length,
    gstRegistered: items.filter((supplier) => Boolean(supplier.gstin)).length,
  };
}

export class SupplierService {
  async list(input: SupplierQueryInput): Promise<SupplierListDto> {
    const filter = baseFilter(input);
    const total = await SupplierModel.countDocuments(filter);
    const rows = await SupplierModel.find(filter)
      .sort(sortFor(input))
      .skip((input.page - 1) * input.pageSize)
      .limit(input.pageSize);
    const allRows = await SupplierModel.find(
      baseFilter({ ...input, status: 'all', segment: 'all' }),
    );
    const summary = buildSummary(allRows.map((supplier) => toDto(supplier)));

    return {
      items: rows.map((supplier) => toDto(supplier)),
      total,
      page: input.page,
      pageSize: input.pageSize,
      summary,
    };
  }

  async create(input: CreateSupplierInput): Promise<SupplierDto> {
    const existing = await SupplierModel.findOne({ mobile: input.mobile.trim() });
    if (existing) {
      throw new AppError(
        409,
        'SUPPLIER_MOBILE_EXISTS',
        'A supplier with this mobile already exists.',
      );
    }

    const supplier = await SupplierModel.create(toPayload(input));
    return toDto(supplier);
  }

  async getById(id: string): Promise<SupplierDto> {
    const supplier = await SupplierModel.findById(id);
    if (!supplier) {
      throw new AppError(404, 'SUPPLIER_NOT_FOUND', 'Supplier was not found.');
    }
    return toDto(supplier);
  }

  async update(id: string, input: UpdateSupplierInput): Promise<SupplierDto> {
    if (input.mobile) {
      const existing = await SupplierModel.findOne({
        mobile: input.mobile.trim(),
        _id: { $ne: id },
      });
      if (existing) {
        throw new AppError(
          409,
          'SUPPLIER_MOBILE_EXISTS',
          'A supplier with this mobile already exists.',
        );
      }
    }

    const supplier = await SupplierModel.findByIdAndUpdate(
      id,
      { $set: toPayload(input) },
      { new: true },
    );
    if (!supplier) {
      throw new AppError(404, 'SUPPLIER_NOT_FOUND', 'Supplier was not found.');
    }
    return toDto(supplier);
  }

  async deactivate(id: string): Promise<SupplierDto> {
    return this.update(id, { status: 'inactive', isActive: false });
  }

  async exportCsv(input: SupplierQueryInput): Promise<string> {
    const rows = await SupplierModel.find(baseFilter(input)).sort(sortFor(input));
    const header = [
      'Supplier',
      'Contact person',
      'Mobile',
      'Email',
      'GSTIN',
      'State',
      'Payable',
      'Credit days',
      'Status',
    ];
    const escape = (value: string | number | undefined) =>
      `"${String(value ?? '').replace(/"/g, '""')}"`;

    return [
      header.map(escape).join(','),
      ...rows.map((supplier) =>
        [
          supplier.name,
          supplier.contactPerson,
          supplier.mobile,
          supplier.email,
          supplier.gstin,
          supplier.state,
          (supplier.currentPayableInPaise / 100).toFixed(2),
          supplier.paymentTermsDays,
          supplier.status,
        ]
          .map(escape)
          .join(','),
      ),
    ].join('\n');
  }
}
