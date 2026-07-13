import prisma from '@/lib/server/prisma';
import { WebhookRepository } from '@/repositories/webhook.repository';
import { randomUUID } from 'node:crypto';
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

vi.unmock('@/repositories/webhook.repository');

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
    await prisma.conversation.deleteMany({
      where: {
        contact: { customerPhone: { startsWith: '9998' } },
      },
    });
    await prisma.contact.deleteMany({
      where: {
        customerPhone: { startsWith: '9998' },
      },
    });
    await prisma.phoneNumber.deleteMany({
      where: {
        phoneNumberId: { startsWith: 'test-phone-' },
      },
    });
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

    const waba = await prisma.whatsappBusinessAccount.findUnique({
      where: { wabaId: SEED_DATA.WABA_META_ID },
    });
    if (!waba) {
      throw new Error(
        `Seeded WABA ${SEED_DATA.WABA_META_ID} not found. Please run prisma db seed.`,
      );
    }
  });

  afterEach(async () => {
    // Cleanup only test-specific data to keep seed intact
    await prisma.conversation.deleteMany({
      where: {
        contact: { customerPhone: { startsWith: '9998' } },
      },
    });
    await prisma.contact.deleteMany({
      where: {
        customerPhone: { startsWith: '9998' },
      },
    });
    await prisma.phoneNumber.deleteMany({
      where: {
        phoneNumberId: { startsWith: 'test-phone-' },
      },
    });
    await prisma.botWebhook.deleteMany({
      where: {
        name: { contains: 'Test-WH-' },
        userId: userId,
      },
    });
    await prisma.whatsappBusinessAccount.deleteMany({
      where: {
        wabaId: { startsWith: 'test-waba-webhook-' },
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

  describe('findWebhookByConversationId', () => {
    it('returns the webhook configured on the conversation phone number', async () => {
      const unique = randomUUID();
      const webhook = await prisma.botWebhook.create({
        data: {
          name: `Test-WH-Conversation-${unique}`,
          webhookUrl: 'https://bot.example.com/message',
          passphrase: 'encrypted-passphrase',
          userId,
        },
      });
      const tempWaba = await prisma.whatsappBusinessAccount.create({
        data: {
          wabaId: `test-waba-webhook-${unique}`,
          businessName: 'Webhook Test WABA',
          systemUserToken: 'enc:test',
          userId,
        },
      });
      const phoneNumber = await prisma.phoneNumber.create({
        data: {
          phoneNumberId: `test-phone-${unique}`,
          displayPhoneNumber: `9998${Date.now()}`,
          verifiedName: 'Test Redirect Phone',
          wabaId: tempWaba.id,
          botWebhookId: webhook.id,
        },
      });
      const contact = await prisma.contact.create({
        data: {
          customerPhone: `9998${Date.now()}`,
          customerName: 'Redirect Customer',
          phoneNumberId: phoneNumber.id,
        },
      });
      const conversation = await prisma.conversation.create({
        data: {
          phoneNumberId: phoneNumber.id,
          contactId: contact.id,
        },
      });

      const result = await WebhookRepository.findWebhookByConversationId({
        conversationId: conversation.id,
      });

      expect(result).toEqual({
        url: 'https://bot.example.com/message',
        passphrase: 'encrypted-passphrase',
        isActive: true,
      });
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
