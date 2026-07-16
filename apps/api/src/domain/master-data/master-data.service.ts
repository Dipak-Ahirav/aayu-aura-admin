import { Types, type SortOrder } from 'mongoose';
import type {
  MasterDataDto,
  MasterDataListDto,
  MasterDataStatus,
  MasterDataSummaryDto,
} from '@aayu-aura/shared-types';
import { AppError } from '../../infrastructure/http/app-error.js';
import { MasterDataModel, type MasterDataDocument } from './master-data.model.js';
import type {
  CreateMasterDataInput,
  MasterDataQueryInput,
  UpdateMasterDataInput,
} from './master-data.schemas.js';

function cleanEmpty(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function normalizePayload(input: CreateMasterDataInput | UpdateMasterDataInput) {
  const isProtected = input.status === 'protected' || input.isProtected === true;
  const status: MasterDataStatus | undefined = isProtected
    ? 'protected'
    : input.status === 'protected'
      ? 'protected'
      : input.status;

  return {
    ...(input.master !== undefined ? { master: input.master.trim() } : {}),
    ...(input.type !== undefined ? { type: input.type } : {}),
    ...(input.value !== undefined ? { value: input.value.trim() } : {}),
    ...(input.code !== undefined ? { code: cleanEmpty(input.code)?.toUpperCase() } : {}),
    ...(input.description !== undefined ? { description: cleanEmpty(input.description) } : {}),
    ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
    ...(status !== undefined ? { status } : {}),
    ...(input.isProtected !== undefined || status === 'protected'
      ? { isProtected: isProtected || status === 'protected' }
      : {}),
    ...(input.usedByRecords !== undefined ? { usedByRecords: input.usedByRecords } : {}),
  };
}

function toDto(masterData: MasterDataDocument & { _id: Types.ObjectId }): MasterDataDto {
  return {
    id: masterData._id.toString(),
    master: masterData.master,
    type: masterData.type,
    value: masterData.value,
    code: masterData.code,
    description: masterData.description,
    sortOrder: masterData.sortOrder,
    status: masterData.status,
    isProtected: masterData.isProtected,
    usedByRecords: masterData.usedByRecords,
    createdAt: masterData.createdAt.toISOString(),
  };
}

function baseFilter(input: MasterDataQueryInput): Record<string, unknown> {
  const filter: Record<string, unknown> = {};

  if (input.type !== 'all') {
    filter['type'] = input.type;
  }

  if (input.status !== 'all') {
    filter['status'] = input.status;
  }

  if (input.search) {
    const search = new RegExp(input.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter['$or'] = [
      { master: search },
      { value: search },
      { code: search },
      { description: search },
    ];
  }

  return filter;
}

function sortFor(input: MasterDataQueryInput): Record<string, SortOrder> {
  if (input.sort === 'oldest') return { createdAt: 1 };
  if (input.sort === 'master_asc') return { master: 1, value: 1 };
  if (input.sort === 'value_asc') return { value: 1 };
  if (input.sort === 'sort_order') return { sortOrder: 1, master: 1, value: 1 };
  return { createdAt: -1 };
}

async function buildSummary(filter: Record<string, unknown>): Promise<MasterDataSummaryDto> {
  const rows = await MasterDataModel.find(filter);
  const masters = new Set(rows.map((row) => row.master));

  return {
    masters: masters.size,
    activeValues: rows.filter((row) => row.status === 'active').length,
    inactiveValues: rows.filter((row) => row.status === 'inactive').length,
    protectedValues: rows.filter((row) => row.status === 'protected' || row.isProtected).length,
    catalogueValues: rows.filter((row) => row.type === 'Catalogue').length,
    inventoryValues: rows.filter((row) => row.type === 'Inventory').length,
    financeValues: rows.filter((row) => row.type === 'Finance').length,
    orderSetupValues: rows.filter((row) => row.type === 'Order setup').length,
  };
}

export class MasterDataService {
  async list(input: MasterDataQueryInput): Promise<MasterDataListDto> {
    const filter = baseFilter(input);
    const total = await MasterDataModel.countDocuments(filter);
    const items = await MasterDataModel.find(filter)
      .sort(sortFor(input))
      .skip((input.page - 1) * input.pageSize)
      .limit(input.pageSize);
    const summary = await buildSummary(baseFilter({ ...input, type: 'all', status: 'all' }));

    return {
      items: items.map((item) => toDto(item)),
      total,
      page: input.page,
      pageSize: input.pageSize,
      summary,
    };
  }

  async create(input: CreateMasterDataInput): Promise<MasterDataDto> {
    const payload = normalizePayload(input);
    const existing = await MasterDataModel.findOne({
      master: payload.master,
      value: payload.value,
    });

    if (existing) {
      throw new AppError(409, 'MASTER_DATA_EXISTS', 'This master data value already exists.');
    }

    const item = await MasterDataModel.create(payload);
    return toDto(item);
  }

  async getById(id: string): Promise<MasterDataDto> {
    const item = await MasterDataModel.findById(id);
    if (!item) {
      throw new AppError(404, 'MASTER_DATA_NOT_FOUND', 'Master data record was not found.');
    }
    return toDto(item);
  }

  async update(id: string, input: UpdateMasterDataInput): Promise<MasterDataDto> {
    const payload = normalizePayload(input);
    if (payload.master || payload.value) {
      const current = await MasterDataModel.findById(id);
      if (!current) {
        throw new AppError(404, 'MASTER_DATA_NOT_FOUND', 'Master data record was not found.');
      }

      const existing = await MasterDataModel.findOne({
        master: payload.master ?? current.master,
        value: payload.value ?? current.value,
        _id: { $ne: id },
      });

      if (existing) {
        throw new AppError(409, 'MASTER_DATA_EXISTS', 'This master data value already exists.');
      }
    }

    const item = await MasterDataModel.findByIdAndUpdate(id, { $set: payload }, { new: true });
    if (!item) {
      throw new AppError(404, 'MASTER_DATA_NOT_FOUND', 'Master data record was not found.');
    }

    return toDto(item);
  }

  async deactivate(id: string): Promise<MasterDataDto> {
    const item = await MasterDataModel.findById(id);
    if (!item) {
      throw new AppError(404, 'MASTER_DATA_NOT_FOUND', 'Master data record was not found.');
    }

    if (item.isProtected || item.status === 'protected') {
      throw new AppError(
        409,
        'MASTER_DATA_PROTECTED',
        'Protected master data cannot be deactivated.',
      );
    }

    return this.update(id, { status: 'inactive' });
  }
}
