import prisma from '@/lib/server/prisma';
import { PhoneNumberRepository } from '@/repositories/phone-number.repository';
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

vi.unmock('@/repositories/phone-number.repository');
vi.unmock('@/repositories/waba.repository');

describe('PhoneNumberRepository Integration', { tags: ['db'] }, () => {
  let userId: string;
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
    await prisma.phoneNumber.deleteMany({
      where: { phoneNumberId: 'test-phone-repo-phone-999' },
    });
    await prisma.whatsappBusinessAccount.deleteMany({
      where: {
        OR: [
          { wabaId: 'test-phone-repo-waba-999' },
          { name: 'Test Salon Phone Repo' },
        ],
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('findPhoneNumberByMetaId', () => {
    it('locates the seeded internal phone number by its Meta ID', async () => {
      const result = await PhoneNumberRepository.findPhoneNumberByMetaId(
        SEED_DATA.PHONE_META_ID,
      );
      expect(result?.phoneNumberId).toBe(SEED_DATA.PHONE_META_ID);
    });
  });

  describe('updateWabaWebhook', () => {
    it('updates phone numbers associated with the seeded WABA', async () => {
      const result = await PhoneNumberRepository.updateWabaWebhook({
        wabaId: dbWabaId,
        botWebhookId: dbWebhookId,
      });
      expect(result.count).toBeGreaterThanOrEqual(1);
      const check = await prisma.phoneNumber.findFirst({
        where: { wabaId: dbWabaId },
      });
      expect(check?.botWebhookId).toBe(dbWebhookId);
    });
  });

  const TEST_WABA_ID = 'test-phone-repo-waba-999';
  const TEST_PHONE_ID = 'test-phone-repo-phone-999';

  describe('upsertPhoneNumber', () => {
    let wabaDbId: string;

    beforeEach(async () => {
      const waba = await WabaRepository.upsertWaba({
        wabaId: TEST_WABA_ID,
        userId,
        systemUserToken: 'enc:tok',
        name: 'Test Salon Phone Repo',
      });
      wabaDbId = waba.id;
    });

    it('creates a new PhoneNumber linked to the WABA', async () => {
      const result = await PhoneNumberRepository.upsertPhoneNumber({
        wabaDbId,
        phoneNumberData: {
          id: TEST_PHONE_ID,
          display_phone_number: '+62 851-9556-3454',
          verified_name: 'Test Salon Bot',
          code_verification_status: 'NOT_VERIFIED',
          registrationPin: 'enc:230601',
        },
      });

      expect(result.phoneNumberId).toBe(TEST_PHONE_ID);
      expect(result.wabaId).toBe(wabaDbId);
      expect(result.displayPhoneNumber).toBe('6285195563454');
      expect(result.registrationPin).toBe('enc:230601');
      expect(result.codeVerificationStatus).toBe('NOT_VERIFIED');
    });

    it('updates display number, verified name, and verification status on subsequent calls (idempotent)', async () => {
      await PhoneNumberRepository.upsertPhoneNumber({
        wabaDbId,
        phoneNumberData: {
          id: TEST_PHONE_ID,
          display_phone_number: '+6281234567890',
          verified_name: 'Old Name',
          code_verification_status: 'NOT_VERIFIED',
          registrationPin: 'enc:111111',
        },
      });

      const updated = await PhoneNumberRepository.upsertPhoneNumber({
        wabaDbId,
        phoneNumberData: {
          id: TEST_PHONE_ID,
          display_phone_number: '+62 899-9999-9999',
          verified_name: 'New Name',
          code_verification_status: 'VERIFIED',
          registrationPin: 'enc:222222',
        },
      });

      expect(updated.displayPhoneNumber).toBe('6289999999999');
      expect(updated.verifiedName).toBe('New Name');
      expect(updated.registrationPin).toBe('enc:222222');
      expect(updated.codeVerificationStatus).toBe('VERIFIED');
    });

    it('handles null verifiedName gracefully', async () => {
      const result = await PhoneNumberRepository.upsertPhoneNumber({
        wabaDbId,
        phoneNumberData: {
          id: TEST_PHONE_ID,
          display_phone_number: '+628000000000',
          verified_name: null,
          code_verification_status: null,
          registrationPin: null,
        },
      });

      expect(result.verifiedName).toBeNull();
      expect(result.registrationPin).toBeNull();
    });

    it('falls back to UNVERIFIED when Meta does not return code_verification_status', async () => {
      const result = await PhoneNumberRepository.upsertPhoneNumber({
        wabaDbId,
        phoneNumberData: {
          id: TEST_PHONE_ID,
          display_phone_number: '+6281234567890',
          verified_name: 'Fallback Bot',
          registrationPin: 'enc:333333',
        },
      });

      expect(result.codeVerificationStatus).toBe('UNVERIFIED');
    });
  });
});
