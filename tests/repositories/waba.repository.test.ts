import prisma from '@/lib/prisma';
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

vi.unmock('@/repositories/waba.repository.ts');

/**
 * WabaRepository Integration Tests (Synced with Seed)
 * Reasoning: Verifies WABA-related queries against the baseline seeded data.
 * Ensures pagination, ownership, and unread count aggregations are
 * consistent with the standard project seed.
 */

describe('WabaRepository Integration', { tags: ['db'] }, () => {
  let userId: string;
  let dbWabaId: string;
  const SEED_EMAIL = 'user@piowsee.com';
  const SEED_WABA_ID = '123456789012345';
  const SEED_WEBHOOK_ID = 'webhook_seed_123';

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
    });
    if (!waba) {
      throw new Error(
        `Seeded WABA ${SEED_WABA_ID} not found. Please run prisma db seed.`,
      );
    }
    dbWabaId = waba.id;
  });

  afterEach(async () => {
    // Cleanup only test-specific WABAs
    await prisma.whatsappBusinessAccount.deleteMany({
      where: {
        businessName: { contains: 'Test-Waba-' },
        userId: userId,
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('findAllByUserId', () => {
    it('returns wabas belonging to the seeded user', async () => {
      const result = await WabaRepository.findAllByUserId(userId);

      expect(result.length).toBeGreaterThanOrEqual(1);
      const seeded = result.find((w) => w.wabaId === SEED_WABA_ID);
      expect(seeded).toBeDefined();
    });
  });

  describe('findPaginated', () => {
    it('returns paginated results including the seeded WABA', async () => {
      const result = await WabaRepository.findPaginated(10, 0);

      expect(result.total).toBeGreaterThanOrEqual(1);
      expect(result.wabas.some((w) => w.wabaId === SEED_WABA_ID)).toBe(true);
    });
  });

  describe('findPaginatedByUserId', () => {
    it('returns paginated results for the seeded user', async () => {
      const result = await WabaRepository.findPaginatedByUserId(10, 0, userId);

      expect(result.total).toBeGreaterThanOrEqual(1);
      expect(result.wabas.some((w) => w.wabaId === SEED_WABA_ID)).toBe(true);
      expect(result.wabas.every((w) => w.userId === userId)).toBe(true);
    });
  });

  describe('getTotalUnreadListByUserId', () => {
    it('computes total unread messages for the seeded user', async () => {
      const result = await WabaRepository.getTotalUnreadListByUserId(userId);

      expect(result.length).toBeGreaterThanOrEqual(1);
      const seeded = result.find((w) => w.wabaId === SEED_WABA_ID);
      expect(seeded).toBeDefined();
      expect(seeded?.totalUnread).toBeDefined();
    });
  });

  describe('updateWabaWebhook', () => {
    it('updates phone numbers associated with the seeded WABA', async () => {
      const result = await WabaRepository.updateWabaWebhook(
        dbWabaId,
        SEED_WEBHOOK_ID,
      );

      expect(result.count).toBeGreaterThanOrEqual(1);

      const check = await prisma.phoneNumber.findFirst({
        where: { wabaId: dbWabaId },
      });
      expect(check?.botWebhookId).toBe(SEED_WEBHOOK_ID);
    });
  });

  describe('findById', () => {
    it('finds the seeded WABA by its internal ID', async () => {
      const result = await WabaRepository.findById(dbWabaId);

      expect(result?.id).toBe(dbWabaId);
      expect(result?.wabaId).toBe(SEED_WABA_ID);
    });
  });
});
