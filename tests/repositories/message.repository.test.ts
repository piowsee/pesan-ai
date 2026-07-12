import prisma from '@/lib/server/prisma';
import { MessageRepository } from '@/repositories/message.repository';
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

vi.unmock('@/repositories/message.repository');
vi.unmock('@/repositories/contact.repository');
vi.unmock('@/repositories/conversation.repository');

describe('MessageRepository Integration', { tags: ['db'] }, () => {
  let userId: string;
  let dbWabaId: string;
  let dbPhoneNumberId: string;
  let dbConvId: string;

  beforeEach(async () => {
    const user = await prisma.user.findUnique({
      where: { email: SEED_DATA.REGULAR_USER_EMAIL },
    });
    if (!user) {
      throw new Error(`Seed user ${SEED_DATA.REGULAR_USER_EMAIL} not found.`);
    }
    userId = user.id;

    const waba = await prisma.whatsappBusinessAccount.findUnique({
      where: { wabaId: SEED_DATA.WABA_META_ID },
      include: { phoneNumbers: true },
    });
    if (!waba) {
      throw new Error(`Seeded WABA ${SEED_DATA.WABA_META_ID} not found.`);
    }
    dbWabaId = waba.id;

    const pn = waba.phoneNumbers.find(
      (p) => p.phoneNumberId === SEED_DATA.PHONE_META_ID,
    );
    if (!pn) {
      throw new Error(
        `Seeded Phone Number ${SEED_DATA.PHONE_META_ID} not found.`,
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
        `Seeded Conversation for ${SEED_DATA.CUSTOMER_PHONE} not found.`,
      );
    }
    dbConvId = conv.id;
  });

  afterEach(async () => {
    const testCustomerPrefix = '998';
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

  describe('findMessagesPaginated', () => {
    it('returns paginated messages for the seeded conversation', async () => {
      const result = await MessageRepository.findMessagesPaginated({
        convId: dbConvId,
        wabaId: dbWabaId,
        userId,
        limit: 5,
        offset: 0,
      });

      expect(result).not.toBeNull();
      if (result) {
        expect(result.messages.length).toBeGreaterThanOrEqual(1);
        expect(result.total).toBeGreaterThanOrEqual(1);
      }
    });

    it('returns null for unowned conversation', async () => {
      const result = await MessageRepository.findMessagesPaginated({
        convId: dbConvId,
        wabaId: dbWabaId,
        userId: 'wrong-user-id',
        limit: 5,
        offset: 0,
      });
      expect(result).toBeNull();
    });
  });

  describe('findConversationMessageHistory', () => {
    it('returns recent messages of any type in chronological order', async () => {
      const contact = await prisma.contact.create({
        data: {
          customerPhone: '998006',
          phoneNumberId: dbPhoneNumberId,
        },
      });
      const conversation = await prisma.conversation.create({
        data: {
          contactId: contact.id,
          phoneNumberId: dbPhoneNumberId,
        },
      });
      await prisma.message.createMany({
        data: [
          {
            conversationId: conversation.id,
            messageId: 'history-newer',
            direction: 'incoming',
            source: 'customer',
            type: 'text',
            content: 'second',
            status: 'delivered',
            timestamp: new Date('2026-06-24T10:01:00.000Z'),
            createdAt: new Date('2026-06-24T10:01:01.000Z'),
          },
          {
            conversationId: conversation.id,
            messageId: 'history-older',
            direction: 'outgoing',
            source: 'bot',
            type: 'text',
            content: 'first',
            status: 'sent',
            timestamp: new Date('2026-06-24T10:00:00.000Z'),
            createdAt: new Date('2026-06-24T10:00:01.000Z'),
          },
          {
            conversationId: conversation.id,
            messageId: 'history-non-text',
            direction: 'incoming',
            source: 'customer',
            type: 'image',
            content: 'ignored caption',
            status: 'delivered',
            timestamp: new Date('2026-06-24T10:02:00.000Z'),
            createdAt: new Date('2026-06-24T10:02:01.000Z'),
          },
          {
            conversationId: conversation.id,
            messageId: 'history-stale',
            direction: 'incoming',
            source: 'customer',
            type: 'text',
            content: 'stale',
            status: 'delivered',
            timestamp: new Date('2026-06-24T09:00:00.000Z'),
            createdAt: new Date('2026-06-24T09:00:01.000Z'),
          },
          {
            conversationId: conversation.id,
            messageId: 'history-after-expiry',
            direction: 'incoming',
            source: 'customer',
            type: 'text',
            content: 'next debounce cycle',
            status: 'delivered',
            timestamp: new Date('2026-06-24T10:01:30.000Z'),
            createdAt: new Date('2026-06-24T10:03:00.000Z'),
          },
        ],
      });

      const history = await MessageRepository.findConversationMessageHistory({
        conversationId: conversation.id,
        since: new Date('2026-06-24T09:30:00.000Z'),
        createdBeforeOrAt: new Date('2026-06-24T10:02:30.000Z'),
      });

      expect(history).toEqual([
        {
          sequence: 1,
          type: 'text',
          source: 'bot',
          direction: 'outgoing',
          timestamp: new Date('2026-06-24T10:00:00.000Z'),
          content: 'first',
        },
        {
          sequence: 2,
          type: 'text',
          source: 'customer',
          direction: 'incoming',
          timestamp: new Date('2026-06-24T10:01:00.000Z'),
          content: 'second',
        },
        {
          sequence: 3,
          type: 'image',
          source: 'customer',
          direction: 'incoming',
          timestamp: new Date('2026-06-24T10:02:00.000Z'),
          content: 'ignored caption',
        },
      ]);
    });
  });

  describe('updateStatusesByMetaMessageIds', () => {
    it('updates outgoing messages by Meta message ID and returns routing data', async () => {
      const contact = await prisma.contact.create({
        data: {
          customerPhone: '998007',
          phoneNumberId: dbPhoneNumberId,
        },
      });
      const conversation = await prisma.conversation.create({
        data: {
          contactId: contact.id,
          phoneNumberId: dbPhoneNumberId,
        },
      });
      const message = await prisma.message.create({
        data: {
          conversationId: conversation.id,
          messageId: 'status-update-message-1',
          direction: 'outgoing',
          source: 'admin',
          type: 'text',
          content: 'status me',
          status: 'sent',
          timestamp: new Date('2026-07-05T10:00:00.000Z'),
        },
      });

      const result = await MessageRepository.updateStatusesByMetaMessageIds([
        {
          messageId: 'status-update-message-1',
          status: 'read',
          errorMessage: null,
        },
      ]);

      expect(result).toEqual([
        {
          id: message.id,
          messageId: 'status-update-message-1',
          status: 'read',
          errorMessage: null,
          conversationId: conversation.id,
          userId,
          wabaId: dbWabaId,
        },
      ]);

      const updatedMessage = await prisma.message.findUnique({
        where: { messageId: 'status-update-message-1' },
      });
      expect(updatedMessage?.status).toBe('read');
    });

    it('ignores incoming messages and unknown Meta message IDs', async () => {
      const contact = await prisma.contact.create({
        data: {
          customerPhone: '998008',
          phoneNumberId: dbPhoneNumberId,
        },
      });
      const conversation = await prisma.conversation.create({
        data: {
          contactId: contact.id,
          phoneNumberId: dbPhoneNumberId,
        },
      });
      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          messageId: 'incoming-status-ignored',
          direction: 'incoming',
          source: 'customer',
          type: 'text',
          content: 'customer message',
          status: 'delivered',
          timestamp: new Date('2026-07-05T10:00:00.000Z'),
        },
      });

      const result = await MessageRepository.updateStatusesByMetaMessageIds([
        {
          messageId: 'incoming-status-ignored',
          status: 'read',
          errorMessage: null,
        },
        {
          messageId: 'missing-status-message',
          status: 'read',
          errorMessage: null,
        },
      ]);

      expect(result).toEqual([]);

      const incomingMessage = await prisma.message.findUnique({
        where: { messageId: 'incoming-status-ignored' },
      });
      expect(incomingMessage?.status).toBe('delivered');
    });
  });

  describe('saveMessage', () => {
    it('saves a message successfully', async () => {
      const contact = await prisma.contact.create({
        data: {
          customerPhone: '998005',
          phoneNumberId: dbPhoneNumberId,
        },
      });
      const testConv = await prisma.conversation.create({
        data: {
          contactId: contact.id,
          phoneNumberId: dbPhoneNumberId,
        },
      });

      const result = await MessageRepository.saveMessage({
        conversationId: testConv.id,
        direction: 'outgoing',
        source: 'admin',
        type: 'text',
        content: 'Repo Test Message',
        status: 'sent',
        timestamp: new Date(),
      });

      expect(result.content).toBe('Repo Test Message');
      expect(result.conversationId).toBe(testConv.id);
    });
  });

  describe('processIncomingMessage', () => {
    it('upserts a new conversation and message for a new customer', async () => {
      const result = await MessageRepository.processIncomingMessage({
        phoneNumberId: dbPhoneNumberId,
        messagingProduct: 'whatsapp',
        customerPhone: '998002',
        customerName: 'Test Customer',
        message: {
          messageId: 'wamid.test.1',
          type: 'text',
          content: 'Hello Test',
          timestamp: new Date(),
          status: 'read',
          source: 'whatsapp_app',
        },
      });

      expect(result.conversation.contact.customerPhone).toBe('998002');
      expect(result.conversation.phoneNumber).toBeDefined();
      expect(result.conversation.phoneNumber?.id).toBe(dbPhoneNumberId);
      expect(result.message.content).toBe('Hello Test');
      expect(result.message.status).toBe('read');
      expect(result.message.source).toBe('whatsapp_app');
      expect(result.userId).toBe(userId);
      expect(result.wabaId).toBe(dbWabaId);
      expect(result.conversation.messagingProduct).toBe('whatsapp');

      const savedPn = await prisma.phoneNumber.findUnique({
        where: { id: dbPhoneNumberId },
      });
      expect(savedPn?.unreadCount).toBeGreaterThan(0);
    });

    it('preserves the latest message timestamp when incoming messages arrive out of order', async () => {
      const newerTimestamp = new Date('2026-06-28T12:00:00.000Z');
      const olderTimestamp = new Date('2026-06-28T11:00:00.000Z');
      const customerPhone = '998009';

      await MessageRepository.processIncomingMessage({
        phoneNumberId: dbPhoneNumberId,
        customerPhone,
        message: {
          messageId: 'wamid.incoming.test.newer',
          type: 'text',
          content: 'Newer incoming message',
          timestamp: newerTimestamp,
        },
      });

      const result = await MessageRepository.processIncomingMessage({
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

    it('upserts an existing incoming message idempotently without creating duplicates', async () => {
      const messageId = 'wamid.incoming.test.idempotent';
      const timestamp = new Date('2026-06-28T12:00:00.000Z');
      const customerPhone = '998010';

      const firstCall = await MessageRepository.processIncomingMessage({
        phoneNumberId: dbPhoneNumberId,
        customerPhone,
        message: {
          messageId,
          type: 'text',
          content: 'First incoming payload',
          timestamp,
        },
      });

      const secondCall = await MessageRepository.processIncomingMessage({
        phoneNumberId: dbPhoneNumberId,
        customerPhone,
        message: {
          messageId,
          type: 'text',
          content: 'Updated payload content',
          timestamp,
        },
      });

      expect(firstCall.message.id).toBe(secondCall.message.id);
      expect(secondCall.message.content).toBe('Updated payload content');

      const messagesCount = await prisma.message.count({
        where: { messageId },
      });
      expect(messagesCount).toBe(1);
    });
  });

  describe('processOutgoingMessageEcho', () => {
    it('stores an app-sent message without increasing unread counts', async () => {
      const phoneNumberBefore = await prisma.phoneNumber.findUniqueOrThrow({
        where: { id: dbPhoneNumberId },
      });
      const timestamp = new Date();

      const result = await MessageRepository.processOutgoingMessageEcho({
        phoneNumberId: dbPhoneNumberId,
        messagingProduct: 'whatsapp',
        customerPhone: '998004',
        message: {
          messageId: 'wamid.echo.test.1',
          type: 'text',
          content: 'Sent from WhatsApp Business App',
          timestamp,
          status: 'read',
          source: 'admin',
        },
      });

      expect(result.conversation.contact.customerPhone).toBe('998004');
      expect(result.conversation.unreadCount).toBe(0);
      expect(result.conversation.lastCustomerMessageAt).toBeNull();
      expect(result.message).toMatchObject({
        direction: 'outgoing',
        source: 'admin',
        status: 'read',
        content: 'Sent from WhatsApp Business App',
      });
      expect(result.userId).toBe(userId);
      expect(result.wabaId).toBe(dbWabaId);
      expect(result.conversation.messagingProduct).toBe('whatsapp');

      const phoneNumberAfter = await prisma.phoneNumber.findUniqueOrThrow({
        where: { id: dbPhoneNumberId },
      });
      expect(phoneNumberAfter.unreadCount).toBe(phoneNumberBefore.unreadCount);
    });

    it('preserves the latest message timestamp when echoes arrive out of order', async () => {
      const newerTimestamp = new Date('2026-06-28T12:00:00.000Z');
      const olderTimestamp = new Date('2026-06-28T11:00:00.000Z');
      const customerPhone = '998003';

      await MessageRepository.processOutgoingMessageEcho({
        phoneNumberId: dbPhoneNumberId,
        customerPhone,
        message: {
          messageId: 'wamid.echo.test.newer',
          type: 'text',
          content: 'Newer message',
          timestamp: newerTimestamp,
        },
      });

      const result = await MessageRepository.processOutgoingMessageEcho({
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

    it('upserts an existing outgoing message idempotently without creating duplicates', async () => {
      const messageId = 'wamid.echo.test.idempotent';
      const timestamp = new Date('2026-06-28T12:00:00.000Z');
      const customerPhone = '998011';

      const firstCall = await MessageRepository.processOutgoingMessageEcho({
        phoneNumberId: dbPhoneNumberId,
        customerPhone,
        message: {
          messageId,
          type: 'text',
          content: 'First echo payload',
          timestamp,
        },
      });

      const secondCall = await MessageRepository.processOutgoingMessageEcho({
        phoneNumberId: dbPhoneNumberId,
        customerPhone,
        message: {
          messageId,
          type: 'text',
          content: 'Updated echo payload',
          timestamp,
        },
      });

      expect(firstCall.message.id).toBe(secondCall.message.id);
      expect(secondCall.message.content).toBe('Updated echo payload');

      const messagesCount = await prisma.message.count({
        where: { messageId },
      });
      expect(messagesCount).toBe(1);
    });
  });

  describe('processHistoryMessage', () => {
    it('upserts a history message and contact with bsuid', async () => {
      const result = await MessageRepository.processHistoryMessage({
        phoneNumberId: dbPhoneNumberId,
        messagingProduct: 'whatsapp',
        customerPhone: '998012',
        bsuid: 'test-bsuid-123',
        isOutgoing: false,
        message: {
          messageId: 'wamid.history.test.1',
          type: 'text',
          content: 'Hello History',
          timestamp: new Date(),
          status: 'delivered',
          source: 'whatsapp_app',
        },
      });

      expect(result.conversation.contact.customerPhone).toBe('998012');
      expect(result.message.content).toBe('Hello History');
      expect(result.message.status).toBe('delivered');
      expect(result.message.direction).toBe('incoming');
      expect(result.conversation.unreadCount).toBeGreaterThan(0);
    });

    it('upserts an outgoing history message correctly', async () => {
      const result = await MessageRepository.processHistoryMessage({
        phoneNumberId: dbPhoneNumberId,
        messagingProduct: 'whatsapp',
        customerPhone: '998013',
        isOutgoing: true,
        message: {
          messageId: 'wamid.history.test.2',
          type: 'text',
          content: 'Hello Outgoing History',
          timestamp: new Date(),
          status: 'read',
          source: 'whatsapp_app',
        },
      });

      expect(result.conversation.contact.customerPhone).toBe('998013');
      expect(result.message.content).toBe('Hello Outgoing History');
      expect(result.message.status).toBe('read');
      expect(result.message.direction).toBe('outgoing');
    });
  });
  describe('processBulkHistoryThread', () => {
    it('processes multiple messages and aggregates unread counts and timestamps correctly', async () => {
      const phoneNumberBefore = await prisma.phoneNumber.findUniqueOrThrow({
        where: { id: dbPhoneNumberId },
      });
      const customerPhone = '998015';

      const olderTimestamp = new Date('2026-06-28T11:00:00.000Z');
      const newerTimestamp = new Date('2026-06-28T12:00:00.000Z');
      const middleTimestamp = new Date('2026-06-28T11:30:00.000Z');

      const result = await MessageRepository.processBulkHistoryThread({
        phoneNumberId: dbPhoneNumberId,
        messagingProduct: 'whatsapp',
        customerPhone,
        bsuid: 'test-bulk-bsuid',
        messages: [
          {
            isOutgoing: false,
            messageId: 'wamid.bulk.test.1',
            type: 'text',
            content: 'Incoming unread 1',
            timestamp: olderTimestamp,
            status: 'delivered',
            source: 'whatsapp_app',
          },
          {
            isOutgoing: true,
            messageId: 'wamid.bulk.test.2',
            type: 'text',
            content: 'Outgoing 1',
            timestamp: middleTimestamp,
            status: 'read',
            source: 'whatsapp_app',
          },
          {
            isOutgoing: false,
            messageId: 'wamid.bulk.test.3',
            type: 'text',
            content: 'Incoming unread 2',
            timestamp: newerTimestamp,
            status: 'delivered',
            source: 'whatsapp_app',
          },
        ],
      });

      expect(result).toBeDefined();
      expect(result?.processedCount).toBe(3);

      const conversation = await prisma.conversation.findUniqueOrThrow({
        where: { id: result!.conversationId },
        include: { contact: true, messages: { orderBy: { timestamp: 'asc' } } },
      });

      expect(conversation.contact.customerPhone).toBe(customerPhone);
      expect(conversation.contact.bsuid).toBe('test-bulk-bsuid');

      // Total unread increment should be 2 (from the two incoming delivered messages)
      expect(conversation.unreadCount).toBe(2);

      // lastMessageAt should be the newest timestamp
      expect(conversation.lastMessageAt).toEqual(newerTimestamp);
      expect(conversation.lastCustomerMessageAt).toEqual(newerTimestamp);

      const phoneNumberAfter = await prisma.phoneNumber.findUniqueOrThrow({
        where: { id: dbPhoneNumberId },
      });
      // unread incremented by 2
      expect(phoneNumberAfter.unreadCount).toBe(
        phoneNumberBefore.unreadCount + 2,
      );

      // Verify messages inserted
      expect(conversation.messages.length).toBe(3);
      expect(conversation.messages[0].messageId).toBe('wamid.bulk.test.1');
      expect(conversation.messages[1].messageId).toBe('wamid.bulk.test.2');
      expect(conversation.messages[2].messageId).toBe('wamid.bulk.test.3');
    });

    it('skips duplicate messages gracefully', async () => {
      const customerPhone = '998016';
      const timestamp = new Date();

      // First run
      await MessageRepository.processBulkHistoryThread({
        phoneNumberId: dbPhoneNumberId,
        customerPhone,
        messages: [
          {
            isOutgoing: true,
            messageId: 'wamid.bulk.dup.1',
            type: 'text',
            content: 'Initial message',
            timestamp,
            status: 'read',
          },
        ],
      });

      // Second run with same message ID
      await MessageRepository.processBulkHistoryThread({
        phoneNumberId: dbPhoneNumberId,
        customerPhone,
        messages: [
          {
            isOutgoing: true,
            messageId: 'wamid.bulk.dup.1',
            type: 'text',
            content: 'Duplicate message',
            timestamp,
            status: 'read',
          },
        ],
      });

      const count = await prisma.message.count({
        where: { messageId: 'wamid.bulk.dup.1' },
      });
      expect(count).toBe(1);
    });
  });
});
