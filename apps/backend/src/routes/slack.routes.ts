import { Router } from 'express';
import { requireAuth } from '../auth/middleware';
import { slackService } from '../services/slack.service';
import prisma from '../config/database';
import { env } from '../config/env';

export const slackRouter = Router();

slackRouter.get('/connect', requireAuth, (req, res) => {
  const userId = (req.user as any).id;

  const url = slackService.getAuthUrl(userId);

  res.redirect(url);
});

slackRouter.get('/callback', async (req, res, next) => {
  try {
    const { code, state } = req.query;

    if (!code || !state) {
      return res.status(400).send('Missing Slack OAuth parameters');
    }

    const userId = state as string;

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(400).send('Invalid user');
    }

    const result = await slackService.exchangeCode(code as string);

    await slackService.saveConnection(userId, result);

    res.redirect(`${env.FRONTEND_URL}/dashboard/settings`);
  } catch (error) {
    next(error);
  }
});

slackRouter.post('/disconnect', requireAuth, async (req, res, next) => {
  try {
    await prisma.slackConnection.update({
      where: {
        userId: (req.user as any).id,
      },
      data: {
        connected: false,
      },
    });

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

slackRouter.get('/status', requireAuth, async (req, res, next) => {
  try {
    const connection = await prisma.slackConnection.findUnique({
      where: {
        userId: (req.user as any).id,
      },
    });

    res.json({
      connected: connection?.connected || false,
      teamName: connection?.teamName || null,
    });
  } catch (error) {
    next(error);
  }
});