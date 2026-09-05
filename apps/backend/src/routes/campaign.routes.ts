import { Router } from 'express';
import { requireAuth } from '../auth/middleware';
import prisma from '../config/database';

export const campaignRouter = Router();

campaignRouter.use(requireAuth);

campaignRouter.post('/', async (req, res, next) => {
  res.status(501).json({ message: 'Use POST /api/emails/schedule to create campaign' });
});

campaignRouter.get('/', async (req, res, next) => {
  try {
    const campaigns = await prisma.campaign.findMany({
      where: { userId: (req.user as any).id },
      include: { sender: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ campaigns });
  } catch (error) {
    next(error);
  }
});

campaignRouter.get('/:id', async (req, res, next) => {
  try {
    const campaign = await prisma.campaign.findFirst({
      where: { id: req.params.id, userId: (req.user as any).id },
      include: { emails: true, sender: true },
    });
    if (!campaign) return res.status(404).json({ message: 'Not found' });
    res.json({ campaign });
  } catch (error) {
    next(error);
  }
});
