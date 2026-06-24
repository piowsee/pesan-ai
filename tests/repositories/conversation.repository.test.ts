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

vi.unmock('@/repositories/conversation.repository.ts');

describe('ConversationRepository Integration', { tags: ['db'] }, () => {
  let userId: string;
  let dbWabaId: string;
  let dbPhoneNumberId: string;
  let dbConvId: string;

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

    const pn = waba.phoneNumbers.find(
      (p) => p.phoneNumberId === SEED_DATA.PHONE_META_ID,
    );
    if (!pn) {
      throw new Error(
        `Seeded Phone Number ${SEED_DATA.PHONE_META_ID} not found. Please run prisma db seed.`,
      );
    }
    dbPhoneNumberId = pn.id;

    const conv = await prisma.conversation.findUnique({
      where: {
        unique_conversation: {
          phoneNumberId: dbPhoneNumberId,
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
        conversation: { customerPhone: { startsWith: testCustomerPrefix } },
      },
    });
    await prisma.conversation.deleteMany({
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
      expect(seeded?.customerPhone).toBe(SEED_DATA.CUSTOMER_PHONE);
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

  describe('admin takeover helpers', () => {
    it('finds an owned conversation and updates admin takeover', async () => {
      const conversation = await prisma.conversation.create({
        data: {
          phoneNumberId: dbPhoneNumberId,
          customerPhone: '999003',
          customerName: 'Takeover Test Customer',
          lastMessageAt: new Date(),
          lastCustomerMessageAt: new Date(),
        },
      });

      const found = await ConversationRepository.findConversationById({
        conversationId: conversation.id,
      });

      expect(found?.id).toBe(conversation.id);
      expect(found?.customerName).toBe('Takeover Test Customer');
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

      expect(result.conversation.customerPhone).toBe('999002');
      expect(result.conversation.phoneNumber).toBeDefined();
      expect(result.conversation.phoneNumber?.id).toBe(dbPhoneNumberId);
      expect(result.message.content).toBe('Hello Test');

      const savedPn = await prisma.phoneNumber.findUnique({
        where: { id: dbPhoneNumberId },
      });
      expect(savedPn?.unreadCount).toBeGreaterThan(0);
    });
  });
});
