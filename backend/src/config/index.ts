import dotenv from 'dotenv';
import { sequelize as database } from '../models';
import redis, { redisConfig } from './redis';
import { jwtConfig, bcryptConfig } from './jwt';

dotenv.config();

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 3000,
  corsOrigin: process.env.CORS_ORIGIN || '*',
  uploadDir: process.env.UPLOAD_DIR || './uploads',
  maxFileSize: Number(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024,
  logLevel: process.env.LOG_LEVEL || 'info'
};

export { database, redis, redisConfig, jwtConfig, bcryptConfig };
