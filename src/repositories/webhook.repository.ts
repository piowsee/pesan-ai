import prisma from '@/lib/prisma';
import { CreateWebhookPayload } from '@/schemas/create-webhook.schema';

export const WebhookRepository = {
  async createWebhook(userId: string, data: CreateWebhookPayload) {
    return prisma.botWebhook.create({
      data: {
        userId,
        name: data.name,
        webhookUrl: data.webhookUrl,
        passphrase: data.passphrase,
        isActive: true,
      },
    });
  },

  async findAll() {
    return prisma.botWebhook.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
  },
};
