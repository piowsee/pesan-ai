import prisma from '@/lib/server/prisma';
import { ConversationRepository } from '@/repositories/conversation.repository';
import { MessageRepository } from '@/repositories/message.repository';
import { SyncRequestRepository } from '@/repositories/sync-request.repository';
import { HistoryWebhookHandler } from '@/services/meta-webhook-handler.service/history';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/server/prisma', () => ({
  default: {
    phoneNumber: {
      findUnique: vi.fn(),
    },
    message: {
      updateMany: vi.fn(),
    },
  },
}));

describe('HistoryWebhookHandler', () => {
  const metaWabaId = 'waba-123';
  const phoneNumberId = 'phone-123';

  it('processes text messages from history correctly (incoming and outgoing)', async () => {
    vi.mocked(prisma.phoneNumber.findUnique).mockResolvedValue({
      id: 'internal-phone-id',
    } as never);
    vi.mocked(
      SyncRequestRepository.findPendingByPhoneNumberId,
    ).mockResolvedValue([{ requestId: 'req-1' }] as never);

    const result = await HistoryWebhookHandler.processChange({
      metaWabaId,
      value: {
        messaging_product: 'whatsapp',
        metadata: {
          display_phone_number: '123',
          phone_number_id: phoneNumberId,
        },
        history: [
          {
            metadata: { progress: 50, phase: 0, chunk_order: 1 },
            threads: [
              {
                id: '987',
                messages: [
                  {
                    id: 'msg-in',
                    from: '987',
                    from_user_id: 'u-1',
                    type: 'text',
                    text: { body: 'Hello' },
                    timestamp: '12345',
                  },
                  {
                    id: 'msg-out',
                    from: '123',
                    from_user_id: 'u-1',
                    type: 'text',
                    text: { body: 'Hi' },
                    timestamp: '12346',
                  },
                ],
              },
            ],
          },
        ],
      },
    });

    expect(result).toBe(2);
    expect(ConversationRepository.processIncomingMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.objectContaining({ messageId: 'msg-in', type: 'text' }),
      }),
    );
    expect(
      ConversationRepository.processOutgoingMessageEcho,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.objectContaining({
          messageId: 'msg-out',
          type: 'text',
        }),
      }),
    );
    expect(SyncRequestRepository.updateSyncRequestStatus).toHaveBeenCalledWith({
      requestId: 'req-1',
      status: 'in_progress',
      progress: 50,
    });
  });

  it('handles media follow-up webhooks', async () => {
    vi.mocked(prisma.phoneNumber.findUnique).mockResolvedValue({
      id: 'internal-phone-id',
    } as never);

    const result = await HistoryWebhookHandler.processChange({
      metaWabaId,
      value: {
        messaging_product: 'whatsapp',
        metadata: {
          display_phone_number: '123',
          phone_number_id: phoneNumberId,
        },
        messages: [
          {
            id: 'msg-media',
            from: '987',
            from_user_id: 'u-1',
            type: 'image',
            timestamp: '12345',
          },
        ],
      },
    });

    expect(result).toBe(1);
    expect(MessageRepository.updateMediaPlaceholder).toHaveBeenCalledWith(
      expect.objectContaining({ messageId: 'msg-media', type: 'image' }),
    );
  });

  it('handles history sharing declined error', async () => {
    vi.mocked(prisma.phoneNumber.findUnique).mockResolvedValue({
      id: 'internal-phone-id',
    } as never);
    vi.mocked(
      SyncRequestRepository.findPendingByPhoneNumberId,
    ).mockResolvedValue([{ requestId: 'req-1' }] as never);

    const result = await HistoryWebhookHandler.processChange({
      metaWabaId,
      value: {
        messaging_product: 'whatsapp',
        metadata: {
          display_phone_number: '123',
          phone_number_id: phoneNumberId,
        },
        history: [
          {
            errors: [{ code: 2593109, title: 'History sharing declined' }],
          },
        ],
      },
    });

    expect(result).toBe(0);
    expect(SyncRequestRepository.updateSyncRequestStatus).toHaveBeenCalledWith({
      requestId: 'req-1',
      status: 'failed',
    });
  });
});
