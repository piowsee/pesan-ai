import prisma from '@/lib/server/prisma';
import { PhoneNumberMetaResponse } from '@/types/waba';

export type UpsertPhoneNumberInput = PhoneNumberMetaResponse & {
  registrationPin?: string | null;
};

function normalizeDisplayPhoneNumber(displayPhoneNumber: string) {
  const digitsOnly = displayPhoneNumber.replace(/\D/g, '');
  return digitsOnly.length > 0 ? digitsOnly : displayPhoneNumber;
}

export const PhoneNumberRepository = {
  async findPhoneNumberByMetaId(metaPhoneNumberId: string) {
    return prisma.phoneNumber.findUnique({
      where: { phoneNumberId: metaPhoneNumberId },
    });
  },

  // we update all phone number that is associated with wabaId
  async updateWabaWebhook(params: {
    wabaId: string;
    botWebhookId: string | null;
  }) {
    const { wabaId, botWebhookId } = params;
    return prisma.phoneNumber.updateMany({
      where: { wabaId },
      data: { botWebhookId },
    });
  },

  /**
   * Creates or updates a PhoneNumber by its Meta phoneNumberId.
   * Safe to call multiple times (idempotent via upsert).
   */
  async upsertPhoneNumber(params: {
    wabaDbId: string; // our internal CUID, not the Meta wabaId
    phoneNumberData: UpsertPhoneNumberInput;
  }) {
    const { wabaDbId, phoneNumberData: phoneNumber } = params;

    return prisma.phoneNumber.upsert({
      where: { phoneNumberId: phoneNumber.id },
      create: {
        phoneNumberId: phoneNumber.id,
        wabaId: wabaDbId,
        displayPhoneNumber: normalizeDisplayPhoneNumber(
          phoneNumber.display_phone_number,
        ),
        verifiedName: phoneNumber.verified_name ?? null,
        registrationPin: phoneNumber.registrationPin ?? null,
        qualityRating: phoneNumber.quality_rating ?? null,
        codeVerificationStatus:
          phoneNumber.code_verification_status ?? undefined,
        botEnabled: true,
      },
      update: {
        wabaId: wabaDbId,
        displayPhoneNumber: normalizeDisplayPhoneNumber(
          phoneNumber.display_phone_number,
        ),
        verifiedName: phoneNumber.verified_name ?? null,
        registrationPin: phoneNumber.registrationPin ?? undefined,
        codeVerificationStatus:
          phoneNumber.code_verification_status ?? undefined,
        qualityRating: phoneNumber.quality_rating ?? null,
      },
    });
  },
};
