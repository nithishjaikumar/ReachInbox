import { elasticClient } from '../config/elasticsearch';
import logger from '../utils/logger';

export class ElasticsearchService {
  private index = 'emails';

  async ensureIndex() {
    try {
      const exists = await elasticClient.indices.exists({ index: this.index });
      if (!exists) {
        await elasticClient.indices.create({
          index: this.index,
          body: {
            mappings: {
              properties: {
                id: { type: 'keyword' },
                recipientEmail: { type: 'text', fields: { keyword: { type: 'keyword' } } },
                senderEmail: { type: 'text', fields: { keyword: { type: 'keyword' } } },
                subject: { type: 'text' },
                body: { type: 'text' },
                status: { type: 'keyword' },
                scheduledAt: { type: 'date' },
                sentAt: { type: 'date' },
                campaignId: { type: 'keyword' },
                userId: { type: 'keyword' },
                senderId: { type: 'keyword' },
              },
            },
          },
        });
        logger.info(`Elasticsearch index "${this.index}" created`);
      }
    } catch (error) {
      logger.warn('Failed to ensure Elasticsearch index', error);
    }
  }

  async indexEmail(email: any) {
    try {
      await elasticClient.index({
        index: this.index,
        id: email.id,
        document: {
          id: email.id,
          recipientEmail: email.recipientEmail,
          senderEmail: email.senderEmail || '',
          subject: email.subject,
          body: email.body,
          status: email.status,
          scheduledAt: email.scheduledAt,
          sentAt: email.sentAt,
          campaignId: email.campaignId,
          userId: email.userId,
          senderId: email.senderId,
        },
      });
    } catch (error) {
      logger.warn(`Failed to index email ${email.id} in ES`, error);
    }
  }

  async searchEmails(query: string, userId: string, status?: string) {
    try {
      const must: any[] = [
        { term: { userId } },
      ];

      if (query) {
        must.push({
          multi_match: {
            query,
            fields: ['subject^2', 'recipientEmail^2', 'senderEmail', 'body'],
            type: 'best_fields',
            fuzziness: 'AUTO',
          },
        });
      }

      if (status) {
        must.push({ term: { status } });
      }

      const result = await elasticClient.search({
        index: this.index,
        body: {
          query: { bool: { must } },
          size: 50,
          sort: [{ scheduledAt: { order: 'desc' } }],
        },
      });
      return result.hits.hits.map(h => h._source);
    } catch (error) {
      logger.warn('Failed to search emails in ES', error);
      return [];
    }
  }
}

export const elasticsearchService = new ElasticsearchService();
