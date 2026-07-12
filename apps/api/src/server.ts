import { createServer } from 'node:http';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { connectDatabase, disconnectDatabase } from './infrastructure/database/mongoose.js';
import { logger } from './infrastructure/logging/logger.js';

const app = createApp();
const server = createServer(app);

async function bootstrap(): Promise<void> {
  await connectDatabase();
  server.listen(env.PORT, () => {
    logger.info({ port: env.PORT }, 'API listening');
  });
}

function shutdown(signal: NodeJS.Signals): void {
  logger.info({ signal }, 'Shutting down API');
  server.close(async () => {
    await disconnectDatabase();
    process.exit(0);
  });
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

bootstrap().catch((error) => {
  logger.error({ error }, 'API failed to start');
  process.exit(1);
});
