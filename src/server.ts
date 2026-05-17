import { createApp } from './app.js';
import { sequelize } from './config/db.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
// Side-effect imports register Sequelize models with the connection
import './models/index.js';

async function main(): Promise<void> {
  await sequelize.authenticate();
  await sequelize.sync(); // dev convenience; production should use migrations
  const app = createApp();
  app.listen(env.PORT, () => {
    logger.info({ port: env.PORT, env: env.NODE_ENV }, 'KYC service listening');
  });
}

main().catch((err) => {
  logger.error({ err }, 'Failed to start');
  process.exit(1);
});
