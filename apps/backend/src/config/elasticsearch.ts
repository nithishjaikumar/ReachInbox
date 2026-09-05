import { Client } from '@elastic/elasticsearch';

import { env } from './env';

import logger from '../utils/logger';

console.log(
  'Elasticsearch API key configured:',
  Boolean(env.ELASTICSEARCH_API_KEY),
  'length:',
  env.ELASTICSEARCH_API_KEY?.length
);

export const elasticClient = new Client({
  node: env.ELASTICSEARCH_URL,
  headers: {
    Authorization: `ApiKey ${env.ELASTICSEARCH_API_KEY}`,
  },
});
export const checkElasticConnection = async () => {
  try {
    await elasticClient.ping();
    logger.info('Elasticsearch connected');
    return true;
  } catch (error) {
    logger.error(
      'Elasticsearch connection failed. Search will not work.',
      error
    );
    return false;
  }
};