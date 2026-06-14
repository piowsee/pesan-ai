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

  async findWebhookByConversationId(params: { conversationId: string }) {
    const { conversationId } = params;
    const conversation = await prisma.conversation.findUnique({
      where: {
        id: conversationId,
      },
      select: {
        phoneNumber: {
          select: {
            botWebhook: {
              select: {
                webhookUrl: true,
                passphrase: true,
                isActive: true,
              },
            },
          },
        },
      },
    });

    return {
      url: conversation?.phoneNumber.botWebhook?.webhookUrl,
      passphrase: conversation?.phoneNumber.botWebhook?.passphrase,
      isActive: conversation?.phoneNumber.botWebhook?.isActive,
    };
  },

  async deleteWebhook(params: { id: string }) {
    const { id } = params;
    return prisma.botWebhook.delete({
      where: { id },
    });
  },
};
