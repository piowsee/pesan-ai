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

vi.unmock('@/repositories/webhook.repository.ts');

/**
 * WebhookRepository Integration Tests (Synced with Seed)
 * Reasoning: Verifies database interactions using the seeded baseline data.
 * Tests are non-destructive to the core seed but verify CRUD and pagination.
 */

describe('WebhookRepository Integration', () => {
  let userId: string;
  const SEED_EMAIL = 'user@piowsee.com';
  const SEED_WEBHOOK_ID = 'webhook_seed_123';
  const SEED_WEBHOOK_NAME = 'Seed Webhook';

  beforeEach(async () => {
    // Sync with seeded user
    const user = await prisma.user.findUnique({
      where: { email: SEED_EMAIL },
    });
    if (!user) {
      throw new Error(
        `Seed user ${SEED_EMAIL} not found. Please run prisma db seed.`,
      );
    }
    userId = user.id;

    const webhook = await prisma.botWebhook.findUnique({
      where: { id: SEED_WEBHOOK_ID },
    });
    if (!webhook) {
      throw new Error(
        `Seeded Webhook ${SEED_WEBHOOK_ID} not found. Please run prisma db seed.`,
      );
    }
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

      const result = await WebhookRepository.createWebhook(userId, payload);

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

  describe('findAll', () => {
    it('finds all webhooks including the seeded baseline', async () => {
      const result = await WebhookRepository.findAll();

      // Should at least find the one from seed.ts
      expect(result.length).toBeGreaterThanOrEqual(1);
      const seeded = result.find((w) => w.id === SEED_WEBHOOK_ID);
      expect(seeded).toBeDefined();
      expect(seeded?.name).toBe(SEED_WEBHOOK_NAME);
    });
  });

  describe('findPaginated', () => {
    it('returns paginated webhooks including the seeded one', async () => {
      const result = await WebhookRepository.findPaginated(10, 0);

      expect(result.total).toBeGreaterThanOrEqual(1);
      expect(result.webhooks.some((w) => w.id === SEED_WEBHOOK_ID)).toBe(true);
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

      const result = await WebhookRepository.deleteWebhook(temp.id);
      expect(result.id).toBe(temp.id);

      // Verify removal
      const check = await prisma.botWebhook.findUnique({
        where: { id: temp.id },
      });
      expect(check).toBeNull();
    });
  });
});
