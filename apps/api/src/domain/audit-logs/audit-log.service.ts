import { Types, type SortOrder } from 'mongoose';
import type { AuditLogDto, AuditLogListDto, AuditLogSummaryDto } from '@aayu-aura/shared-types';
import { AppError } from '../../infrastructure/http/app-error.js';
import { UserModel } from '../users/user.model.js';
import { AuditLogModel, type AuditLogDocument } from './audit-log.model.js';
import type { AuditLogQueryInput, CreateAuditLogInput } from './audit-log.schemas.js';

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function cleanEmpty(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function toDto(log: AuditLogDocument & { _id: Types.ObjectId }): AuditLogDto {
  return {
    id: log._id.toString(),
    module: log.module,
    action: log.action,
    entity: log.entity,
    entityId: log.entityId,
    userName: log.userName,
    userEmail: log.userEmail,
    previousValue: log.previousValue,
    newValue: log.newValue,
    severity: log.severity,
    metadata: log.metadata,
    reviewed: log.reviewed,
    reviewedAt: log.reviewedAt?.toISOString(),
    createdAt: log.createdAt.toISOString(),
  };
}

function filterFor(input: AuditLogQueryInput): Record<string, unknown> {
  const filter: Record<string, unknown> = {};
  if (input.module !== 'all') filter['module'] = input.module;
  if (input.action !== 'all') filter['action'] = input.action;
  if (input.user !== 'all') filter['userName'] = input.user;
  if (input.severity !== 'all') filter['severity'] = input.severity;
  if (input.reviewed === 'reviewed') filter['reviewed'] = true;
  if (input.reviewed === 'unreviewed') filter['reviewed'] = false;
  if (input.tab === 'security') filter['module'] = { $in: ['Auth', 'Users', 'Settings'] };
  if (input.tab === 'inventory') filter['module'] = 'Inventory';
  if (input.tab === 'finance')
    filter['module'] = { $in: ['Invoices', 'Payments', 'Exports', 'Finance'] };
  if (input.search) {
    const search = new RegExp(input.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter['$or'] = [
      { module: search },
      { action: search },
      { entity: search },
      { entityId: search },
      { userName: search },
      { userEmail: search },
    ];
  }
  return filter;
}

function sortFor(input: AuditLogQueryInput): Record<string, SortOrder> {
  return input.sort === 'oldest' ? { createdAt: 1 } : { createdAt: -1 };
}

async function summary(): Promise<AuditLogSummaryDto> {
  const today = startOfDay(new Date());
  const tomorrow = addDays(today, 1);
  const [eventsToday, security, inventory, finance, totalEvents, critical] = await Promise.all([
    AuditLogModel.countDocuments({ createdAt: { $gte: today, $lt: tomorrow } }),
    AuditLogModel.countDocuments({ module: { $in: ['Auth', 'Users', 'Settings'] } }),
    AuditLogModel.countDocuments({ module: 'Inventory' }),
    AuditLogModel.countDocuments({
      module: { $in: ['Invoices', 'Payments', 'Exports', 'Finance'] },
    }),
    AuditLogModel.countDocuments(),
    AuditLogModel.countDocuments({ severity: 'Critical' }),
  ]);
  return { eventsToday, security, inventory, finance, totalEvents, critical };
}

export class AuditLogService {
  async list(input: AuditLogQueryInput): Promise<AuditLogListDto> {
    const filter = filterFor(input);
    const [total, rows, summaryData] = await Promise.all([
      AuditLogModel.countDocuments(filter),
      AuditLogModel.find(filter)
        .sort(sortFor(input))
        .skip((input.page - 1) * input.pageSize)
        .limit(input.pageSize),
      summary(),
    ]);
    return {
      items: rows.map((row) => toDto(row)),
      total,
      page: input.page,
      pageSize: input.pageSize,
      summary: summaryData,
    };
  }

  async create(input: CreateAuditLogInput, userId?: string): Promise<AuditLogDto> {
    const user = userId ? await UserModel.findById(userId) : null;
    const log = await AuditLogModel.create({
      module: input.module,
      action: input.action.trim(),
      entity: input.entity.trim(),
      entityId: cleanEmpty(input.entityId),
      userId: userId ? new Types.ObjectId(userId) : undefined,
      userName: cleanEmpty(input.userName) ?? user?.name ?? 'System',
      userEmail: cleanEmpty(input.userEmail) ?? user?.email,
      previousValue: input.previousValue,
      newValue: input.newValue,
      severity: input.severity,
      metadata: input.metadata,
    });
    return toDto(log);
  }

  async getById(id: string): Promise<AuditLogDto> {
    const log = await AuditLogModel.findById(id);
    if (!log) throw new AppError(404, 'AUDIT_LOG_NOT_FOUND', 'Audit log was not found.');
    return toDto(log);
  }

  async review(id: string, userId?: string): Promise<AuditLogDto> {
    const log = await AuditLogModel.findByIdAndUpdate(
      id,
      {
        $set: {
          reviewed: true,
          reviewedAt: new Date(),
          ...(userId ? { reviewedBy: new Types.ObjectId(userId) } : {}),
        },
      },
      { new: true },
    );
    if (!log) throw new AppError(404, 'AUDIT_LOG_NOT_FOUND', 'Audit log was not found.');
    return toDto(log);
  }

  async exportCsv(input: AuditLogQueryInput): Promise<string> {
    const rows = await AuditLogModel.find(filterFor(input)).sort(sortFor(input));
    const header = [
      'Timestamp',
      'User',
      'Module',
      'Action',
      'Entity',
      'Entity ID',
      'Severity',
      'Reviewed',
    ];
    const escape = (value: string | number | boolean | undefined) =>
      `"${String(value ?? '').replace(/"/g, '""')}"`;
    return [
      header.map(escape).join(','),
      ...rows.map((log) =>
        [
          log.createdAt.toISOString(),
          log.userName,
          log.module,
          log.action,
          log.entity,
          log.entityId,
          log.severity,
          log.reviewed,
        ]
          .map(escape)
          .join(','),
      ),
    ].join('\n');
  }
}
