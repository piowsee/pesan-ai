import prisma from '@/lib/prisma';
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

vi.unmock('@/repositories/message.repository');

describe('MessageRepository Integration', { tags: ['db'] }, () => {
  let userId: string;
  let dbPhoneNumberId: string;
  const SEED_EMAIL = 'user@piowsee.com';
  const SEED_WABA_ID = '123456789012345';
  const SEED_PHONE_ID = '979032335300118';
  const SEED_CONV_ID = 'convs_seed_123';

  beforeEach(async () => {
    const user = await prisma.user.findUnique({
      where: { email: SEED_EMAIL },
    });
    if (!user) {
      throw new Error(`Seed user ${SEED_EMAIL} not found.`);
    }
    userId = user.id;

    const waba = await prisma.whatsappBusinessAccount.findFirst({
      where: { wabaId: SEED_WABA_ID, userId },
      include: { phoneNumbers: true },
    });
    if (!waba) {
      throw new Error(`Seeded WABA ${SEED_WABA_ID} not found.`);
    }

    const pn = waba.phoneNumbers.find((p) => p.phoneNumberId === SEED_PHONE_ID);
    if (!pn) {
      throw new Error(`Seeded Phone Number ${SEED_PHONE_ID} not found.`);
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

  describe('findMessagesPaginated', () => {
    it('returns paginated messages for the seeded conversation', async () => {
      const result = await MessageRepository.findMessagesPaginated(
        SEED_CONV_ID,
        SEED_WABA_ID,
        userId,
        5,
        0,
      );

      expect(result).not.toBeNull();
      if (result) {
        expect(result.messages.length).toBeGreaterThanOrEqual(1);
        expect(result.total).toBeGreaterThanOrEqual(1);
      }
    });

    it('returns null for unowned conversation', async () => {
      const result = await MessageRepository.findMessagesPaginated(
        SEED_CONV_ID,
        SEED_WABA_ID,
        'wrong-user-id',
        5,
        0,
      );
      expect(result).toBeNull();
    });
  });

  describe('saveMessage', () => {
    it('saves a message successfully', async () => {
      const testConv = await prisma.conversation.create({
        data: {
          customerPhone: '999005',
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
