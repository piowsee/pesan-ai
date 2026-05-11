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
  let dbWebhookId: string;

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
    dbWebhookId = webhook.id;
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
          { businessName: { contains: 'Test-Waba-' } },
          { businessName: 'Test Salon' },
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
      const result = await WabaRepository.findPaginated(10, 0);
      expect(result.total).toBeGreaterThanOrEqual(1);
      expect(result.wabas.some((w) => w.id === dbWabaId)).toBe(true);
    });
  });

  describe('findPaginatedByUserId', () => {
    it('returns paginated results for the seeded user', async () => {
      const result = await WabaRepository.findPaginatedByUserId(10, 0, userId);
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

  describe('updateWabaWebhook', () => {
    it('updates phone numbers associated with the seeded WABA', async () => {
      const result = await WabaRepository.updateWabaWebhook(
        dbWabaId,
        dbWebhookId,
      );
      expect(result.count).toBeGreaterThanOrEqual(1);
      const check = await prisma.phoneNumber.findFirst({
        where: { wabaId: dbWabaId },
      });
      expect(check?.botWebhookId).toBe(dbWebhookId);
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
      const result = await WabaRepository.findByMetaWabaId(
        SEED_DATA.WABA_META_ID,
      );

      expect(result).toMatchObject({
        id: dbWabaId,
        wabaId: SEED_DATA.WABA_META_ID,
        userId,
        systemUserToken: SEED_DATA.SYSTEM_USER_TOKEN,
      });
    });

    it('returns null when the Meta WABA id does not exist', async () => {
      const result = await WabaRepository.findByMetaWabaId(
        'missing-meta-waba-id',
      );

      expect(result).toBeNull();
    });
  });

  describe('findPhoneNumbersByMetaIds', () => {
    it('returns stored pins for matching Meta phone number ids', async () => {
      const result = await WabaRepository.findPhoneNumbersByMetaIds([
        SEED_DATA.PHONE_META_ID,
        'missing-phone-id',
      ]);

      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            phoneNumberId: SEED_DATA.PHONE_META_ID,
          }),
        ]),
      );
    });

    it('returns an empty array when no ids are requested', async () => {
      await expect(
        WabaRepository.findPhoneNumbersByMetaIds([]),
      ).resolves.toEqual([]);
    });
  });

  // --- Upsert Operations (Embedded Signup) ---

  const TEST_WABA_ID = 'test-upsert-waba-999';
  const TEST_PHONE_ID = 'test-upsert-phone-999';

  describe('upsertWaba', () => {
    it('creates a new WhatsappBusinessAccount on first call', async () => {
      const result = await WabaRepository.upsertWaba({
        wabaId: TEST_WABA_ID,
        userId,
        systemUserToken: 'enc:mock-token',
        businessName: 'Test Salon',
      });

      expect(result.wabaId).toBe(TEST_WABA_ID);
      expect(result.businessName).toBe('Test Salon');
      expect(result.status).toBe('active');
    });

    it('updates token and status on subsequent calls (idempotent)', async () => {
      await WabaRepository.upsertWaba({
        wabaId: TEST_WABA_ID,
        userId,
        systemUserToken: 'enc:old-token',
        businessName: 'Original Name',
      });

      const updated = await WabaRepository.upsertWaba({
        wabaId: TEST_WABA_ID,
        userId,
        systemUserToken: 'enc:new-token',
        businessName: 'Updated Name',
      });

      expect(updated.systemUserToken).toBe('enc:new-token');
      expect(updated.businessName).toBe('Updated Name');
    });

    it('preserves null businessName when not provided on create', async () => {
      await WabaRepository.upsertWaba({
        wabaId: TEST_WABA_ID,
        userId,
        systemUserToken: 'enc:tok',
        businessName: null,
      });

      const result = await prisma.whatsappBusinessAccount.findUnique({
        where: { wabaId: TEST_WABA_ID },
      });
      expect(result?.businessName).toBeNull();
    });

    it('throws when the WABA already belongs to a different user', async () => {
      await WabaRepository.upsertWaba({
        wabaId: TEST_WABA_ID,
        userId,
        systemUserToken: 'enc:owner-token',
        businessName: 'Owner Waba',
      });

      await expect(
        WabaRepository.upsertWaba({
          wabaId: TEST_WABA_ID,
          userId: anotherUserId,
          systemUserToken: 'enc:intruder-token',
          businessName: 'Intruder Waba',
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

  describe('upsertPhoneNumbers', () => {
    let wabaDbId: string;

    beforeEach(async () => {
      const waba = await WabaRepository.upsertWaba({
        wabaId: TEST_WABA_ID,
        userId,
        systemUserToken: 'enc:tok',
        businessName: 'Test Salon',
      });
      wabaDbId = waba.id;
    });

    it('creates a new PhoneNumber linked to the WABA', async () => {
      const [result] = await WabaRepository.upsertPhoneNumbers({
        wabaDbId,
        phoneNumberDatas: [
          {
            id: TEST_PHONE_ID,
            display_phone_number: '+6281234567890',
            verified_name: 'Test Salon Bot',
            code_verification_status: 'NOT_VERIFIED',
            registrationPin: 'enc:230601',
          },
        ],
      });

      expect(result.phoneNumberId).toBe(TEST_PHONE_ID);
      expect(result.wabaId).toBe(wabaDbId);
      expect(result.displayPhoneNumber).toBe('+6281234567890');
      expect(result.registrationPin).toBe('enc:230601');
      expect(result.codeVerificationStatus).toBe('NOT_VERIFIED');
    });

    it('updates display number, verified name, and verification status on subsequent calls (idempotent)', async () => {
      await WabaRepository.upsertPhoneNumbers({
        wabaDbId,
        phoneNumberDatas: [
          {
            id: TEST_PHONE_ID,
            display_phone_number: '+6281234567890',
            verified_name: 'Old Name',
            code_verification_status: 'NOT_VERIFIED',
            registrationPin: 'enc:111111',
          },
        ],
      });

      const [updated] = await WabaRepository.upsertPhoneNumbers({
        wabaDbId,
        phoneNumberDatas: [
          {
            id: TEST_PHONE_ID,
            display_phone_number: '+6289999999999',
            verified_name: 'New Name',
            code_verification_status: 'VERIFIED',
            registrationPin: 'enc:222222',
          },
        ],
      });

      expect(updated.displayPhoneNumber).toBe('+6289999999999');
      expect(updated.verifiedName).toBe('New Name');
      expect(updated.registrationPin).toBe('enc:222222');
      expect(updated.codeVerificationStatus).toBe('VERIFIED');
    });

    it('handles null verifiedName gracefully', async () => {
      const [result] = await WabaRepository.upsertPhoneNumbers({
        wabaDbId,
        phoneNumberDatas: [
          {
            id: TEST_PHONE_ID,
            display_phone_number: '+628000000000',
            verified_name: null,
            code_verification_status: null,
            registrationPin: null,
          },
        ],
      });

      expect(result.verifiedName).toBeNull();
      expect(result.registrationPin).toBeNull();
    });

    it('falls back to UNVERIFIED when Meta does not return code_verification_status', async () => {
      const [result] = await WabaRepository.upsertPhoneNumbers({
        wabaDbId,
        phoneNumberDatas: [
          {
            id: TEST_PHONE_ID,
            display_phone_number: '+6281234567890',
            verified_name: 'Fallback Bot',
            registrationPin: 'enc:333333',
          },
        ],
      });

      expect(result.codeVerificationStatus).toBe('UNVERIFIED');
    });
  });
});
