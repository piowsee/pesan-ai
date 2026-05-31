import prisma from '@/lib/prisma';
import { CustomerPhoneNumberRepository } from '@/repositories/customer-phone-number.repository';
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

vi.unmock('@/repositories/customer-phone-number.repository');

describe('CustomerPhoneNumberRepository Integration', { tags: ['db'] }, () => {
  let userId: string;
  let anotherUserId: string;
  let ownedWabaDbId: string;
  let primaryPhoneDbId: string;
  let secondaryPhoneDbId: string;
  let anotherUserWabaDbId: string;
  let anotherUserPhoneDbId: string;

  const OWNED_WABA_META_ID = 'test-customer-waba-owned-user';
  const PRIMARY_DISPLAY_PHONE_NUMBER = '+628000000000';
  const SECONDARY_DISPLAY_PHONE_NUMBER = '+628000000001';
  const PRIMARY_PHONE_META_ID = 'test-customer-phone-meta-000';
  const TEST_PHONE_META_ID = 'test-customer-phone-meta-001';
  const ANOTHER_USER_PHONE_META_ID = 'test-customer-phone-meta-002';
  const SAME_WABA_CUSTOMER_PHONE = '999101';
  const PRIMARY_WABA_CUSTOMER_PHONE = '999102';
  const OTHER_USER_CUSTOMER_PHONE = '999103';

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

    const ownedWaba = await prisma.whatsappBusinessAccount.create({
      data: {
        wabaId: OWNED_WABA_META_ID,
        businessName: 'Owned Test WABA',
        systemUserToken: 'enc:test-owned-token',
        userId,
      },
    });
    ownedWabaDbId = ownedWaba.id;

    const primaryPhone = await prisma.phoneNumber.create({
      data: {
        phoneNumberId: PRIMARY_PHONE_META_ID,
        displayPhoneNumber: PRIMARY_DISPLAY_PHONE_NUMBER,
        verifiedName: 'Test Primary Number',
        wabaId: ownedWabaDbId,
      },
    });
    primaryPhoneDbId = primaryPhone.id;

    const secondaryPhone = await prisma.phoneNumber.create({
      data: {
        phoneNumberId: TEST_PHONE_META_ID,
        displayPhoneNumber: SECONDARY_DISPLAY_PHONE_NUMBER,
        verifiedName: 'Test Secondary Number',
        wabaId: ownedWabaDbId,
      },
    });
    secondaryPhoneDbId = secondaryPhone.id;

    const anotherUserWaba = await prisma.whatsappBusinessAccount.create({
      data: {
        wabaId: 'test-customer-waba-other-user',
        businessName: 'Other User WABA',
        systemUserToken: 'enc:test-token',
        userId: anotherUserId,
      },
    });
    anotherUserWabaDbId = anotherUserWaba.id;

    const anotherUserPhone = await prisma.phoneNumber.create({
      data: {
        phoneNumberId: ANOTHER_USER_PHONE_META_ID,
        displayPhoneNumber: '+628000000002',
        verifiedName: 'Other User Number',
        wabaId: anotherUserWabaDbId,
      },
    });
    anotherUserPhoneDbId = anotherUserPhone.id;

    await prisma.conversation.createMany({
      data: [
        {
          customerPhone: SAME_WABA_CUSTOMER_PHONE,
          customerName: 'Same WABA Customer',
          phoneNumberId: secondaryPhoneDbId,
          lastMessageAt: new Date('2026-05-31T09:00:00.000Z'),
        },
        {
          customerPhone: PRIMARY_WABA_CUSTOMER_PHONE,
          customerName: 'Primary WABA Customer',
          phoneNumberId: primaryPhoneDbId,
          lastMessageAt: new Date('2026-05-31T08:00:00.000Z'),
        },
        {
          customerPhone: OTHER_USER_CUSTOMER_PHONE,
          customerName: 'Other User Customer',
          phoneNumberId: anotherUserPhoneDbId,
          lastMessageAt: new Date('2026-05-31T07:00:00.000Z'),
        },
      ],
    });
  });

  afterEach(async () => {
    const testCustomerPhones = [
      SAME_WABA_CUSTOMER_PHONE,
      PRIMARY_WABA_CUSTOMER_PHONE,
      OTHER_USER_CUSTOMER_PHONE,
    ];

    await prisma.message.deleteMany({
      where: {
        conversation: {
          customerPhone: {
            in: testCustomerPhones,
          },
        },
      },
    });

    await prisma.conversation.deleteMany({
      where: {
        customerPhone: {
          in: testCustomerPhones,
        },
      },
    });

    await prisma.phoneNumber.deleteMany({
      where: {
        phoneNumberId: {
          in: [
            PRIMARY_PHONE_META_ID,
            TEST_PHONE_META_ID,
            ANOTHER_USER_PHONE_META_ID,
          ],
        },
      },
    });

    await prisma.whatsappBusinessAccount.deleteMany({
      where: {
        wabaId: {
          in: [OWNED_WABA_META_ID, 'test-customer-waba-other-user'],
        },
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('findConversationContacts', () => {
    it('filters by ownership, wabaId, and phone number correctly', async () => {
      const byWaba =
        await CustomerPhoneNumberRepository.findConversationContacts({
          userId,
          wabaId: ownedWabaDbId,
        });

      expect(byWaba.customerPhoneNumbers).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            customerPhone: SAME_WABA_CUSTOMER_PHONE,
            customerName: 'Same WABA Customer',
          }),
          expect.objectContaining({
            customerPhone: PRIMARY_WABA_CUSTOMER_PHONE,
            customerName: 'Primary WABA Customer',
          }),
        ]),
      );
      expect(byWaba.total).toBe(2);
      expect(
        byWaba.customerPhoneNumbers.some(
          (conversation) =>
            conversation.customerPhone === OTHER_USER_CUSTOMER_PHONE,
        ),
      ).toBe(false);

      const byPhoneNumber =
        await CustomerPhoneNumberRepository.findConversationContacts({
          userId,
          phoneNumber: SECONDARY_DISPLAY_PHONE_NUMBER,
        });

      expect(byPhoneNumber.customerPhoneNumbers).toHaveLength(1);
      expect(byPhoneNumber.total).toBe(1);
      expect(byPhoneNumber.customerPhoneNumbers[0]).toMatchObject({
        customerPhone: SAME_WABA_CUSTOMER_PHONE,
        customerName: 'Same WABA Customer',
      });

      const byWabaAndPhoneNumber =
        await CustomerPhoneNumberRepository.findConversationContacts({
          userId,
          wabaId: ownedWabaDbId,
          phoneNumber: SECONDARY_DISPLAY_PHONE_NUMBER,
        });

      expect(byWabaAndPhoneNumber.customerPhoneNumbers).toHaveLength(1);
      expect(byWabaAndPhoneNumber.total).toBe(1);
      expect(byWabaAndPhoneNumber.customerPhoneNumbers[0]).toMatchObject({
        customerPhone: SAME_WABA_CUSTOMER_PHONE,
        customerName: 'Same WABA Customer',
      });

      const otherUserResult =
        await CustomerPhoneNumberRepository.findConversationContacts({
          userId,
          wabaId: anotherUserWabaDbId,
        });

      expect(otherUserResult).toEqual({
        customerPhoneNumbers: [],
        total: 0,
      });
    });

    it('paginates unique contacts in the repository query', async () => {
      const result =
        await CustomerPhoneNumberRepository.findConversationContacts({
          userId,
          wabaId: ownedWabaDbId,
          page: 2,
          limit: 1,
        });

      expect(result.total).toBe(2);
      expect(result.customerPhoneNumbers).toHaveLength(1);
      expect([
        {
          customerPhone: SAME_WABA_CUSTOMER_PHONE,
          customerName: 'Same WABA Customer',
        },
        {
          customerPhone: PRIMARY_WABA_CUSTOMER_PHONE,
          customerName: 'Primary WABA Customer',
        },
      ]).toContainEqual(
        expect.objectContaining(result.customerPhoneNumbers[0]),
      );
    });
  });
});
