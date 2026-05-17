import { Sequelize } from 'sequelize';
import { env } from './env.js';

function buildSequelize(): Sequelize {
  if (env.DB_DIALECT === 'sqlite') {
    return new Sequelize({
      dialect: 'sqlite',
      storage: env.DB_STORAGE,
      logging: false,
    });
  }
  return new Sequelize(env.DB_NAME!, env.DB_USER!, env.DB_PASSWORD!, {
    ...(env.DB_HOST ? { host: env.DB_HOST } : {}),
    ...(env.DB_PORT ? { port: env.DB_PORT } : {}),
    dialect: env.DB_DIALECT,
    logging: false,
    pool: { max: 10, min: 0, idle: 10_000 },
  });
}

export const sequelize = buildSequelize();
