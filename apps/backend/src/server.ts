import app from './app';
import { env } from './config/env';
import logger from './utils/logger';
import { elasticsearchService } from './services/elasticsearch.service';

const startServer = async () => {
  try {
    await elasticsearchService.ensureIndex();
    
    app.listen(env.PORT, () => {
      logger.info(`Server is running on port ${env.PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
};

startServer();
