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

  async findPaginated(limit: number, offset: number) {
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

  async deleteWebhook(id: string) {
    return prisma.botWebhook.delete({
      where: { id },
    });
  },
};
