import prisma from '@/lib/server/prisma';
import { CreateWebhookPayload } from '@/schemas/create-webhook.schema';

export const WebhookRepository = {
  async createWebhook(params: { userId: string; data: CreateWebhookPayload }) {
    const { userId, data } = params;
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

  async findPaginated(params: { limit: number; offset: number }) {
    const { limit, offset } = params;
    const [webhooks, total] = await prisma.$transaction([
      prisma.botWebhook.findMany({
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.botWebhook.count(),
    ]);

    return { webhooks, total };
  },

  async deleteWebhook(params: { id: string }) {
    const { id } = params;
    return prisma.botWebhook.delete({
      where: { id },
    });
  },
};
