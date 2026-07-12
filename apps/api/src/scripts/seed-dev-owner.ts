import bcrypt from 'bcryptjs';
import { connectDatabase, disconnectDatabase } from '../infrastructure/database/mongoose.js';
import { logger } from '../infrastructure/logging/logger.js';
import { UserModel } from '../domain/users/user.model.js';

const defaultEmail = 'owner@aayuaura.local';
const defaultPassword = 'ChangeMe123!';

async function seedDevOwner(): Promise<void> {
  await connectDatabase();

  const email = process.env['SEED_OWNER_EMAIL']?.trim().toLowerCase() || defaultEmail;
  const password = process.env['SEED_OWNER_PASSWORD'] || defaultPassword;
  const name = process.env['SEED_OWNER_NAME']?.trim() || 'Aayu & Aura Owner';

  if (password.length < 8) {
    throw new Error('SEED_OWNER_PASSWORD must be at least 8 characters.');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const existingOwner = await UserModel.findOne({ email });

  if (existingOwner) {
    existingOwner.name = name;
    existingOwner.passwordHash = passwordHash;
    existingOwner.role = 'owner';
    existingOwner.isActive = true;
    existingOwner.failedLoginAttempts = 0;
    await existingOwner.save();
    logger.info({ email }, 'Development owner user updated');
  } else {
    await UserModel.create({
      name,
      email,
      passwordHash,
      role: 'owner',
      isActive: true,
      failedLoginAttempts: 0,
    });
    logger.info({ email }, 'Development owner user created');
  }

  console.log(`Development owner ready: ${email}`);
  console.log(`Temporary password: ${password}`);
}

seedDevOwner()
  .catch((error) => {
    logger.error({ error }, 'Failed to seed development owner');
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDatabase();
  });
