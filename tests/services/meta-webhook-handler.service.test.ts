import eventBus, { SSE_EVENTS, getUserEvent } from '@/lib/chat/event-bus';
import { ConversationRepository } from '@/repositories/conversation.repository';
import { MessageRepository } from '@/repositories/message.repository';
import { WabaRepository } from '@/repositories/waba.repository';
import { DebouncerService } from '@/services/debouncer.service';
import { MetaWebhookHandlerService } from '@/services/meta-webhook-handler.service';
import { S3Service } from '@/services/s3.service';
import crypto from 'crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.unmock('@/services/meta-webhook-handler.service');
vi.unmock('@/services/meta-webhook-handler.service/account-update');
vi.unmock(
  '@/services/meta-webhook-handler.service/account-update/account-offboarded',
);
vi.unmock(
  '@/services/meta-webhook-handler.service/account-update/account-reconnected',
);
vi.unmock('@/services/meta-webhook-handler.service/messages');
vi.unmock('@/services/meta-webhook-handler.service/messages/incoming-message');
vi.unmock('@/services/meta-webhook-handler.service/messages/status-message');
vi.unmock('@/services/meta-webhook-handler.service/smb-message-echoes');

describe('MetaWebhookHandlerService', { tags: ['backend'] }, () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.META_APP_SECRET = 'app-secret';
  });

  describe('isValidSignature', () => {
    it('accepts a valid Meta signature', () => {
      const rawBody = JSON.stringify({ object: 'whatsapp_business_account' });
      const signature = crypto
        .createHmac('sha256', 'app-secret')
        .update(rawBody)
        .digest('hex');

      const result = MetaWebhookHandlerService.isValidSignature(
        rawBody,
        `sha256=${signature}`,
      );

      expect(result).toBe(true);
    });

    it('rejects missing, malformed, and mismatched signatures', () => {
      const rawBody = JSON.stringify({ object: 'whatsapp_business_account' });
      const wrongSignature = crypto
        .createHmac('sha256', 'wrong-secret')
        .update(rawBody)
        .digest('hex');

      expect(MetaWebhookHandlerService.isValidSignature(rawBody, null)).toBe(
        false,
      );
      expect(
        MetaWebhookHandlerService.isValidSignature(rawBody, wrongSignature),
      ).toBe(false);
      expect(
        MetaWebhookHandlerService.isValidSignature(
          rawBody,
          `sha256=${wrongSignature}`,
        ),
      ).toBe(false);
    });

    it('rejects signatures when META_APP_SECRET is missing', () => {
      const previousSecret = process.env.META_APP_SECRET;
      delete process.env.META_APP_SECRET;

      expect(
        MetaWebhookHandlerService.isValidSignature(
          '{}',
          'sha256=1234567890abcdef',
        ),
      ).toBe(false);

      process.env.META_APP_SECRET = previousSecret;
    });
  });

  describe('getUnprocessedWebhookResponse', () => {
    it('maps non-WABA payloads to a 404 response shape', () => {
      expect(
        MetaWebhookHandlerService.getUnprocessedWebhookResponse({
          reason: 'Not a WABA event',
        }),
      ).toEqual({
        body: { error: 'Not a WABA event' },
        status: 404,
      });
    });

    it('maps ignored payloads to an acknowledged response shape', () => {
      expect(
        MetaWebhookHandlerService.getUnprocessedWebhookResponse({
          reason: 'Invalid or ignored payload',
        }),
      ).toEqual({
        body: {
          received: true,
          reason: 'Invalid or ignored payload',
        },
        status: 200,
      });
    });
  });

  describe('processMetaWebhookPayload', () => {
    it('processes payload correctly', async () => {
      const payload = {
        object: 'whatsapp_business_account',
        entry: [],
      };

      const result =
        await MetaWebhookHandlerService.processMetaWebhookPayload(payload);
      expect(result.processed).toBe(true);
      expect(result.count).toBe(0);
    });

    it('marks an offboarded WABA as disconnected', async () => {
      vi.mocked(WabaRepository.updateStatusByMetaWabaId).mockResolvedValue({
        count: 1,
      } as never);

      const result = await MetaWebhookHandlerService.processMetaWebhookPayload({
        object: 'whatsapp_business_account',
        entry: [
          {
            id: '102290129340398',
            time: 1743451903,
            changes: [
              {
                field: 'account_update',
                value: {
                  event: 'ACCOUNT_OFFBOARDED',
                },
              },
            ],
          },
        ],
      });

      expect(result).toEqual({ processed: true, count: 1 });
      expect(WabaRepository.updateStatusByMetaWabaId).toHaveBeenCalledWith({
        wabaId: '102290129340398',
        status: 'disconnected',
      });
    });

    it('marks a reconnected WABA as active', async () => {
      vi.mocked(WabaRepository.updateStatusByMetaWabaId).mockResolvedValue({
        count: 1,
      } as never);

      const result = await MetaWebhookHandlerService.processMetaWebhookPayload({
        object: 'whatsapp_business_account',
        entry: [
          {
            id: '102290129340398',
            time: 1743451903,
            changes: [
              {
                field: 'account_update',
                value: {
                  event: 'ACCOUNT_RECONNECTED',
                },
              },
            ],
          },
        ],
      });

      expect(result).toEqual({ processed: true, count: 1 });
      expect(WabaRepository.updateStatusByMetaWabaId).toHaveBeenCalledWith({
        wabaId: '102290129340398',
        status: 'active',
      });
    });

    it('accepts currently unimplemented account_update payload shapes', async () => {
      const result = await MetaWebhookHandlerService.processMetaWebhookPayload({
        object: 'whatsapp_business_account',
        entry: [
          {
            id: '2949482758682047',
            time: 1748477359,
            changes: [
              {
                field: 'account_update',
                value: {
                  event: 'PARTNER_REMOVED',
                  waba_info: {
                    waba_id: '980198427658004',
                    owner_business_id: '2329417887457253',
                  },
                  disconnection_info: {
                    reason: 'PRIMARY_INACTIVITY',
                    initiated_by: 'SYSTEM',
                  },
                },
              },
              {
                field: 'account_update',
                value: {
                  event: 'VERIFIED_ACCOUNT',
                  phone_number: '16505551111',
                },
              },
            ],
          },
        ],
      });

      expect(result).toEqual({ processed: true, count: 0 });
      expect(WabaRepository.updateStatusByMetaWabaId).not.toHaveBeenCalled();
    });

    it('updates outbound message statuses and emits one bulk SSE event', async () => {
      vi.mocked(
        ConversationRepository.findPhoneNumberByMetaId,
      ).mockResolvedValue({ id: 'phone-1' } as never);
      vi.mocked(
        MessageRepository.updateStatusesByMetaMessageIds,
      ).mockResolvedValue([
        {
          id: 'db-message-1',
          messageId: 'wamid.message-1',
          status: 'delivered',
          errorMessage: null,
          conversationId: 'conversation-1',
          userId: 'user-1',
          wabaId: 'waba-1',
        },
        {
          id: 'db-message-2',
          messageId: 'wamid.message-2',
          status: 'failed',
          errorMessage: 'Message could not be delivered.',
          conversationId: 'conversation-2',
          userId: 'user-1',
          wabaId: 'waba-1',
        },
      ] as never);

      const result = await MetaWebhookHandlerService.processMetaWebhookPayload({
        object: 'whatsapp_business_account',
        entry: [
          {
            id: 'entry-1',
            changes: [
              {
                field: 'messages',
                value: {
                  messaging_product: 'whatsapp',
                  metadata: {
                    display_phone_number: '16505551111',
                    phone_number_id: 'meta-phone-1',
                  },
                  contacts: [
                    {
                      profile: { name: 'Test User Name' },
                      user_id: 'US.13491208655302741918',
                    },
                  ],
                  statuses: [
                    {
                      id: 'wamid.message-1',
                      status: 'delivered',
                      timestamp: '1750030073',
                      recipient_user_id: 'US.13491208655302741918',
                    },
                    {
                      id: 'wamid.message-2',
                      status: 'failed',
                      timestamp: '1751142888',
                      recipient_id: '16315551181',
                      errors: [
                        {
                          code: 131049,
                          title: 'Failed',
                          message: 'This message was not delivered.',
                          error_data: {
                            details: 'Message could not be delivered.',
                          },
                        },
                      ],
                    },
                  ],
                },
              },
            ],
          },
        ],
      });

      expect(result).toEqual({ processed: true, count: 2 });
      expect(
        ConversationRepository.processIncomingMessage,
      ).not.toHaveBeenCalled();
      expect(
        MessageRepository.updateStatusesByMetaMessageIds,
      ).toHaveBeenCalledWith([
        {
          messageId: 'wamid.message-1',
          status: 'delivered',
          errorMessage: null,
        },
        {
          messageId: 'wamid.message-2',
          status: 'failed',
          errorMessage: 'Message could not be delivered.',
        },
      ]);
      expect(eventBus.emit).toHaveBeenCalledWith(
        getUserEvent(SSE_EVENTS.MESSAGE_STATUSES_UPDATED, 'user-1'),
        {
          wabaId: 'waba-1',
          statuses: [
            {
              id: 'db-message-1',
              messageId: 'wamid.message-1',
              status: 'delivered',
              errorMessage: null,
              conversationId: 'conversation-1',
            },
            {
              id: 'db-message-2',
              messageId: 'wamid.message-2',
              status: 'failed',
              errorMessage: 'Message could not be delivered.',
              conversationId: 'conversation-2',
            },
          ],
        },
      );
    });

    it('stores WhatsApp Business App message echoes with a distinct source', async () => {
      vi.mocked(
        ConversationRepository.findPhoneNumberByMetaId,
      ).mockResolvedValue({ id: 'phone-1' } as never);
      vi.mocked(
        ConversationRepository.processOutgoingMessageEcho,
      ).mockResolvedValue({
        message: {
          id: 'db-message-1',
          direction: 'outgoing',
          source: 'whatsapp_app',
          content: 'Ou',
        },
        conversation: { id: 'conversation-1' },
        userId: 'user-1',
        wabaId: 'waba-1',
      } as never);

      const result = await MetaWebhookHandlerService.processMetaWebhookPayload({
        object: 'whatsapp_business_account',
        entry: [
          {
            id: '1055765170435443',
            changes: [
              {
                field: 'smb_message_echoes',
                value: {
                  messaging_product: 'whatsapp',
                  metadata: {
                    display_phone_number: '6285195563454',
                    phone_number_id: '1120639457807711',
                  },
                  message_echoes: [
                    {
                      from: '6285195563454',
                      to: '628116150122',
                      id: 'wamid.echo-1',
                      to_user_id: 'ID.1728689754990890',
                      timestamp: '1782640182',
                      text: { body: 'Ou' },
                      type: 'text',
                    },
                  ],
                },
              },
            ],
          },
        ],
      });

      expect(result).toEqual({ processed: true, count: 1 });
      expect(
        ConversationRepository.processOutgoingMessageEcho,
      ).toHaveBeenCalledWith({
        phoneNumberId: 'phone-1',
        customerPhone: '628116150122',
        message: {
          messageId: 'wamid.echo-1',
          type: 'text',
          content: 'Ou',
          timestamp: new Date(1782640182 * 1000),
          metadata: expect.any(String),
        },
      });
      expect(
        ConversationRepository.processIncomingMessage,
      ).not.toHaveBeenCalled();
      expect(
        DebouncerService.handleDebounceIncomingMessage,
      ).not.toHaveBeenCalled();
      expect(
        DebouncerService.handleDebounceAutoCloseConversation,
      ).not.toHaveBeenCalled();
      expect(eventBus.emit).toHaveBeenCalledWith(
        getUserEvent(SSE_EVENTS.NEW_MESSAGE, 'user-1'),
        expect.objectContaining({
          id: 'db-message-1',
          direction: 'outgoing',
          source: 'whatsapp_app',
        }),
      );
    });

    it.each([
      ['image', { id: 'echo-image-1', mime_type: 'image/png' }],
      ['audio', { id: 'echo-audio-1', mime_type: 'audio/ogg', voice: true }],
      ['video', { id: 'echo-video-1', mime_type: 'video/mp4' }],
      [
        'document',
        {
          id: 'echo-document-1',
          mime_type: 'application/pdf',
          filename: 'receipt.pdf',
        },
      ],
    ])('streams and stores %s message echoes', async (type, media) => {
      const mediaPayload = {
        ...media,
        caption: 'echo caption',
        url: `https://lookaside.whatsapp.com/${type}`,
      };
      const objectKey = `user-1/waba-1/conv-1/${type}-echo-key`;

      vi.mocked(
        ConversationRepository.findPhoneNumberByMetaId,
      ).mockResolvedValue({ id: 'phone-1' } as never);
      vi.mocked(
        ConversationRepository.prepareWebhookMessageConversation,
      ).mockResolvedValue({
        conversation: { id: 'conv-1' },
        userId: 'user-1',
        wabaId: 'waba-1',
        systemUserToken: 'token',
      } as never);
      vi.mocked(S3Service.streamWhatsAppMediaToObjectStorage).mockResolvedValue(
        {
          key: objectKey,
          mediaType: type,
          mediaMimeType: mediaPayload.mime_type,
          mediaSize: 123,
        } as never,
      );
      vi.mocked(
        ConversationRepository.processOutgoingMessageEcho,
      ).mockResolvedValue({
        message: { id: 'db-echo-media-1', type, mediaObjectKey: objectKey },
        conversation: { id: 'conv-1' },
        userId: 'user-1',
        wabaId: 'waba-1',
      } as never);

      const result = await MetaWebhookHandlerService.processMetaWebhookPayload({
        object: 'whatsapp_business_account',
        entry: [
          {
            id: 'entry-1',
            changes: [
              {
                field: 'smb_message_echoes',
                value: {
                  messaging_product: 'whatsapp',
                  metadata: {
                    display_phone_number: '6285195563454',
                    phone_number_id: '1120639457807711',
                  },
                  message_echoes: [
                    {
                      from: '6285195563454',
                      to: '628116150122',
                      id: `wamid.echo-${type}-1`,
                      timestamp: '1782640182',
                      type,
                      [type]: mediaPayload,
                    },
                  ],
                },
              },
            ],
          },
        ],
      });

      expect(result).toEqual({ processed: true, count: 1 });
      expect(S3Service.streamWhatsAppMediaToObjectStorage).toHaveBeenCalledWith(
        {
          whatsappUrl: mediaPayload.url,
          token: 'token',
          userId: 'user-1',
          wabaId: 'waba-1',
          convId: 'conv-1',
          contentType: mediaPayload.mime_type,
        },
      );
      expect(
        ConversationRepository.processOutgoingMessageEcho,
      ).toHaveBeenCalledWith({
        phoneNumberId: 'phone-1',
        customerPhone: '628116150122',
        message: expect.objectContaining({
          messageId: `wamid.echo-${type}-1`,
          type,
          content: 'echo caption',
          mediaObjectKey: objectKey,
          mediaMimeType: mediaPayload.mime_type,
          mediaFilename:
            'filename' in mediaPayload ? mediaPayload.filename : null,
          mediaSize: 123,
        }),
      });
      expect(eventBus.emit).toHaveBeenCalledWith(
        getUserEvent(SSE_EVENTS.NEW_MESSAGE, 'user-1'),
        expect.objectContaining({
          id: 'db-echo-media-1',
          mediaObjectKey: objectKey,
          userId: 'user-1',
          wabaId: 'waba-1',
        }),
      );
    });

    it.each([
      ['image', { id: 'media-image-1', mime_type: 'image/png' }],
      ['audio', { id: 'media-audio-1', mime_type: 'audio/ogg', voice: true }],
      ['video', { id: 'media-video-1', mime_type: 'video/mp4' }],
      [
        'document',
        {
          id: 'media-document-1',
          mime_type: 'application/pdf',
          filename: 'receipt.pdf',
        },
      ],
    ])('streams and stores incoming %s messages', async (type, media) => {
      const mediaPayload = {
        ...media,
        caption: 'incoming caption',
        url: `https://lookaside.whatsapp.com/${type}`,
      };
      const objectKey = `user-1/waba-1/conv-1/${type}-incoming-key`;

      vi.mocked(
        ConversationRepository.findPhoneNumberByMetaId,
      ).mockResolvedValue({ id: 'phone-1' } as never);
      vi.mocked(
        ConversationRepository.prepareWebhookMessageConversation,
      ).mockResolvedValue({
        conversation: { id: 'conv-1' },
        userId: 'user-1',
        wabaId: 'waba-1',
        systemUserToken: 'token',
      } as never);
      vi.mocked(S3Service.streamWhatsAppMediaToObjectStorage).mockResolvedValue(
        {
          key: objectKey,
          mediaType: type,
          mediaMimeType: mediaPayload.mime_type,
          mediaSize: 123,
        } as never,
      );
      vi.mocked(
        ConversationRepository.processIncomingMessage,
      ).mockResolvedValue({
        message: { id: 'db-incoming-media-1', type, mediaObjectKey: objectKey },
        conversation: { id: 'conv-1' },
        userId: 'user-1',
        wabaId: 'waba-1',
      } as never);

      const result = await MetaWebhookHandlerService.processMetaWebhookPayload({
        object: 'whatsapp_business_account',
        entry: [
          {
            id: 'entry-1',
            changes: [
              {
                field: 'messages',
                value: {
                  messaging_product: 'whatsapp',
                  metadata: {
                    display_phone_number: '12345',
                    phone_number_id: 'meta-phone-1',
                  },
                  messages: [
                    {
                      id: `meta-${type}-msg-1`,
                      from: 'customer-1',
                      from_user_id: 'US.customer-1',
                      type,
                      [type]: mediaPayload,
                      timestamp: '1625097600',
                    },
                  ],
                },
              },
            ],
          },
        ],
      });

      expect(result).toEqual({ processed: true, count: 1 });
      expect(S3Service.streamWhatsAppMediaToObjectStorage).toHaveBeenCalledWith(
        {
          whatsappUrl: mediaPayload.url,
          token: 'token',
          userId: 'user-1',
          wabaId: 'waba-1',
          convId: 'conv-1',
          contentType: mediaPayload.mime_type,
        },
      );
      expect(
        ConversationRepository.processIncomingMessage,
      ).toHaveBeenCalledWith({
        phoneNumberId: 'phone-1',
        bsuid: 'US.customer-1',
        customerPhone: 'customer-1',
        message: expect.objectContaining({
          messageId: `meta-${type}-msg-1`,
          type,
          content: 'incoming caption',
          mediaObjectKey: objectKey,
          mediaMimeType: mediaPayload.mime_type,
          mediaFilename:
            'filename' in mediaPayload ? mediaPayload.filename : null,
          mediaSize: 123,
        }),
      });
      expect(eventBus.emit).toHaveBeenCalledWith(
        getUserEvent(SSE_EVENTS.NEW_MESSAGE, 'user-1'),
        expect.objectContaining({
          id: 'db-incoming-media-1',
          mediaObjectKey: objectKey,
          userId: 'user-1',
          wabaId: 'waba-1',
        }),
      );
      expect(
        DebouncerService.handleDebounceIncomingMessage,
      ).toHaveBeenCalledWith({
        conversationId: 'conv-1',
        userId: 'user-1',
        wabaId: 'waba-1',
      });
      expect(
        DebouncerService.handleDebounceAutoCloseConversation,
      ).toHaveBeenCalledWith({
        conversationId: 'conv-1',
        userId: 'user-1',
        wabaId: 'waba-1',
      });
    });

    it('uses contact profile, username, phone, and BSUID for incoming messages', async () => {
      vi.mocked(
        ConversationRepository.findPhoneNumberByMetaId,
      ).mockResolvedValue({ id: 'phone-1' } as never);
      vi.mocked(
        ConversationRepository.processIncomingMessage,
      ).mockResolvedValue({
        message: { id: 'db-message-1', content: 'hello' },
        conversation: { id: 'conv-1' },
        userId: 'user-1',
        wabaId: 'waba-1',
      } as never);

      const result = await MetaWebhookHandlerService.processMetaWebhookPayload({
        object: 'whatsapp_business_account',
        entry: [
          {
            id: 'entry-1',
            changes: [
              {
                field: 'messages',
                value: {
                  messaging_product: 'whatsapp',
                  metadata: {
                    display_phone_number: '12345',
                    phone_number_id: 'meta-phone-1',
                  },
                  contacts: [
                    {
                      profile: {
                        name: 'Test User Name',
                        username: '@testusername',
                      },
                      wa_id: '16315551181',
                      user_id: 'US.13491208655302741918',
                    },
                  ],
                  messages: [
                    {
                      id: 'meta-msg-1',
                      from: '16315551181',
                      from_user_id: 'US.13491208655302741918',
                      type: 'text',
                      text: { body: 'hello' },
                      timestamp: '1625097600',
                    },
                  ],
                },
              },
            ],
          },
        ],
      });

      expect(result).toEqual({ processed: true, count: 1 });
      expect(
        ConversationRepository.processIncomingMessage,
      ).toHaveBeenCalledWith({
        phoneNumberId: 'phone-1',
        customerPhone: '16315551181',
        customerName: 'Test User Name',
        customerUsername: '@testusername',
        bsuid: 'US.13491208655302741918',
        message: expect.objectContaining({
          messageId: 'meta-msg-1',
          type: 'text',
          content: 'hello',
        }),
      });
    });

    it('stores incoming username-only contacts when no phone is supplied', async () => {
      vi.mocked(
        ConversationRepository.findPhoneNumberByMetaId,
      ).mockResolvedValue({ id: 'phone-1' } as never);
      vi.mocked(
        ConversationRepository.processIncomingMessage,
      ).mockResolvedValue({
        message: { id: 'db-message-1', content: 'hello' },
        conversation: { id: 'conv-1' },
        userId: 'user-1',
        wabaId: 'waba-1',
      } as never);

      const result = await MetaWebhookHandlerService.processMetaWebhookPayload({
        object: 'whatsapp_business_account',
        entry: [
          {
            id: 'entry-1',
            changes: [
              {
                field: 'messages',
                value: {
                  messaging_product: 'whatsapp',
                  metadata: {
                    display_phone_number: '12345',
                    phone_number_id: 'meta-phone-1',
                  },
                  contacts: [
                    {
                      profile: {
                        name: 'Test User Name',
                        username: '@testusername',
                      },
                      user_id: 'US.13491208655302741918',
                    },
                  ],
                  messages: [
                    {
                      id: 'meta-msg-1',
                      from_user_id: 'US.13491208655302741918',
                      type: 'text',
                      text: { body: 'hello' },
                      timestamp: '1625097600',
                    },
                  ],
                },
              },
            ],
          },
        ],
      });

      expect(result).toEqual({ processed: true, count: 1 });
      expect(
        ConversationRepository.processIncomingMessage,
      ).toHaveBeenCalledWith({
        phoneNumberId: 'phone-1',
        customerPhone: undefined,
        customerName: 'Test User Name',
        customerUsername: '@testusername',
        bsuid: 'US.13491208655302741918',
        message: expect.objectContaining({
          messageId: 'meta-msg-1',
          type: 'text',
          content: 'hello',
        }),
      });
    });

    it('throws error for invalid webhook payload', async () => {
      const payload = {
        object: 'page',
        entry: [],
      };
      await expect(
        MetaWebhookHandlerService.processMetaWebhookPayload(payload),
      ).rejects.toThrow('Invalid Webhook Payload');
    });

    it('emits NEW_MESSAGE event to targeted user channel (simulated SSE connection)', async () => {
      const testUserId = 'user-123';
      const userEventName = getUserEvent(SSE_EVENTS.NEW_MESSAGE, testUserId);
      const mockSseListener = vi.fn();

      // Subscribe to the event (uses the global spied EventEmitter from setup.ts)
      eventBus.on(userEventName, mockSseListener);

      // Mock repository calls
      vi.mocked(
        ConversationRepository.findPhoneNumberByMetaId,
      ).mockResolvedValue({
        id: 'phone-1',
      } as never);

      vi.mocked(
        ConversationRepository.processIncomingMessage,
      ).mockResolvedValue({
        message: { id: 'msg-1', content: 'hello' },
        conversation: {
          id: 'conv-1',
          contact: {
            customerPhone: 'customer-1',
            customerName: null,
            customerUsername: null,
          },
        },
        userId: testUserId,
        wabaId: 'waba-1',
      } as never);

      const payload = {
        object: 'whatsapp_business_account',
        entry: [
          {
            id: 'entry-1',
            changes: [
              {
                field: 'messages',
                value: {
                  messaging_product: 'whatsapp',
                  metadata: {
                    display_phone_number: '12345',
                    phone_number_id: 'meta-phone-1',
                  },
                  messages: [
                    {
                      id: 'meta-msg-1',
                      from: 'customer-1',
                      from_user_id: 'US.customer-1',
                      type: 'text',
                      text: { body: 'hello' },
                      timestamp: '1625097600',
                    },
                  ],
                },
              },
            ],
          },
        ],
      };

      await MetaWebhookHandlerService.processMetaWebhookPayload(payload);

      // Verify overall emission call
      expect(eventBus.emit).toHaveBeenCalledWith(
        userEventName,
        expect.objectContaining({ id: 'msg-1' }),
      );

      // Verify the simulated SSE "connection" (listener) received the data
      expect(mockSseListener).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'msg-1',
          content: 'hello',
          conversation: expect.objectContaining({
            id: 'conv-1',
            customerPhone: 'customer-1',
          }),
          userId: testUserId,
        }),
      );

      expect(
        DebouncerService.handleDebounceIncomingMessage,
      ).toHaveBeenCalledWith({
        conversationId: 'conv-1',
        userId: testUserId,
        wabaId: 'waba-1',
      });
      expect(
        DebouncerService.handleDebounceAutoCloseConversation,
      ).toHaveBeenCalledWith({
        conversationId: 'conv-1',
        userId: testUserId,
        wabaId: 'waba-1',
      });

      // Clean up the listener
      eventBus.off(userEventName, mockSseListener);
    });

    it('queues the conversation when saved text content is missing', async () => {
      vi.mocked(
        ConversationRepository.findPhoneNumberByMetaId,
      ).mockResolvedValue({
        id: 'phone-1',
      } as never);

      vi.mocked(
        ConversationRepository.processIncomingMessage,
      ).mockResolvedValue({
        message: { id: 'msg-1', content: null },
        conversation: { id: 'conv-1' },
        userId: 'user-123',
        wabaId: 'waba-1',
      } as never);

      await MetaWebhookHandlerService.processMetaWebhookPayload({
        object: 'whatsapp_business_account',
        entry: [
          {
            id: 'entry-1',
            changes: [
              {
                field: 'messages',
                value: {
                  messaging_product: 'whatsapp',
                  metadata: {
                    display_phone_number: '12345',
                    phone_number_id: 'meta-phone-1',
                  },
                  messages: [
                    {
                      id: 'meta-msg-1',
                      from: 'customer-1',
                      from_user_id: 'US.customer-1',
                      type: 'text',
                      timestamp: '1625097600',
                    },
                  ],
                },
              },
            ],
          },
        ],
      });

      expect(
        DebouncerService.handleDebounceIncomingMessage,
      ).toHaveBeenCalledWith({
        conversationId: 'conv-1',
        userId: 'user-123',
        wabaId: 'waba-1',
      });
      expect(
        DebouncerService.handleDebounceAutoCloseConversation,
      ).toHaveBeenCalledWith({
        conversationId: 'conv-1',
        userId: 'user-123',
        wabaId: 'waba-1',
      });
    });

    it('does not queue redirect message when admin has taken over the conversation', async () => {
      vi.mocked(
        ConversationRepository.findPhoneNumberByMetaId,
      ).mockResolvedValue({
        id: 'phone-1',
      } as never);

      vi.mocked(
        ConversationRepository.processIncomingMessage,
      ).mockResolvedValue({
        message: { id: 'msg-1', content: 'manual please' },
        conversation: {
          id: 'conv-1',
          adminTakeover: true,
          contact: {
            customerPhone: 'customer-1',
            customerName: null,
            customerUsername: null,
          },
        },
        userId: 'user-123',
      } as never);

      const result = await MetaWebhookHandlerService.processMetaWebhookPayload({
        object: 'whatsapp_business_account',
        entry: [
          {
            id: 'entry-1',
            changes: [
              {
                field: 'messages',
                value: {
                  messaging_product: 'whatsapp',
                  metadata: {
                    display_phone_number: '12345',
                    phone_number_id: 'meta-phone-1',
                  },
                  messages: [
                    {
                      id: 'meta-msg-1',
                      from: 'customer-1',
                      from_user_id: 'US.customer-1',
                      type: 'text',
                      text: { body: 'manual please' },
                      timestamp: '1625097600',
                    },
                  ],
                },
              },
            ],
          },
        ],
      });

      expect(result).toEqual({ processed: true, count: 1 });
      expect(eventBus.emit).toHaveBeenCalledWith(
        getUserEvent(SSE_EVENTS.NEW_MESSAGE, 'user-123'),
        expect.objectContaining({
          id: 'msg-1',
          conversation: expect.objectContaining({
            id: 'conv-1',
            adminTakeover: true,
            customerPhone: 'customer-1',
          }),
        }),
      );
      expect(
        DebouncerService.handleDebounceIncomingMessage,
      ).not.toHaveBeenCalled();
      expect(
        DebouncerService.handleDebounceAutoCloseConversation,
      ).not.toHaveBeenCalled();
    });
  });
});
