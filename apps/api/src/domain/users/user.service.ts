import bcrypt from 'bcryptjs';
import { Types, type SortOrder } from 'mongoose';
import type {
  AdminUserDto,
  RolePermissionDto,
  UserManagementListDto,
  UserManagementSummaryDto,
} from '@aayu-aura/shared-types';
import { AppError } from '../../infrastructure/http/app-error.js';
import { recordAudit } from '../audit-logs/audit-recorder.js';
import { permissionsByRole } from '../roles/permissions.js';
import { UserModel, type UserDocument } from './user.model.js';
import type { CreateAdminUserInput, UpdateAdminUserInput, UserQueryInput } from './user.schemas.js';

function toDto(user: UserDocument & { _id: Types.ObjectId }): AdminUserDto {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    permissions: permissionsByRole[user.role],
    isActive: user.isActive,
    failedLoginAttempts: user.failedLoginAttempts,
    lastLoginAt: user.lastLoginAt?.toISOString(),
    createdAt: user.createdAt.toISOString(),
  };
}

function rolePermissions(): RolePermissionDto[] {
  return Object.entries(permissionsByRole).map(([role, permissions]) => ({
    role: role as RolePermissionDto['role'],
    permissions,
  }));
}

function filterFor(input: UserQueryInput): Record<string, unknown> {
  const filter: Record<string, unknown> = {};
  if (input.role !== 'all') filter['role'] = input.role;
  if (input.status === 'active') filter['isActive'] = true;
  if (input.status === 'inactive' || input.tab === 'inactive') filter['isActive'] = false;
  if (input.search) {
    const search = new RegExp(input.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter['$or'] = [{ name: search }, { email: search }, { role: search }];
  }
  return filter;
}

function sortFor(input: UserQueryInput): Record<string, SortOrder> {
  if (input.sort === 'oldest') return { createdAt: 1 };
  if (input.sort === 'name_asc') return { name: 1 };
  if (input.sort === 'name_desc') return { name: -1 };
  if (input.sort === 'last_login') return { lastLoginAt: -1 };
  return { createdAt: -1 };
}

async function summary(): Promise<UserManagementSummaryDto> {
  const [activeUsers, inactiveUsers, owners, totalUsers] = await Promise.all([
    UserModel.countDocuments({ isActive: true }),
    UserModel.countDocuments({ isActive: false }),
    UserModel.countDocuments({ role: 'owner', isActive: true }),
    UserModel.countDocuments(),
  ]);
  const roles = rolePermissions();
  return {
    activeUsers,
    inactiveUsers,
    owners,
    totalUsers,
    roles: roles.length,
    permissions: roles.reduce((count, role) => count + role.permissions.length, 0),
  };
}

export class UserService {
  async list(input: UserQueryInput): Promise<UserManagementListDto> {
    const filter = filterFor(input);
    const [total, rows, summaryData] = await Promise.all([
      UserModel.countDocuments(filter),
      UserModel.find(filter)
        .sort(sortFor(input))
        .skip((input.page - 1) * input.pageSize)
        .limit(input.pageSize),
      summary(),
    ]);
    return {
      items: rows.map((row) => toDto(row)),
      roles: rolePermissions(),
      total,
      page: input.page,
      pageSize: input.pageSize,
      summary: summaryData,
    };
  }

  async create(input: CreateAdminUserInput, actorUserId?: string): Promise<AdminUserDto> {
    const passwordHash = await bcrypt.hash(input.temporaryPassword, 12);
    try {
      const user = await UserModel.create({
        name: input.name.trim(),
        email: input.email.trim().toLowerCase(),
        role: input.role,
        passwordHash,
        isActive: input.isActive ?? true,
      });
      const dto = toDto(user);
      await recordAudit({
        module: 'Users',
        action: 'Invite user',
        entity: 'User',
        entityId: dto.id,
        userId: actorUserId,
        newValue: {
          id: dto.id,
          name: dto.name,
          email: dto.email,
          role: dto.role,
          isActive: dto.isActive,
        },
        severity: dto.role === 'owner' || dto.role === 'administrator' ? 'Warning' : 'Info',
      });
      return dto;
    } catch (error) {
      if ((error as { code?: number }).code === 11000) {
        throw new AppError(409, 'USER_EMAIL_EXISTS', 'A user with this email already exists.');
      }
      throw error;
    }
  }

  async getById(id: string): Promise<AdminUserDto> {
    const user = await UserModel.findById(id);
    if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'User was not found.');
    return toDto(user);
  }

  async update(
    id: string,
    input: UpdateAdminUserInput,
    actorUserId?: string,
  ): Promise<AdminUserDto> {
    const existing = await UserModel.findById(id);
    if (!existing) throw new AppError(404, 'USER_NOT_FOUND', 'User was not found.');
    const previous = toDto(existing);
    const set: Record<string, unknown> = {
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.email !== undefined ? { email: input.email.trim().toLowerCase() } : {}),
      ...(input.role !== undefined ? { role: input.role } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    };
    if (input.temporaryPassword)
      set['passwordHash'] = await bcrypt.hash(input.temporaryPassword, 12);
    try {
      const user = await UserModel.findByIdAndUpdate(id, { $set: set }, { new: true });
      if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'User was not found.');
      const dto = toDto(user);
      await recordAudit({
        module: 'Users',
        action: 'Update user',
        entity: 'User',
        entityId: dto.id,
        userId: actorUserId,
        previousValue: {
          id: previous.id,
          name: previous.name,
          email: previous.email,
          role: previous.role,
          isActive: previous.isActive,
        },
        newValue: {
          id: dto.id,
          name: dto.name,
          email: dto.email,
          role: dto.role,
          isActive: dto.isActive,
        },
        severity:
          previous.role !== dto.role || previous.isActive !== dto.isActive ? 'Warning' : 'Info',
      });
      return dto;
    } catch (error) {
      if ((error as { code?: number }).code === 11000) {
        throw new AppError(409, 'USER_EMAIL_EXISTS', 'A user with this email already exists.');
      }
      throw error;
    }
  }

  async deactivate(id: string, actorUserId?: string): Promise<AdminUserDto> {
    return this.update(id, { isActive: false }, actorUserId);
  }
}
