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
});
