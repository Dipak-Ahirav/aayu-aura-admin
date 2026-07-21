import bcrypt from 'bcryptjs';
import jwt, { type Secret, type SignOptions } from 'jsonwebtoken';
import type {
  CustomerAuthProfileDto,
  CustomerAuthResponseDto,
} from '@aayu-aura/shared-types';
import { env } from '../../config/env.js';
import { AppError } from '../../infrastructure/http/app-error.js';
import { CustomerModel, type CustomerDocument } from '../customers/customer.model.js';
import { CustomerCredentialModel } from './customer-auth.model.js';
import type {
  CustomerLoginInput,
  CustomerOAuthInput,
  CustomerRegisterInput,
} from './customer-auth.schemas.js';

function clean(value?: string): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function normaliseEmail(value?: string): string | undefined {
  return clean(value)?.toLowerCase();
}

function normaliseMobile(value: string): string {
  return value.replace(/\s+/g, '').trim();
}

function signToken(subject: string, secret: Secret, expiresIn: SignOptions['expiresIn']): string {
  return jwt.sign({ typ: 'customer' }, secret, { subject, expiresIn });
}

function profile(customer: CustomerDocument & { _id: { toString(): string } }): CustomerAuthProfileDto {
  return {
    id: customer._id.toString(),
    name: customer.name,
    mobile: customer.mobile,
    email: customer.email,
    consentEmail: customer.consentEmail,
    consentWhatsApp: customer.consentWhatsApp,
  };
}

export class CustomerAuthService {
  async register(input: CustomerRegisterInput): Promise<CustomerAuthResponseDto> {
    const email = normaliseEmail(input.email);
    const mobile = normaliseMobile(input.mobile);
    const existing = await CustomerCredentialModel.findOne({
      $or: [{ mobile }, ...(email ? [{ email }] : [])],
    });
    if (existing) {
      throw new AppError(409, 'CUSTOMER_ACCOUNT_EXISTS', 'An account already exists for this email or mobile.');
    }

    const customer = await CustomerModel.findOneAndUpdate(
      { mobile },
      {
        $set: {
          name: input.name,
          mobile,
          email,
          source: 'Customer website',
          customerType: 'Retail',
          consentEmail: Boolean(input.marketingConsent),
          consentWhatsApp: Boolean(input.marketingConsent),
          isActive: true,
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );

    await CustomerCredentialModel.create({
      customerId: customer._id,
      email,
      mobile,
      passwordHash: await bcrypt.hash(input.password, 12),
      providers: [],
      termsAcceptedAt: new Date(),
      failedLoginAttempts: 0,
      isActive: true,
    });

    return this.response(customer);
  }

  async login(input: CustomerLoginInput): Promise<CustomerAuthResponseDto> {
    const identifier = input.identifier.trim();
    const credential = await CustomerCredentialModel.findOne({
      $or: [{ email: normaliseEmail(identifier) }, { mobile: normaliseMobile(identifier) }],
    }).select('+passwordHash');

    if (!credential?.passwordHash || !credential.isActive) {
      throw new AppError(401, 'INVALID_CUSTOMER_CREDENTIALS', 'Invalid email/mobile or password.');
    }

    const passwordMatches = await bcrypt.compare(input.password, credential.passwordHash);
    if (!passwordMatches) {
      await CustomerCredentialModel.updateOne(
        { _id: credential._id },
        { $inc: { failedLoginAttempts: 1 } },
      );
      throw new AppError(401, 'INVALID_CUSTOMER_CREDENTIALS', 'Invalid email/mobile or password.');
    }

    await CustomerCredentialModel.updateOne(
      { _id: credential._id },
      { $set: { failedLoginAttempts: 0, lastLoginAt: new Date() } },
    );

    const customer = await CustomerModel.findById(credential.customerId);
    if (!customer?.isActive) {
      throw new AppError(401, 'CUSTOMER_ACCOUNT_INACTIVE', 'This customer account is inactive.');
    }

    return this.response(customer);
  }

  async oauth(input: CustomerOAuthInput): Promise<CustomerAuthResponseDto> {
    if (!input.email || !input.providerAccountId) {
      throw new AppError(
        400,
        'OAUTH_NOT_CONFIGURED',
        'Google login requires a configured Google sign-in token on the storefront.',
      );
    }

    const email = normaliseEmail(input.email);
    const providerAccountId = input.providerAccountId;
    let credential = await CustomerCredentialModel.findOne({
      providers: { $elemMatch: { provider: input.provider, providerAccountId } },
    });

    if (!credential && email) {
      credential = await CustomerCredentialModel.findOne({ email });
    }

    const customer = await CustomerModel.findOneAndUpdate(
      { email },
      {
        $setOnInsert: {
          mobile: `GOOGLE-${providerAccountId}`.slice(0, 20),
          source: 'Google',
          customerType: 'Retail',
        },
        $set: {
          name: input.name ?? email ?? 'Google customer',
          email,
          consentEmail: true,
          isActive: true,
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );

    if (!credential) {
      credential = await CustomerCredentialModel.create({
        customerId: customer._id,
        email,
        mobile: customer.mobile,
        providers: [{ provider: input.provider, providerAccountId, email }],
        termsAcceptedAt: new Date(),
        failedLoginAttempts: 0,
        isActive: true,
      });
    } else {
      await CustomerCredentialModel.updateOne(
        { _id: credential._id },
        {
          $set: { customerId: customer._id, lastLoginAt: new Date(), isActive: true },
          $addToSet: { providers: { provider: input.provider, providerAccountId, email } },
        },
      );
    }

    return this.response(customer);
  }

  async current(customerId: string): Promise<CustomerAuthProfileDto> {
    const customer = await CustomerModel.findById(customerId);
    if (!customer?.isActive) {
      throw new AppError(401, 'CUSTOMER_SESSION_EXPIRED', 'Please sign in again.');
    }
    return profile(customer);
  }

  private response(customer: CustomerDocument & { _id: { toString(): string } }): CustomerAuthResponseDto {
    return {
      profile: profile(customer),
      accessToken: signToken(
        customer._id.toString(),
        env.JWT_ACCESS_SECRET,
        env.JWT_ACCESS_EXPIRES_IN as SignOptions['expiresIn'],
      ),
    };
  }
}
