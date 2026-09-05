import prisma from '../config/database';
import { emailQueue } from '../queue/emailQueue';
import { AppError } from '../utils/errors';
import { elasticsearchService } from './elasticsearch.service';
import logger from '../utils/logger';

export type ScheduleEmailInput = {
  senderId: string;
  recipients: string[];
  subject: string;
  body: string;
  startTime: string;
  delayBetweenEmails: number;
  hourlyLimit: number;
};

export class EmailService {
  async scheduleEmails(userId: string, input: ScheduleEmailInput) {
    // Make sure the sender belongs to the authenticated user.
    const sender = await prisma.sender.findFirst({
      where: {
        id: input.senderId,
        userId,
      },
    });

    if (!sender) {
      throw new AppError('Sender not found or not owned by user', 404);
    }

    if (!input.recipients.length) {
      throw new AppError('At least one recipient is required', 400);
    }

    if (input.delayBetweenEmails < 0) {
      throw new AppError('Delay between emails cannot be negative', 400);
    }

    if (input.hourlyLimit <= 0) {
      throw new AppError('Hourly limit must be greater than zero', 400);
    }

    const delayBetweenEmails = input.delayBetweenEmails;
    const hourlyLimit = input.hourlyLimit;

    const startTime = new Date(input.startTime);

    if (Number.isNaN(startTime.getTime())) {
      throw new AppError('Invalid start time', 400);
    }

    // Create the campaign first.
    const campaign = await prisma.campaign.create({
      data: {
        userId,
        senderId: sender.id,
        subject: input.subject,
        body: input.body,
        startTime,
        delayBetweenEmails,
        hourlyLimit,
        totalRecipients: input.recipients.length,
      },
    });

    const now = Date.now();
    const requestedStartTime = startTime.getTime();

    // If the requested time is already in the past,
    // begin immediately rather than creating negative delays.
    const baseTime = Math.max(now, requestedStartTime);

    const batchSize = 100;
    let totalCreated = 0;

    try {
      for (
        let batchStart = 0;
        batchStart < input.recipients.length;
        batchStart += batchSize
      ) {
        const batchRecipients = input.recipients.slice(
          batchStart,
          batchStart + batchSize,
        );

        for (let batchIndex = 0; batchIndex < batchRecipients.length; batchIndex++) {
          const recipientEmail = batchRecipients[batchIndex];
          const index = batchStart + batchIndex;

          /*
           * Every recipient gets a deterministic idempotency key.
           *
           * Example:
           * campaign-id:recipient@example.com:0
           */
          const idempotencyKey =
            `${campaign.id}:${recipientEmail.toLowerCase().trim()}:${index}`;

          const scheduledAt = new Date(
            baseTime + index * delayBetweenEmails,
          );

          /*
           * Check whether this email already exists.
           * This protects against accidental duplicate scheduling.
           */
          const existingEmail = await prisma.email.findUnique({
            where: {
              idempotencyKey,
            },
          });

          if (existingEmail) {
            totalCreated++;
            continue;
          }

          /*
           * Create the database record before adding the BullMQ job.
           */
          const email = await prisma.email.create({
            data: {
              campaignId: campaign.id,
              senderId: sender.id,
              recipientEmail: recipientEmail.trim().toLowerCase(),
              subject: campaign.subject,
              body: campaign.body,
              scheduledAt,
              idempotencyKey,
              status: 'scheduled',
            },
          });

          /*
           * BullMQ delay is relative to NOW.
           *
           * scheduledAt is an absolute timestamp in the database,
           * while BullMQ receives the number of milliseconds to wait.
           */
          const delay = Math.max(
            0,
            scheduledAt.getTime() - Date.now(),
          );

          /*
           * The email database ID is used as the BullMQ job ID.
           *
           * This gives us deterministic queue identity and prevents
           * the same email from accidentally being queued twice.
           */
          const job = await emailQueue.add(
            'send-email',
            {
              emailId: email.id,
              campaignId: campaign.id,
              senderId: sender.id,
            },
            {
              delay,
              jobId: email.id,
            },
          );

          /*
           * Store the BullMQ job ID so cancellation and inspection
           * can find the corresponding queue job.
           */
          await prisma.email.update({
            where: {
              id: email.id,
            },
            data: {
              bullJobId: job.id,
            },
          });

          totalCreated++;

          /*
           * Elasticsearch indexing is best-effort.
           * A temporary Elasticsearch failure must NOT prevent
           * the email from being scheduled.
           */
          elasticsearchService
            .indexEmail({
              ...email,
              bullJobId: job.id,
              userId,
              senderEmail: sender.email,
            })
            .catch((error) => {
              logger.warn(
                `Failed to index scheduled email ${email.id} in Elasticsearch`,
                error,
              );
            });
        }
      }
    } catch (error) {
      logger.error(
        `Failed while scheduling campaign ${campaign.id}`,
        error,
      );

      /*
       * The campaign and any successfully created emails remain
       * persisted. This allows the failure to be diagnosed rather
       * than silently losing the scheduling request.
       */
      throw error;
    }

    logger.info(
      `Campaign ${campaign.id} created with ${totalCreated} emails`,
    );

    return {
      campaign,
      emailCount: totalCreated,
    };
  }

  async getScheduledEmails(
    userId: string,
    page: number,
    limit: number,
  ) {
    const skip = (page - 1) * limit;

    const [emails, total] = await Promise.all([
      prisma.email.findMany({
        where: {
          campaign: {
            userId,
          },
          status: {
            in: ['scheduled', 'processing'],
          },
        },
        include: {
          sender: true,
          campaign: true,
        },
        skip,
        take: limit,
        orderBy: {
          scheduledAt: 'asc',
        },
      }),

      prisma.email.count({
        where: {
          campaign: {
            userId,
          },
          status: {
            in: ['scheduled', 'processing'],
          },
        },
      }),
    ]);

    return {
      emails,
      total,
    };
  }

  async getSentEmails(
    userId: string,
    page: number,
    limit: number,
  ) {
    const skip = (page - 1) * limit;

    const [emails, total] = await Promise.all([
      prisma.email.findMany({
        where: {
          campaign: {
            userId,
          },
          status: {
            in: ['sent', 'failed'],
          },
        },
        include: {
          sender: true,
          campaign: true,
        },
        skip,
        take: limit,
        orderBy: {
          sentAt: 'desc',
        },
      }),

      prisma.email.count({
        where: {
          campaign: {
            userId,
          },
          status: {
            in: ['sent', 'failed'],
          },
        },
      }),
    ]);

    return {
      emails,
      total,
    };
  }

  async getEmailById(id: string, userId: string) {
    const email = await prisma.email.findFirst({
      where: {
        id,
        campaign: {
          userId,
        },
      },
      include: {
        campaign: true,
        sender: true,
      },
    });

    if (!email) {
      throw new AppError('Email not found', 404);
    }

    return email;
  }

  async cancelEmail(id: string, userId: string) {
    const email = await this.getEmailById(id, userId);

    if (email.status !== 'scheduled') {
      throw new AppError(
        'Can only cancel scheduled emails',
        400,
      );
    }

    /*
     * Remove the delayed BullMQ job first.
     */
    if (email.bullJobId) {
      try {
        const job = await emailQueue.getJob(email.bullJobId);

        if (job) {
          await job.remove();
        }
      } catch (error) {
        logger.warn(
          `Failed to remove BullMQ job ${email.bullJobId}`,
          error,
        );
      }
    }

    const updated = await prisma.email.update({
      where: {
        id,
      },
      data: {
        status: 'cancelled',
      },
    });

    elasticsearchService
      .indexEmail({
        ...updated,
        userId,
        senderEmail: email.sender.email,
      })
      .catch((error) => {
        logger.warn(
          `Failed to update cancelled email ${id} in Elasticsearch`,
          error,
        );
      });

    return updated;
  }
}

export const emailService = new EmailService();