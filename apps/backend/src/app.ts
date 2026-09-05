import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import passport from 'passport';

import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';

import { env } from './config/env';
import { sessionMiddleware } from './config/session';
import { errorHandler } from './middleware/errorHandler';
import { emailQueue } from './queue/emailQueue';

import './auth/google';

import { authRouter } from './routes/auth.routes';
import { emailRouter } from './routes/email.routes';
import { campaignRouter } from './routes/campaign.routes';
import { senderRouter } from './routes/sender.routes';
import { slackRouter } from './routes/slack.routes';
import { healthRouter } from './routes/health.routes';

const app = express();

/**
 * Security middleware
 */
app.use(helmet());

/**
 * CORS
 */
app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
  }),
);

/**
 * Body parsing
 */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/**
 * Cookies + session
 */
app.use(cookieParser());
app.use(sessionMiddleware);

/**
 * Passport authentication
 */
app.use(passport.initialize());
app.use(passport.session());

/**
 * API routes
 */
app.use('/api/auth', authRouter);
app.use('/api/emails', emailRouter);
app.use('/api/campaigns', campaignRouter);
app.use('/api/senders', senderRouter);
app.use('/api/slack', slackRouter);
app.use('/api/health', healthRouter);

/**
 * Bull Board
 *
 * Bull Board's installed type definitions can conflict with
 * the BullMQ version used by the application.
 * The runtime adapter is valid, so we intentionally cast it
 * here to satisfy the TypeScript type mismatch.
 */
const serverAdapter = new ExpressAdapter();

serverAdapter.setBasePath('/admin/queues');

createBullBoard({
  queues: [new BullMQAdapter(emailQueue) as any],
  serverAdapter,
});

app.use('/admin/queues', serverAdapter.getRouter());

/**
 * Global error handler
 *
 * This must be registered after all routes and middleware.
 */
app.use(errorHandler);

export default app;