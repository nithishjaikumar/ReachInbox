import { emailWorker } from './queue/emailWorker';
import logger from './utils/logger';
import { env } from './config/env';

logger.info(`Worker started with concurrency ${env.WORKER_CONCURRENCY}`);

const gracefulShutdown = async (signal: string) => {
  logger.info(`Received ${signal}, closing worker...`);
  await emailWorker.close();
  process.exit(0);
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
