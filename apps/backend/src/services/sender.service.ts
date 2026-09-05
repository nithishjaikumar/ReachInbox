import prisma from '../config/database';
import nodemailer from 'nodemailer';
import { AppError } from '../utils/errors';

export class SenderService {
  async getSenders(userId: string) {
    return prisma.sender.findMany({
      where: { userId },
    });
  }

  async createSender(userId: string, data: { name: string, email: string, useEthereal?: boolean }) {
    let etherealData = {};
    if (data.useEthereal) {
      const testAccount = await nodemailer.createTestAccount();
      etherealData = {
        etherealUser: testAccount.user,
        etherealPass: testAccount.pass,
        etherealHost: testAccount.smtp.host,
        etherealPort: testAccount.smtp.port,
      };
    }

    return prisma.sender.create({
      data: {
        userId,
        name: data.name,
        email: data.email,
        ...etherealData,
      },
    });
  }

  async getSenderById(id: string, userId: string) {
    const sender = await prisma.sender.findFirst({
      where: { id, userId },
    });
    if (!sender) throw new AppError('Sender not found', 404);
    return sender;
  }
}

export const senderService = new SenderService();
