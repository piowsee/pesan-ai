import prisma from '@/lib/server/prisma';
import { ContactRepository } from '@/repositories/contact.repository';
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

vi.unmock('@/repositories/contact.repository');

describe('ContactRepository Integration', { tags: ['db'] }, () => {
  let userId: string;
  let anotherUserId: string;
  let ownedWabaDbId: string;
  let secondOwnedWabaDbId: string;
  let primaryPhoneDbId: string;
  let secondaryPhoneDbId: string;
  let thirdPhoneDbId: string;
  let anotherUserWabaDbId: string;
  let anotherUserPhoneDbId: string;
  let ownedWabaMetaId: string;
  let secondOwnedWabaMetaId: string;
  let anotherUserWabaMetaId: string;
  let primaryDisplayPhoneNumber: string;
  let secondaryDisplayPhoneNumber: string;
  let thirdDisplayPhoneNumber: string;
  let primaryPhoneMetaId: string;
  let secondaryPhoneMetaId: string;
  let thirdPhoneMetaId: string;
  let anotherUserPhoneMetaId: string;
  let sameWabaCustomerPhone: string;
  let primaryWabaCustomerPhone: string;
  let secondWabaCustomerPhone: string;
  let otherUserCustomerPhone: string;

  beforeEach(async () => {
    const testId = randomUUID().replace(/-/g, '').slice(0, 12);
    const numericSuffix = testId
      .replace(/\D/g, '')
      .padEnd(12, '0')
      .slice(0, 12);

    ownedWabaMetaId = `test-customer-waba-owned-${testId}`;
    secondOwnedWabaMetaId = `test-customer-waba-owned-2-${testId}`;
    anotherUserWabaMetaId = `test-customer-waba-other-${testId}`;
    primaryDisplayPhoneNumber = `+6280${numericSuffix}`;
    secondaryDisplayPhoneNumber = `+6281${numericSuffix}`;
    thirdDisplayPhoneNumber = `+6282${numericSuffix}`;
    primaryPhoneMetaId = `test-customer-phone-primary-${testId}`;
    secondaryPhoneMetaId = `test-customer-phone-secondary-${testId}`;
    thirdPhoneMetaId = `test-customer-phone-third-${testId}`;
    anotherUserPhoneMetaId = `test-customer-phone-other-${testId}`;
    sameWabaCustomerPhone = `91${numericSuffix}`;
    primaryWabaCustomerPhone = `92${numericSuffix}`;
    secondWabaCustomerPhone = `94${numericSuffix}`;
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

    const secondOwnedWaba = await prisma.whatsappBusinessAccount.create({
      data: {
        wabaId: secondOwnedWabaMetaId,
        businessName: 'Second Owned Test WABA',
        systemUserToken: 'enc:test-owned-token-2',
        userId,
      },
    });
    secondOwnedWabaDbId = secondOwnedWaba.id;

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

    const thirdPhone = await prisma.phoneNumber.create({
      data: {
        phoneNumberId: thirdPhoneMetaId,
        displayPhoneNumber: thirdDisplayPhoneNumber,
        verifiedName: 'Test Third Number',
        wabaId: secondOwnedWabaDbId,
      },
    });
    thirdPhoneDbId = thirdPhone.id;

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

    const primaryWabaContact = await prisma.contact.create({
      data: {
        customerPhone: primaryWabaCustomerPhone,
        customerName: 'Primary WABA Customer',
        phoneNumberId: primaryPhoneDbId,
      },
    });

    const sameWabaContact = await prisma.contact.create({
      data: {
        customerPhone: sameWabaCustomerPhone,
        customerName: 'Same WABA Customer',
        customerUsername: '@samewaba',
        phoneNumberId: secondaryPhoneDbId,
      },
    });

    const otherUserContact = await prisma.contact.create({
      data: {
        customerPhone: otherUserCustomerPhone,
        customerName: 'Other User Customer',
        phoneNumberId: anotherUserPhoneDbId,
      },
    });

    const secondWabaContact = await prisma.contact.create({
      data: {
        customerPhone: secondWabaCustomerPhone,
        customerName: 'Second WABA Customer',
        phoneNumberId: thirdPhoneDbId,
      },
    });

    await prisma.conversation.createMany({
      data: [
        {
          contactId: sameWabaContact.id,
          phoneNumberId: secondaryPhoneDbId,
          lastMessageAt: new Date('2026-05-31T09:00:00.000Z'),
        },
        {
          contactId: primaryWabaContact.id,
          phoneNumberId: primaryPhoneDbId,
          lastMessageAt: new Date('2026-05-31T08:00:00.000Z'),
        },
        {
          contactId: otherUserContact.id,
          phoneNumberId: anotherUserPhoneDbId,
          lastMessageAt: new Date('2026-05-31T07:00:00.000Z'),
        },
        {
          contactId: secondWabaContact.id,
          phoneNumberId: thirdPhoneDbId,
          lastMessageAt: new Date('2026-05-31T10:00:00.000Z'),
        },
      ],
    });
  });

  afterEach(async () => {
    const testCustomerPhones = [
      sameWabaCustomerPhone,
      primaryWabaCustomerPhone,
      secondWabaCustomerPhone,
      otherUserCustomerPhone,
    ];

    await prisma.message.deleteMany({
      where: {
        conversation: {
          contact: {
            customerPhone: {
              in: testCustomerPhones,
            },
          },
        },
      },
    });

    await prisma.conversation.deleteMany({
      where: {
        contact: {
          customerPhone: {
            in: testCustomerPhones,
          },
        },
      },
    });

    await prisma.contact.deleteMany({
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
            thirdPhoneMetaId,
            anotherUserPhoneMetaId,
          ],
        },
      },
    });

    await prisma.whatsappBusinessAccount.deleteMany({
      where: {
        wabaId: {
          in: [ownedWabaMetaId, secondOwnedWabaMetaId, anotherUserWabaMetaId],
        },
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('findConversationContacts', () => {
    it('filters by ownership, wabaIds, and phoneNumbers correctly', async () => {
      const byWaba = await ContactRepository.findConversationContacts({
        userId,
        wabaIds: [ownedWabaDbId],
      });

      expect(byWaba.customerContacts).toEqual(
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
        byWaba.customerContacts.some(
          (conversation) =>
            conversation.customerPhone === otherUserCustomerPhone,
        ),
      ).toBe(false);

      const byPhoneNumber = await ContactRepository.findConversationContacts({
        userId,
        phoneNumbers: [secondaryDisplayPhoneNumber, thirdDisplayPhoneNumber],
      });

      expect(byPhoneNumber.customerContacts).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            customerPhone: sameWabaCustomerPhone,
            customerName: 'Same WABA Customer',
          }),
          expect.objectContaining({
            customerPhone: secondWabaCustomerPhone,
            customerName: 'Second WABA Customer',
          }),
        ]),
      );
      expect(byPhoneNumber.total).toBe(2);

      const byWabaAndPhoneNumber =
        await ContactRepository.findConversationContacts({
          userId,
          wabaIds: [ownedWabaDbId],
          phoneNumbers: [secondaryDisplayPhoneNumber, thirdDisplayPhoneNumber],
        });

      expect(byWabaAndPhoneNumber.customerContacts).toHaveLength(1);
      expect(byWabaAndPhoneNumber.total).toBe(1);
      expect(byWabaAndPhoneNumber.customerContacts[0]).toMatchObject({
        customerPhone: sameWabaCustomerPhone,
        customerName: 'Same WABA Customer',
      });

      const otherUserResult = await ContactRepository.findConversationContacts({
        userId,
        wabaIds: [anotherUserWabaDbId],
      });

      expect(otherUserResult).toEqual({
        customerContacts: [],
        total: 0,
      });

      const acrossOwnedWabas = await ContactRepository.findConversationContacts(
        {
          userId,
          wabaIds: [ownedWabaDbId, secondOwnedWabaDbId],
        },
      );

      expect(acrossOwnedWabas.customerContacts).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            customerPhone: sameWabaCustomerPhone,
          }),
          expect.objectContaining({
            customerPhone: primaryWabaCustomerPhone,
          }),
          expect.objectContaining({
            customerPhone: secondWabaCustomerPhone,
          }),
        ]),
      );
      expect(acrossOwnedWabas.total).toBe(3);
    });

    it('paginates unique contacts in the repository query', async () => {
      const result = await ContactRepository.findConversationContacts({
        userId,
        wabaIds: [ownedWabaDbId],
        page: 2,
        limit: 1,
      });

      expect(result.total).toBe(2);
      expect(result.customerContacts).toHaveLength(1);
      expect(result.customerContacts[0]).toEqual({
        customerPhone: primaryWabaCustomerPhone,
        customerName: 'Primary WABA Customer',
        customerUsername: null,
      });
    });
    describe('upsertContactsBulk', () => {
      it('upserts multiple contacts correctly in a single transaction', async () => {
        const testPhone1 = `881${Date.now()}`;
        const testPhone2 = `882${Date.now()}`;

        const processedCount = await ContactRepository.upsertContactsBulk([
          {
            phoneNumberId: primaryPhoneDbId,
            customerPhone: testPhone1,
            customerName: 'Bulk User 1',
          },
          {
            phoneNumberId: primaryPhoneDbId,
            customerPhone: testPhone2,
            customerName: 'Bulk User 2',
          },
        ]);

        expect(processedCount).toBe(2);

        const savedContact1 = await prisma.contact.findFirst({
          where: { phoneNumberId: primaryPhoneDbId, customerPhone: testPhone1 },
        });
        const savedContact2 = await prisma.contact.findFirst({
          where: { phoneNumberId: primaryPhoneDbId, customerPhone: testPhone2 },
        });

        expect(savedContact1).not.toBeNull();
        expect(savedContact1?.customerName).toBe('Bulk User 1');
        expect(savedContact2).not.toBeNull();
        expect(savedContact2?.customerName).toBe('Bulk User 2');

        // cleanup
        await prisma.contact.deleteMany({
          where: { customerPhone: { in: [testPhone1, testPhone2] } },
        });
      });

      it('rolls back the transaction if one contact fails', async () => {
        const testPhone1 = `883${Date.now()}`;

        await expect(
          ContactRepository.upsertContactsBulk([
            {
              phoneNumberId: primaryPhoneDbId,
              customerPhone: testPhone1,
              customerName: 'Bulk User 3',
            },
            { phoneNumberId: primaryPhoneDbId, customerName: 'Bulk User 4' }, // Missing both bsuid and customerPhone causes throw
          ]),
        ).rejects.toThrow('Cannot upsert a contact without a phone or BSUID');

        // Verify rollback
        const savedContact1 = await prisma.contact.findFirst({
          where: { phoneNumberId: primaryPhoneDbId, customerPhone: testPhone1 },
        });

        expect(savedContact1).toBeNull();
      });
    });
  });
});
