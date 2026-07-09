import prisma from '@/lib/server/prisma';
import { ConversationRepository } from '@/repositories/conversation.repository';
import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import { SEED_DATA } from '../seed-data';

vi.unmock('@/repositories/conversation.repository');
vi.unmock('@/repositories/contact.repository');

describe('ConversationRepository Integration', { tags: ['db'] }, () => {
  let userId: string;
  let dbWabaId: string;
  let dbPhoneNumberId: string;
  let dbConvId: string;
  let systemUserToken: string;

  beforeEach(async () => {
    const user = await prisma.user.findUnique({
      where: { email: SEED_DATA.REGULAR_USER_EMAIL },
    });
    if (!user) {
      throw new Error(
        `Seed user ${SEED_DATA.REGULAR_USER_EMAIL} not found. Please run prisma db seed.`,
      );
    }
    userId = user.id;

    const waba = await prisma.whatsappBusinessAccount.findUnique({
      where: { wabaId: SEED_DATA.WABA_META_ID },
      include: { phoneNumbers: true },
    });
    if (!waba) {
      throw new Error(
        `Seeded WABA ${SEED_DATA.WABA_META_ID} not found. Please run prisma db seed.`,
      );
    }
    dbWabaId = waba.id;
    systemUserToken = waba.systemUserToken;

    const pn = waba.phoneNumbers.find(
      (p) => p.phoneNumberId === SEED_DATA.PHONE_META_ID,
    );
    if (!pn) {
      throw new Error(
        `Seeded Phone Number ${SEED_DATA.PHONE_META_ID} not found. Please run prisma db seed.`,
      );
    }
    dbPhoneNumberId = pn.id;

    const conv = await prisma.conversation.findFirst({
      where: {
        phoneNumberId: dbPhoneNumberId,
        contact: {
          customerPhone: SEED_DATA.CUSTOMER_PHONE,
        },
      },
    });
    if (!conv) {
      throw new Error(
        `Seeded Conversation for ${SEED_DATA.CUSTOMER_PHONE} not found. Please run prisma db seed.`,
      );
    }
    dbConvId = conv.id;
  });

  afterEach(async () => {
    const testCustomerPrefix = '999';
    await prisma.message.deleteMany({
      where: {
        conversation: {
          contact: { customerPhone: { startsWith: testCustomerPrefix } },
        },
      },
    });
    await prisma.conversation.deleteMany({
      where: {
        contact: { customerPhone: { startsWith: testCustomerPrefix } },
      },
    });
    await prisma.contact.deleteMany({
      where: { customerPhone: { startsWith: testCustomerPrefix } },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('findAllByWabaId', () => {
    it('returns all conversations for the seeded WABA', async () => {
      const { conversations } = await ConversationRepository.findAllByWabaId({
        wabaId: dbWabaId,
        userId,
      });

      expect(conversations?.length).toBeGreaterThanOrEqual(1);
      const seeded = conversations?.find((c) => c.id === dbConvId);
      expect(seeded).toBeDefined();
      expect(seeded?.contact.customerPhone).toBe(SEED_DATA.CUSTOMER_PHONE);
      // Verify latest message is included
      expect(seeded?.messages).toBeDefined();
      expect(seeded?.messages.length).toBeLessThanOrEqual(1);
    });
  });

  describe('getConversationMetaForSending', () => {
    it('fetches metadata for the seeded conversation', async () => {
      const result = await ConversationRepository.getConversationMetaForSending(
        {
          convId: dbConvId,
          wabaId: dbWabaId,
          userId,
        },
      );

      expect(result?.phoneNumber.phoneNumberId).toBe(SEED_DATA.PHONE_META_ID);
      expect(result?.phoneNumber.waba?.userId).toBe(userId);
    });
  });

  describe('findPhoneNumberByMetaId', () => {
    it('locates the seeded internal phone number by its Meta ID', async () => {
      const result = await ConversationRepository.findPhoneNumberByMetaId(
        SEED_DATA.PHONE_META_ID,
      );
      expect(result?.phoneNumberId).toBe(SEED_DATA.PHONE_META_ID);
    });
  });

  describe('prepareWebhookMessageConversation', () => {
    it('creates a conversation and returns storage key metadata for webhook media', async () => {
      const result =
        await ConversationRepository.prepareWebhookMessageConversation({
          phoneNumberId: dbPhoneNumberId,
          customerPhone: '999006',
          customerName: 'Webhook Media Customer',
        });

      expect(result).toMatchObject({
        userId,
        wabaId: dbWabaId,
        systemUserToken,
      });
      expect(result.conversation).toMatchObject({
        contact: {
          customerPhone: '999006',
          customerName: 'Webhook Media Customer',
        },
        phoneNumberId: dbPhoneNumberId,
        unreadCount: 0,
      });
      expect(result.conversation.id).toBeTruthy();
      expect(result.conversation.phoneNumber.waba.id).toBe(dbWabaId);
      expect(result.conversation.phoneNumber.waba.userId).toBe(userId);
    });

    it('reuses the existing conversation and updates the customer name', async () => {
      const first =
        await ConversationRepository.prepareWebhookMessageConversation({
          phoneNumberId: dbPhoneNumberId,
          customerPhone: '999007',
          customerName: 'Initial Webhook Customer',
        });

      const second =
        await ConversationRepository.prepareWebhookMessageConversation({
          phoneNumberId: dbPhoneNumberId,
          customerPhone: '999007',
          customerName: 'Updated Webhook Customer',
        });

      expect(second.conversation.id).toBe(first.conversation.id);
      expect(second.conversation.contact.customerName).toBe(
        'Updated Webhook Customer',
      );

      const conversationCount = await prisma.conversation.count({
        where: {
          phoneNumberId: dbPhoneNumberId,
          contact: { customerPhone: '999007' },
        },
      });
      expect(conversationCount).toBe(1);
    });
  });

  describe('admin takeover helpers', () => {
    it('finds an owned conversation and updates admin takeover', async () => {
      const contact = await prisma.contact.create({
        data: {
          customerPhone: '999003',
          customerName: 'Takeover Test Customer',
        },
      });
      const conversation = await prisma.conversation.create({
        data: {
          phoneNumberId: dbPhoneNumberId,
          contactId: contact.id,
          lastMessageAt: new Date(),
          lastCustomerMessageAt: new Date(),
        },
      });

      const found = await ConversationRepository.findConversationById({
        conversationId: conversation.id,
        userId,
        wabaId: dbWabaId,
      });

      expect(found?.id).toBe(conversation.id);
      expect(found?.contact.customerName).toBe('Takeover Test Customer');
      expect(found?.adminTakeover).toBe(false);
      expect(found?.status).toBe('active');
      expect(found?.createdAt).toBeInstanceOf(Date);
      expect(found?.updatedAt).toBeInstanceOf(Date);
      expect(found?.phoneNumber.id).toBe(dbPhoneNumberId);
      expect(found?.phoneNumber.displayPhoneNumber).toBeTruthy();
      expect(found?.phoneNumber.waba.userId).toBe(userId);

      const updated = await ConversationRepository.updateAdminTakeoverStatus({
        conversationId: conversation.id,
        adminTakeover: true,
      });

      expect(updated).toEqual({
        id: conversation.id,
        adminTakeover: true,
      });
    });

    it('returns null when the conversation does not exist', async () => {
      const result = await ConversationRepository.findConversationById({
        conversationId: 'missing-conversation-id',
        userId,
        wabaId: dbWabaId,
      });

      expect(result).toBeNull();
    });
  });

  describe('processIncomingMessage', () => {
    it('upserts a new conversation and message for a new customer', async () => {
      const result = await ConversationRepository.processIncomingMessage({
        phoneNumberId: dbPhoneNumberId,
        customerPhone: '999002',
        customerName: 'Test Customer',
        message: {
          messageId: 'wamid.test.1',
          type: 'text',
          content: 'Hello Test',
          timestamp: new Date(),
        },
      });

      expect(result.conversation.contact.customerPhone).toBe('999002');
      expect(result.conversation.phoneNumber).toBeDefined();
      expect(result.conversation.phoneNumber?.id).toBe(dbPhoneNumberId);
      expect(result.message.content).toBe('Hello Test');
      expect(result.userId).toBe(userId);
      expect(result.wabaId).toBe(dbWabaId);

      const savedPn = await prisma.phoneNumber.findUnique({
        where: { id: dbPhoneNumberId },
      });
      expect(savedPn?.unreadCount).toBeGreaterThan(0);
    });

    it('preserves the latest message timestamp when incoming messages arrive out of order', async () => {
      const newerTimestamp = new Date('2026-06-28T12:00:00.000Z');
      const olderTimestamp = new Date('2026-06-28T11:00:00.000Z');
      const customerPhone = '999008';

      await ConversationRepository.processIncomingMessage({
        phoneNumberId: dbPhoneNumberId,
        customerPhone,
        message: {
          messageId: 'wamid.incoming.test.newer',
          type: 'text',
          content: 'Newer incoming message',
          timestamp: newerTimestamp,
        },
      });

      const result = await ConversationRepository.processIncomingMessage({
        phoneNumberId: dbPhoneNumberId,
        customerPhone,
        message: {
          messageId: 'wamid.incoming.test.older',
          type: 'text',
          content: 'Older incoming message',
          timestamp: olderTimestamp,
        },
      });

      expect(result.conversation.lastMessageAt).toEqual(newerTimestamp);
      expect(result.conversation.lastCustomerMessageAt).toEqual(newerTimestamp);

      const savedConversation = await prisma.conversation.findFirstOrThrow({
        where: {
          phoneNumberId: dbPhoneNumberId,
          contact: { customerPhone },
        },
        include: {
          messages: { orderBy: { timestamp: 'desc' }, take: 1 },
        },
      });

      expect(savedConversation.lastMessageAt).toEqual(newerTimestamp);
      expect(savedConversation.lastCustomerMessageAt).toEqual(newerTimestamp);
      expect(savedConversation.messages[0]?.content).toBe(
        'Newer incoming message',
      );
    });
  });

  describe('processOutgoingMessageEcho', () => {
    it('stores an app-sent message without increasing unread counts', async () => {
      const phoneNumberBefore = await prisma.phoneNumber.findUniqueOrThrow({
        where: { id: dbPhoneNumberId },
      });
      const timestamp = new Date();

      const result = await ConversationRepository.processOutgoingMessageEcho({
        phoneNumberId: dbPhoneNumberId,
        customerPhone: '999004',
        message: {
          messageId: 'wamid.echo.test.1',
          type: 'text',
          content: 'Sent from WhatsApp Business App',
          timestamp,
        },
      });

      expect(result.conversation.contact.customerPhone).toBe('999004');
      expect(result.conversation.unreadCount).toBe(0);
      expect(result.conversation.lastCustomerMessageAt).toBeNull();
      expect(result.message).toMatchObject({
        direction: 'outgoing',
        source: 'whatsapp_app',
        status: 'sent',
        content: 'Sent from WhatsApp Business App',
      });
      expect(result.userId).toBe(userId);
      expect(result.wabaId).toBe(dbWabaId);

      const phoneNumberAfter = await prisma.phoneNumber.findUniqueOrThrow({
        where: { id: dbPhoneNumberId },
      });
      expect(phoneNumberAfter.unreadCount).toBe(phoneNumberBefore.unreadCount);
    });

    it('preserves the latest message timestamp when echoes arrive out of order', async () => {
      const newerTimestamp = new Date('2026-06-28T12:00:00.000Z');
      const olderTimestamp = new Date('2026-06-28T11:00:00.000Z');
      const customerPhone = '999005';

      await ConversationRepository.processOutgoingMessageEcho({
        phoneNumberId: dbPhoneNumberId,
        customerPhone,
        message: {
          messageId: 'wamid.echo.test.newer',
          type: 'text',
          content: 'Newer message',
          timestamp: newerTimestamp,
        },
      });

      const result = await ConversationRepository.processOutgoingMessageEcho({
        phoneNumberId: dbPhoneNumberId,
        customerPhone,
        message: {
          messageId: 'wamid.echo.test.older',
          type: 'text',
          content: 'Older message',
          timestamp: olderTimestamp,
        },
      });

      expect(result.conversation.lastMessageAt).toEqual(newerTimestamp);

      const savedConversation = await prisma.conversation.findFirstOrThrow({
        where: {
          phoneNumberId: dbPhoneNumberId,
          contact: { customerPhone },
        },
        include: {
          messages: { orderBy: { timestamp: 'desc' }, take: 1 },
        },
      });

      expect(savedConversation.lastMessageAt).toEqual(newerTimestamp);
      expect(savedConversation.messages[0]?.content).toBe('Newer message');
    });
  });
});
