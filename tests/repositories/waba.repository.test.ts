import prisma from '@/lib/server/prisma';
import { WabaRepository } from '@/repositories/waba.repository';
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

vi.unmock('@/repositories/waba.repository');

/**
 * WabaRepository Integration Tests
 * Reasoning: Verifies WABA-related queries (seeded data) and
 * Upsert operations (Embedded Signup flow) in a single suite.
 */

describe('WabaRepository Integration', { tags: ['db'] }, () => {
  let userId: string;
  let anotherUserId: string;
  let dbWabaId: string;

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

    const anotherUser = await prisma.user.findFirst({
      where: { id: { not: user.id } },
    });
    if (!anotherUser) {
      throw new Error('A second user is required for this test suite.');
    }
    anotherUserId = anotherUser.id;

    const waba = await prisma.whatsappBusinessAccount.findUnique({
      where: { wabaId: SEED_DATA.WABA_META_ID },
    });
    if (!waba) {
      throw new Error(
        `Seeded WABA ${SEED_DATA.WABA_META_ID} not found. Please run prisma db seed.`,
      );
    }
    dbWabaId = waba.id;

    const webhook = await prisma.botWebhook.findFirst({
      where: { name: SEED_DATA.WEBHOOK_NAME, userId: userId },
    });
    if (!webhook) {
      throw new Error(
        `Seeded Webhook ${SEED_DATA.WEBHOOK_NAME} not found. Please run prisma db seed.`,
      );
    }
  });

  afterEach(async () => {
    // Cleanup test-specific data
    await prisma.phoneNumber.deleteMany({
      where: { phoneNumberId: 'test-upsert-phone-999' },
    });
    await prisma.whatsappBusinessAccount.deleteMany({
      where: {
        OR: [
          { wabaId: 'test-upsert-waba-999' },
          { name: { contains: 'Test-Waba-' } },
          { name: 'Test Salon' },
        ],
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // --- Query Operations ---

  describe('findAllByUserId', () => {
    it('returns wabas belonging to the seeded user', async () => {
      const result = await WabaRepository.findAllByUserId(userId);
      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(result.some((w) => w.id === dbWabaId)).toBe(true);
    });
  });

  describe('findPaginated', () => {
    it('returns paginated results including the seeded WABA', async () => {
      const result = await WabaRepository.findPaginated({
        limit: 10,
        offset: 0,
      });
      expect(result.total).toBeGreaterThanOrEqual(1);
      expect(result.wabas.some((w) => w.id === dbWabaId)).toBe(true);
    });
  });

  describe('findPaginatedByUserId', () => {
    it('returns paginated results for the seeded user', async () => {
      const result = await WabaRepository.findPaginatedByUserId({
        limit: 10,
        offset: 0,
        userId,
      });
      expect(result.total).toBeGreaterThanOrEqual(1);
      expect(result.wabas.every((w) => w.userId === userId)).toBe(true);
    });
  });

  describe('getTotalUnreadListByUserId', () => {
    it('computes total unread messages for the seeded user', async () => {
      const result = await WabaRepository.getTotalUnreadListByUserId(userId);
      expect(result.length).toBeGreaterThanOrEqual(1);
      const seeded = result.find((w) => w.id === dbWabaId);
      expect(seeded).toBeDefined();
    });
  });

  describe('findById', () => {
    it('finds the seeded WABA by its internal ID', async () => {
      const result = await WabaRepository.findById(dbWabaId);
      expect(result?.id).toBe(dbWabaId);
    });
  });

  describe('findByMetaWabaId', () => {
    it('finds the seeded WABA by its Meta WABA id', async () => {
      const result = await WabaRepository.findByMetaWabaId({
        wabaId: SEED_DATA.WABA_META_ID,
      });

      expect(result).toMatchObject({
        id: dbWabaId,
        wabaId: SEED_DATA.WABA_META_ID,
        userId,
        systemUserToken: SEED_DATA.SYSTEM_USER_TOKEN,
      });
    });

    it('returns null when the Meta WABA id does not exist', async () => {
      const result = await WabaRepository.findByMetaWabaId({
        wabaId: 'missing-meta-waba-id',
      });

      expect(result).toBeNull();
    });
  });

  const TEST_WABA_ID = 'test-upsert-waba-999';

  describe('updateStatusByMetaWabaId', () => {
    it('updates WABA status by Meta WABA id', async () => {
      await WabaRepository.upsertWaba({
        wabaId: TEST_WABA_ID,
        userId,
        systemUserToken: 'enc:mock-token',
        name: 'Test-Waba-Status',
      });

      const result = await WabaRepository.updateStatusByMetaWabaId({
        wabaId: TEST_WABA_ID,
        status: 'disconnected',
      });

      expect(result.count).toBe(1);

      const updated = await prisma.whatsappBusinessAccount.findUnique({
        where: { wabaId: TEST_WABA_ID },
      });
      expect(updated?.status).toBe('disconnected');
    });
  });

  // --- Upsert Operations (Embedded Signup) ---

  describe('upsertWaba', () => {
    it('creates a new WhatsappBusinessAccount on first call', async () => {
      const result = await WabaRepository.upsertWaba({
        wabaId: TEST_WABA_ID,
        userId,
        systemUserToken: 'enc:mock-token',
        name: 'Test Salon',
      });

      expect(result.wabaId).toBe(TEST_WABA_ID);
      expect(result.name).toBe('Test Salon');
      expect(result.status).toBe('active');
    });

    it('updates token and status on subsequent calls (idempotent)', async () => {
      await WabaRepository.upsertWaba({
        wabaId: TEST_WABA_ID,
        userId,
        systemUserToken: 'enc:old-token',
        name: 'Original Name',
      });

      const updated = await WabaRepository.upsertWaba({
        wabaId: TEST_WABA_ID,
        userId,
        systemUserToken: 'enc:new-token',
        name: 'Updated Name',
      });

      expect(updated.systemUserToken).toBe('enc:new-token');
      expect(updated.name).toBe('Updated Name');
    });

    it('preserves null name when not provided on create', async () => {
      await WabaRepository.upsertWaba({
        wabaId: TEST_WABA_ID,
        userId,
        systemUserToken: 'enc:tok',
        name: null,
      });

      const result = await prisma.whatsappBusinessAccount.findUnique({
        where: { wabaId: TEST_WABA_ID },
      });
      expect(result?.name).toBeNull();
    });

    it('throws when the WABA already belongs to a different user', async () => {
      await WabaRepository.upsertWaba({
        wabaId: TEST_WABA_ID,
        userId,
        systemUserToken: 'enc:owner-token',
        name: 'Owner Waba',
      });

      await expect(
        WabaRepository.upsertWaba({
          wabaId: TEST_WABA_ID,
          userId: anotherUserId,
          systemUserToken: 'enc:intruder-token',
          name: 'Intruder Waba',
        }),
      ).rejects.toMatchObject({
        status: 409,
        message:
          'This WhatsApp Business Account is already connected to another user',
      });

      const result = await prisma.whatsappBusinessAccount.findUnique({
        where: { wabaId: TEST_WABA_ID },
      });
      expect(result?.userId).toBe(userId);
      expect(result?.systemUserToken).toBe('enc:owner-token');
    });
  });
});
