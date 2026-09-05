import { Client } from '@elastic/elasticsearch';
import { env } from './env';
import logger from '../utils/logger';

export const elasticClient = new Client({
  node: env.ELASTICSEARCH_URL,
});

export const checkElasticConnection = async () => {
  try {
    await elasticClient.ping();
    logger.info('Elasticsearch connected');
    return true;
  } catch (error) {
    logger.error('Elasticsearch connection failed. Search will not work.', error);
    return false;
  }
};
