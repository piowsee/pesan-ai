import prisma from '@/lib/prisma';
import { WebhookRepository } from '@/repositories/webhook.repository';
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

vi.unmock('@/repositories/webhook.repository.ts');

/**
 * WebhookRepository Integration Tests (Synced with Seed)
 * Reasoning: Verifies database interactions using the seeded baseline data.
 * Tests are non-destructive to the core seed but verify CRUD and pagination.
 */

describe('WebhookRepository Integration', { tags: ['db'] }, () => {
  let userId: string;
  let dbWebhookId: string;

  beforeEach(async () => {
    // Pre-test cleanup for robustness
    await prisma.botWebhook.deleteMany({
      where: {
        name: { contains: 'Test-WH-' },
      },
    });

    // Sync with seeded user
    const user = await prisma.user.findUnique({
      where: { email: SEED_DATA.REGULAR_USER_EMAIL },
    });
    if (!user) {
      throw new Error(
        `Seed user ${SEED_DATA.REGULAR_USER_EMAIL} not found. Please run prisma db seed.`,
      );
    }
    userId = user.id;

    const webhook = await prisma.botWebhook.findFirst({
      where: { name: SEED_DATA.WEBHOOK_NAME, userId: userId },
    });
    if (!webhook) {
      throw new Error(
        `Seeded Webhook ${SEED_DATA.WEBHOOK_NAME} not found. Please run prisma db seed.`,
      );
    }
    dbWebhookId = webhook.id;
  });

  afterEach(async () => {
    // Cleanup only test-specific data to keep seed intact
    await prisma.botWebhook.deleteMany({
      where: {
        name: { contains: 'Test-WH-' },
        userId: userId,
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('createWebhook', () => {
    it('creates a webhook associated with the seeded user', async () => {
      const testName = 'Test-WH-Create';
      const payload = {
        name: testName,
        webhookUrl: 'https://test.com/wh',
        passphrase: 'test-passphrase',
      };

      const result = await WebhookRepository.createWebhook({
        userId,
        data: payload,
      });

      expect(result.id).toBeDefined();
      expect(result.name).toBe(testName);

      // Verify persistence
      const saved = await prisma.botWebhook.findUnique({
        where: { id: result.id },
      });
      expect(saved).not.toBeNull();
      expect(saved?.userId).toBe(userId);
    });
  });

  describe('findPaginated', () => {
    it('returns paginated webhooks including the seeded one', async () => {
      const result = await WebhookRepository.findPaginated({
        limit: 10,
        offset: 0,
      });

      expect(result.total).toBeGreaterThanOrEqual(1);
      expect(result.webhooks.some((w) => w.id === dbWebhookId)).toBe(true);
    });
  });

  describe('deleteWebhook', () => {
    it('deletes a specifically created test webhook', async () => {
      // Create a temporary one
      const temp = await prisma.botWebhook.create({
        data: {
          name: 'Test-WH-Delete',
          webhookUrl: 'url',
          passphrase: 'p',
          userId,
        },
      });

      const result = await WebhookRepository.deleteWebhook({ id: temp.id });
      expect(result.id).toBe(temp.id);

      // Verify removal
      const check = await prisma.botWebhook.findUnique({
        where: { id: temp.id },
      });
      expect(check).toBeNull();
    });
  });
});
