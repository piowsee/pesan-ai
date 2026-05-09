import { ApiError } from '@/lib/error';
import prisma from '@/lib/prisma';
import { PhoneNumberMetaResponse } from '@/types/waba';

type UpsertPhoneNumberInput = PhoneNumberMetaResponse & {
  registrationPin?: string | null;
};

const PHONE_NUMBER_INCLUDE = {
  include: {
    botWebhook: true,
  },
} as const;

const WABA_INCLUDE = {
  include: {
    phoneNumbers: PHONE_NUMBER_INCLUDE,
    user: true,
  },
} as const;

export const WabaRepository = {
  async findAllByUserId(userId: string) {
    return prisma.whatsappBusinessAccount.findMany({
      where: { userId },
      ...WABA_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  },

  async findPaginated(limit: number, offset: number) {
    const [wabas, total] = await prisma.$transaction([
      prisma.whatsappBusinessAccount.findMany({
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        ...WABA_INCLUDE,
      }),
      prisma.whatsappBusinessAccount.count(),
    ]);

    return { wabas, total };
  },

  async findPaginatedByUserId(limit: number, offset: number, userId: string) {
    const where = { userId };

    const [wabas, total] = await prisma.$transaction([
      prisma.whatsappBusinessAccount.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        ...WABA_INCLUDE,
      }),
      prisma.whatsappBusinessAccount.count({ where }),
    ]);

    return { wabas, total };
  },

  async getTotalUnreadListByUserId(userId: string) {
    const wabas = await prisma.whatsappBusinessAccount.findMany({
      where: {
        userId,
      },
      select: {
        id: true,
        wabaId: true,
        phoneNumbers: {
          select: {
            unreadCount: true,
          },
        },
      },
    });

    return wabas.map((waba) => ({
      id: waba.id,
      wabaId: waba.wabaId,
      totalUnread: waba.phoneNumbers.reduce(
        (sum, pn) => sum + pn.unreadCount,
        0,
      ),
    }));
  },

  // we update all phone number that is associated with wabaId
  async updateWabaWebhook(wabaId: string, botWebhookId: string | null) {
    return prisma.phoneNumber.updateMany({
      where: { wabaId },
      data: { botWebhookId },
    });
  },

  async findById(id: string) {
    return prisma.whatsappBusinessAccount.findUnique({
      where: { id },
    });
  },

  async findByMetaWabaId(wabaId: string) {
    return prisma.whatsappBusinessAccount.findUnique({
      where: { wabaId },
      select: {
        id: true,
        wabaId: true,
        userId: true,
      },
    });
  },

  /**
   * Creates or updates a WhatsappBusinessAccount by its Meta wabaId.
   * Safe to call multiple times (idempotent via upsert).
   */
  async upsertWaba(data: {
    wabaId: string;
    userId: string;
    systemUserToken: string;
    businessName?: string | null;
  }) {
    return prisma.$transaction(async (tx) => {
      const existingWaba = await tx.whatsappBusinessAccount.findUnique({
        where: { wabaId: data.wabaId },
        select: { id: true, userId: true },
      });

      if (existingWaba && existingWaba.userId !== data.userId) {
        throw new ApiError(
          'This WhatsApp Business Account is already connected to another user',
          409,
        );
      }

      return tx.whatsappBusinessAccount.upsert({
        where: { wabaId: data.wabaId },
        create: {
          wabaId: data.wabaId,
          userId: data.userId,
          systemUserToken: data.systemUserToken,
          businessName: data.businessName ?? null,
          status: 'active',
        },
        update: {
          systemUserToken: data.systemUserToken,
          status: 'active',
          businessName: data.businessName ?? undefined,
        },
      });
    });
  },

  /**
   * Creates or updates a PhoneNumber by its Meta phoneNumberId.
   * Safe to call multiple times (idempotent via upsert).
   */
  async upsertPhoneNumbers(params: {
    wabaDbId: string; // our internal CUID, not the Meta wabaId
    phoneNumberDatas: UpsertPhoneNumberInput[];
  }) {
    const { wabaDbId, phoneNumberDatas } = params;

    return prisma.$transaction(
      phoneNumberDatas.map((phoneNumber) =>
        prisma.phoneNumber.upsert({
          where: { phoneNumberId: phoneNumber.id },
          create: {
            phoneNumberId: phoneNumber.id,
            wabaId: wabaDbId,
            displayPhoneNumber: phoneNumber.display_phone_number,
            verifiedName: phoneNumber.verified_name ?? null,
            registrationPin: phoneNumber.registrationPin ?? null,
            qualityRating: phoneNumber.quality_rating ?? null,
            codeVerificationStatus:
              phoneNumber.code_verification_status ?? 'VERIFIED',
            botEnabled: true,
          },
          update: {
            wabaId: wabaDbId,
            displayPhoneNumber: phoneNumber.display_phone_number,
            verifiedName: phoneNumber.verified_name ?? null,
            registrationPin: phoneNumber.registrationPin ?? undefined,
            codeVerificationStatus:
              phoneNumber.code_verification_status ?? undefined,
            qualityRating: phoneNumber.quality_rating ?? null,
          },
        }),
      ),
    );
  },
};
