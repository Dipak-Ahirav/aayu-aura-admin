import bcrypt from 'bcryptjs';
import jwt, { type Secret, type SignOptions } from 'jsonwebtoken';
import type { UserProfileDto } from '@aayu-aura/shared-types';
import { env } from '../../config/env.js';
import { AppError } from '../../infrastructure/http/app-error.js';
import { permissionsByRole } from '../roles/permissions.js';
import { UserModel } from '../users/user.model.js';
import type { LoginInput } from './auth.schemas.js';

function signToken(subject: string, secret: Secret, expiresIn: SignOptions['expiresIn']): string {
  return jwt.sign({}, secret, { subject, expiresIn });
}

export class AuthService {
  async login(input: LoginInput): Promise<{ profile: UserProfileDto; accessToken: string }> {
    const user = await UserModel.findOne({ email: input.email }).select('+passwordHash');
    if (!user || !user.isActive) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
    }

    const passwordMatches = await bcrypt.compare(input.password, user.passwordHash);
    if (!passwordMatches) {
      await UserModel.updateOne({ _id: user._id }, { $inc: { failedLoginAttempts: 1 } });
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
    }

    await UserModel.updateOne(
      { _id: user._id },
      { $set: { failedLoginAttempts: 0, lastLoginAt: new Date() } },
    );

    const accessToken = signToken(
      user._id.toString(),
      env.JWT_ACCESS_SECRET,
      env.JWT_ACCESS_EXPIRES_IN as SignOptions['expiresIn'],
    );

    return {
      accessToken,
      profile: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        permissions: permissionsByRole[user.role],
        isActive: user.isActive,
      },
    };
  }

  async currentUser(userId: string): Promise<UserProfileDto> {
    const user = await UserModel.findById(userId);
    if (!user || !user.isActive) {
      throw new AppError(401, 'SESSION_EXPIRED', 'Please sign in again.');
    }

    return {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      permissions: permissionsByRole[user.role],
      isActive: user.isActive,
    };
  }
}
