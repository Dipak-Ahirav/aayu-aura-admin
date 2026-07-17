import { Types } from 'mongoose';
import type { AuditModule, AuditSeverity } from '@aayu-aura/shared-types';
import { logger } from '../../infrastructure/logging/logger.js';
import { UserModel } from '../users/user.model.js';
import { AuditLogModel } from './audit-log.model.js';

export interface RecordAuditInput {
  module: AuditModule;
  action: string;
  entity: string;
  entityId?: string;
  userId?: string;
  previousValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  severity?: AuditSeverity;
  metadata?: Record<string, unknown>;
}

export async function recordAudit(input: RecordAuditInput): Promise<void> {
  try {
    const user = input.userId ? await UserModel.findById(input.userId) : null;
    await AuditLogModel.create({
      module: input.module,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId,
      userId: input.userId ? new Types.ObjectId(input.userId) : undefined,
      userName: user?.name ?? 'System',
      userEmail: user?.email,
      previousValue: input.previousValue,
      newValue: input.newValue,
      severity: input.severity ?? 'Info',
      metadata: input.metadata,
    });
  } catch (error) {
    logger.warn({ error, module: input.module, action: input.action }, 'Audit log write failed');
  }
}
