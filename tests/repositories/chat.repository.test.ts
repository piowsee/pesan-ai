import prisma from '@/lib/prisma';
import { ChatRepository } from '@/repositories/chat.repository';
import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

vi.unmock('@/repositories/chat.repository.ts');

describe('ChatRepository Integration', { tags: ['db'] }, () => {
  let userId: string;
  let dbPhoneNumberId: string;
  const SEED_EMAIL = 'user@piowsee.com';
  const SEED_WABA_ID = '123456789012345';
  const SEED_PHONE_ID = '979032335300118';
  const SEED_CONV_ID = 'convs_seed_123';
  const SEED_CUSTOMER_PHONE = '628123456789';

  beforeEach(async () => {
    const user = await prisma.user.findUnique({
      where: { email: SEED_EMAIL },
    });
    if (!user) {
      throw new Error(
        `Seed user ${SEED_EMAIL} not found. Please run prisma db seed.`,
      );
    }
    userId = user.id;

    const waba = await prisma.whatsappBusinessAccount.findFirst({
      where: { wabaId: SEED_WABA_ID, userId },
      include: { phoneNumbers: true },
    });
    if (!waba) {
      throw new Error(
        `Seeded WABA ${SEED_WABA_ID} not found. Please run prisma db seed.`,
      );
    }

    const pn = waba.phoneNumbers.find((p) => p.phoneNumberId === SEED_PHONE_ID);
    if (!pn) {
      throw new Error(
        `Seeded Phone Number ${SEED_PHONE_ID} not found. Please run prisma db seed.`,
      );
    }
    dbPhoneNumberId = pn.id;
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

  describe('findPaginatedByWabaId', () => {
    it('returns paginated conversations for the seeded WABA', async () => {
      const { chats, total } = await ChatRepository.findPaginatedByWabaId(
        SEED_WABA_ID,
        userId,
        10,
        0,
      );

      expect(chats?.length).toBeGreaterThanOrEqual(1);
      expect(total).toBeGreaterThanOrEqual(1);
      const seeded = chats?.find((c) => c.id === SEED_CONV_ID);
      expect(seeded).toBeDefined();
      expect(seeded?.customerPhone).toBe(SEED_CUSTOMER_PHONE);
      // Verify latest message is included
      expect(seeded?.messages).toBeDefined();
      expect(seeded?.messages.length).toBeLessThanOrEqual(1);
    });
  });

  describe('getChatMetaForSending', () => {
    it('fetches metadata for the seeded conversation', async () => {
      const result = await ChatRepository.getChatMetaForSending(
        SEED_CONV_ID,
        userId,
        true,
      );

      expect(result?.phoneNumber.phoneNumberId).toBe(SEED_PHONE_ID);
      expect(result?.phoneNumber.waba?.userId).toBe(userId);
    });
  });

  describe('findPhoneNumberByMetaId', () => {
    it('locates the seeded internal phone number by its Meta ID', async () => {
      const result =
        await ChatRepository.findPhoneNumberByMetaId(SEED_PHONE_ID);
      expect(result?.phoneNumberId).toBe(SEED_PHONE_ID);
    });
  });

  describe('processIncomingMessage', () => {
    it('upserts a new conversation and message for a new customer', async () => {
      const result = await ChatRepository.processIncomingMessage({
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
      expect(result.message.content).toBe('Hello Test');

      const savedPn = await prisma.phoneNumber.findUnique({
        where: { id: dbPhoneNumberId },
      });
      expect(savedPn?.unreadCount).toBeGreaterThan(0);
    });
  });
});
