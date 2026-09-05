import { Router } from 'express';
import prisma from '../config/database';
import redis from '../config/redis';
import { elasticClient } from '../config/elasticsearch';

export const healthRouter = Router();

healthRouter.get('/', async (req, res) => {
  const status: any = { status: 'ok', services: {} };
  
  try {
    await prisma.$queryRaw`SELECT 1`;
    status.services.postgres = 'up';
  } catch (e) {
    status.services.postgres = 'down';
    status.status = 'error';
  }

  try {
    await redis.ping();
    status.services.redis = 'up';
  } catch (e) {
    status.services.redis = 'down';
    status.status = 'error';
  }

  try {
    const esHealth = await elasticClient.cluster.health();
    status.services.elasticsearch = esHealth.status;
  } catch (e) {
    status.services.elasticsearch = 'down';
    status.status = 'error';
  }

  res.status(status.status === 'ok' ? 200 : 503).json(status);
});
