import prisma from '@/lib/server/prisma';
import { BusinessProfileRepository } from '@/repositories/business-profile.repository';
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

vi.unmock('@/repositories/business-profile.repository');

describe('BusinessProfileRepository Integration', { tags: ['db'] }, () => {
  const TEST_WABA_ID = 'test-business-profile-waba-999';
  const TEST_PHONE_ID = 'test-business-profile-phone-999';

  let userId: string;
  let phoneNumberDbId: string;

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

    const waba = await prisma.whatsappBusinessAccount.create({
      data: {
        wabaId: TEST_WABA_ID,
        userId,
        systemUserToken: 'enc:test-token',
        name: 'Business Profile Test WABA',
        status: 'active',
      },
    });

    const phoneNumber = await prisma.phoneNumber.create({
      data: {
        phoneNumberId: TEST_PHONE_ID,
        displayPhoneNumber: '+628555000111',
        verifiedName: 'Business Profile Test Bot',
        registrationPin: 'enc:230601',
        codeVerificationStatus: 'VERIFIED',
        wabaId: waba.id,
      },
    });

    phoneNumberDbId = phoneNumber.id;
  });

  afterEach(async () => {
    await prisma.phoneNumber.deleteMany({
      where: { phoneNumberId: TEST_PHONE_ID },
    });
    await prisma.businessProfile.deleteMany({
      where: {
        OR: [
          { email: 'profile-create@example.com' },
          { email: 'profile-update@example.com' },
        ],
      },
    });
    await prisma.whatsappBusinessAccount.deleteMany({
      where: { wabaId: TEST_WABA_ID },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('upsertBusinessProfile', () => {
    it('creates a business profile and links it to the phone number', async () => {
      const result = await BusinessProfileRepository.upsertBusinessProfile({
        phoneNumberDbId,
        businessProfile: {
          messaging_product: 'whatsapp',
          address: 'Create Street 123',
          description: 'Create description',
          vertical: 'BEAUTY',
          about: 'Create about text',
          email: 'profile-create@example.com',
          websites: ['https://create.example.com'],
          profile_picture_url: 'https://cdn.example.com/create.jpg',
        },
      });

      expect(result.businessProfileId).toBeTruthy();

      const phoneNumber = await prisma.phoneNumber.findUnique({
        where: { id: phoneNumberDbId },
        include: { businessProfile: true },
      });

      expect(phoneNumber?.businessProfileId).toBe(result.businessProfileId);
      expect(phoneNumber?.businessProfile).toMatchObject({
        messagingProduct: 'whatsapp',
        address: 'Create Street 123',
        description: 'Create description',
        vertical: 'BEAUTY',
        about: 'Create about text',
        email: 'profile-create@example.com',
        websites: ['https://create.example.com'],
        profilePictureUrl: 'https://cdn.example.com/create.jpg',
      });
    });

    it('updates the existing business profile instead of creating a new one', async () => {
      const created = await BusinessProfileRepository.upsertBusinessProfile({
        phoneNumberDbId,
        businessProfile: {
          messaging_product: 'whatsapp',
          address: 'Old Address',
          description: 'Old description',
          vertical: 'BEAUTY',
          about: 'Old about',
          email: 'profile-create@example.com',
          websites: ['https://old.example.com'],
          profile_picture_url: 'https://cdn.example.com/old.jpg',
        },
      });

      const updated = await BusinessProfileRepository.upsertBusinessProfile({
        phoneNumberDbId,
        businessProfile: {
          messaging_product: 'whatsapp',
          address: 'New Address',
          description: 'New description',
          vertical: 'SPA',
          about: 'New about',
          email: 'profile-update@example.com',
          websites: ['https://new-1.example.com', 'https://new-2.example.com'],
          profile_picture_url: 'https://cdn.example.com/new.jpg',
        },
      });

      expect(updated.businessProfileId).toBe(created.businessProfileId);

      const businessProfile = await prisma.businessProfile.findUnique({
        where: { id: created.businessProfileId ?? undefined },
      });

      expect(businessProfile).toMatchObject({
        id: created.businessProfileId,
        messagingProduct: 'whatsapp',
        address: 'New Address',
        description: 'New description',
        vertical: 'SPA',
        about: 'New about',
        email: 'profile-update@example.com',
        websites: ['https://new-1.example.com', 'https://new-2.example.com'],
        profilePictureUrl: 'https://cdn.example.com/new.jpg',
      });
    });
  });

  describe('getBusinessProfile', () => {
    it('returns null if phone number has no business profile', async () => {
      const profile =
        await BusinessProfileRepository.getBusinessProfile(TEST_PHONE_ID);
      expect(profile).toBeNull();
    });

    it('returns the business profile if it exists', async () => {
      await BusinessProfileRepository.upsertBusinessProfile({
        phoneNumberDbId,
        businessProfile: {
          messaging_product: 'whatsapp',
          address: 'Test Address',
          description: 'Test description',
          vertical: 'BEAUTY',
          about: 'Test about',
          email: 'profile-create@example.com',
          websites: ['https://test.example.com'],
          profile_picture_url: 'https://test.example.com/pic.jpg',
        },
      });

      const profile =
        await BusinessProfileRepository.getBusinessProfile(TEST_PHONE_ID);
      expect(profile).toMatchObject({
        messagingProduct: 'whatsapp',
        address: 'Test Address',
        description: 'Test description',
        vertical: 'BEAUTY',
        about: 'Test about',
        email: 'profile-create@example.com',
        websites: ['https://test.example.com'],
        profilePictureUrl: 'https://test.example.com/pic.jpg',
      });
    });
  });
});
