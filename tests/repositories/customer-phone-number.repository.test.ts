import prisma from '@/lib/prisma';
import { CustomerPhoneNumberRepository } from '@/repositories/customer-phone-number.repository';
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

vi.unmock('@/repositories/customer-phone-number.repository');

describe('CustomerPhoneNumberRepository Integration', { tags: ['db'] }, () => {
  let userId: string;
  let anotherUserId: string;
  let ownedWabaDbId: string;
  let primaryPhoneDbId: string;
  let secondaryPhoneDbId: string;
  let anotherUserWabaDbId: string;
  let anotherUserPhoneDbId: string;
  let ownedWabaMetaId: string;
  let anotherUserWabaMetaId: string;
  let primaryDisplayPhoneNumber: string;
  let secondaryDisplayPhoneNumber: string;
  let primaryPhoneMetaId: string;
  let secondaryPhoneMetaId: string;
  let anotherUserPhoneMetaId: string;
  let sameWabaCustomerPhone: string;
  let primaryWabaCustomerPhone: string;
  let otherUserCustomerPhone: string;

  beforeEach(async () => {
    const testId = randomUUID().replace(/-/g, '').slice(0, 12);
    const numericSuffix = testId
      .replace(/\D/g, '')
      .padEnd(12, '0')
      .slice(0, 12);

    ownedWabaMetaId = `test-customer-waba-owned-${testId}`;
    anotherUserWabaMetaId = `test-customer-waba-other-${testId}`;
    primaryDisplayPhoneNumber = `+6280${numericSuffix}`;
    secondaryDisplayPhoneNumber = `+6281${numericSuffix}`;
    primaryPhoneMetaId = `test-customer-phone-primary-${testId}`;
    secondaryPhoneMetaId = `test-customer-phone-secondary-${testId}`;
    anotherUserPhoneMetaId = `test-customer-phone-other-${testId}`;
    sameWabaCustomerPhone = `91${numericSuffix}`;
    primaryWabaCustomerPhone = `92${numericSuffix}`;
    otherUserCustomerPhone = `93${numericSuffix}`;

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
        wabaId: ownedWabaMetaId,
        businessName: 'Owned Test WABA',
        systemUserToken: 'enc:test-owned-token',
        userId,
      },
    });
    ownedWabaDbId = ownedWaba.id;

    const primaryPhone = await prisma.phoneNumber.create({
      data: {
        phoneNumberId: primaryPhoneMetaId,
        displayPhoneNumber: primaryDisplayPhoneNumber,
        verifiedName: 'Test Primary Number',
        wabaId: ownedWabaDbId,
      },
    });
    primaryPhoneDbId = primaryPhone.id;

    const secondaryPhone = await prisma.phoneNumber.create({
      data: {
        phoneNumberId: secondaryPhoneMetaId,
        displayPhoneNumber: secondaryDisplayPhoneNumber,
        verifiedName: 'Test Secondary Number',
        wabaId: ownedWabaDbId,
      },
    });
    secondaryPhoneDbId = secondaryPhone.id;

    const anotherUserWaba = await prisma.whatsappBusinessAccount.create({
      data: {
        wabaId: anotherUserWabaMetaId,
        businessName: 'Other User WABA',
        systemUserToken: 'enc:test-token',
        userId: anotherUserId,
      },
    });
    anotherUserWabaDbId = anotherUserWaba.id;

    const anotherUserPhone = await prisma.phoneNumber.create({
      data: {
        phoneNumberId: anotherUserPhoneMetaId,
        displayPhoneNumber: '+628000000002',
        verifiedName: 'Other User Number',
        wabaId: anotherUserWabaDbId,
      },
    });
    anotherUserPhoneDbId = anotherUserPhone.id;

    await prisma.conversation.createMany({
      data: [
        {
          customerPhone: sameWabaCustomerPhone,
          customerName: 'Same WABA Customer',
          phoneNumberId: secondaryPhoneDbId,
          lastMessageAt: new Date('2026-05-31T09:00:00.000Z'),
        },
        {
          customerPhone: primaryWabaCustomerPhone,
          customerName: 'Primary WABA Customer',
          phoneNumberId: primaryPhoneDbId,
          lastMessageAt: new Date('2026-05-31T08:00:00.000Z'),
        },
        {
          customerPhone: otherUserCustomerPhone,
          customerName: 'Other User Customer',
          phoneNumberId: anotherUserPhoneDbId,
          lastMessageAt: new Date('2026-05-31T07:00:00.000Z'),
        },
      ],
    });
  });

  afterEach(async () => {
    const testCustomerPhones = [
      sameWabaCustomerPhone,
      primaryWabaCustomerPhone,
      otherUserCustomerPhone,
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
            primaryPhoneMetaId,
            secondaryPhoneMetaId,
            anotherUserPhoneMetaId,
          ],
        },
      },
    });

    await prisma.whatsappBusinessAccount.deleteMany({
      where: {
        wabaId: {
          in: [ownedWabaMetaId, anotherUserWabaMetaId],
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
            customerPhone: sameWabaCustomerPhone,
            customerName: 'Same WABA Customer',
          }),
          expect.objectContaining({
            customerPhone: primaryWabaCustomerPhone,
            customerName: 'Primary WABA Customer',
          }),
        ]),
      );
      expect(byWaba.total).toBe(2);
      expect(
        byWaba.customerPhoneNumbers.some(
          (conversation) =>
            conversation.customerPhone === otherUserCustomerPhone,
        ),
      ).toBe(false);

      const byPhoneNumber =
        await CustomerPhoneNumberRepository.findConversationContacts({
          userId,
          phoneNumber: secondaryDisplayPhoneNumber,
        });

      expect(byPhoneNumber.customerPhoneNumbers).toHaveLength(1);
      expect(byPhoneNumber.total).toBe(1);
      expect(byPhoneNumber.customerPhoneNumbers[0]).toMatchObject({
        customerPhone: sameWabaCustomerPhone,
        customerName: 'Same WABA Customer',
      });

      const byWabaAndPhoneNumber =
        await CustomerPhoneNumberRepository.findConversationContacts({
          userId,
          wabaId: ownedWabaDbId,
          phoneNumber: secondaryDisplayPhoneNumber,
        });

      expect(byWabaAndPhoneNumber.customerPhoneNumbers).toHaveLength(1);
      expect(byWabaAndPhoneNumber.total).toBe(1);
      expect(byWabaAndPhoneNumber.customerPhoneNumbers[0]).toMatchObject({
        customerPhone: sameWabaCustomerPhone,
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
      expect(result.customerPhoneNumbers[0]).toEqual({
        customerPhone: primaryWabaCustomerPhone,
        customerName: 'Primary WABA Customer',
      });
    });
  });
});
