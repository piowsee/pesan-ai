import { ApiError } from '@/lib/api-helper/error';
import { decrypt } from '@/lib/server/encryption';
import { logger } from '@/lib/server/logger';
import { BusinessProfileRepository } from '@/repositories/business-profile.repository';
import { PhoneNumberRepository } from '@/repositories/phone-number.repository';
import { WabaRepository } from '@/repositories/waba.repository';
import { MetaFetchService } from '@/services/meta-fetch.service';
import { WhatsAppBusinessProfileUpdateRequest } from '@/types/whatsapp-business-profile';

export const WhatsappBusinessProfileService = {
  async getWhatsAppBusinessProfile(params: {
    phoneNumberId: string;
    userId: string;
  }) {
    const { phoneNumberId, userId } = params;

    const phoneData =
      await PhoneNumberRepository.findPhoneNumberByMetaId(phoneNumberId);
    if (!phoneData) throw new ApiError('Phone number not found', 404);

    logger.info('Fetching business profile from DB', {
      phoneNumberId,
      wabaId: phoneData.wabaId,
    });

    const businessProfile =
      await BusinessProfileRepository.getBusinessProfile(phoneNumberId);

    const ONE_DAY = 24 * 60 * 60 * 1000;
    const now = new Date();

    if (
      !businessProfile ||
      now.getTime() - businessProfile.updatedAt.getTime() > ONE_DAY
    ) {
      const { systemUserToken } = await this._getSystemUserTokenByDbId({
        wabaDbId: phoneData.wabaId, // phoneData.wabaId is the internal DB ID
        userId,
      });

      logger.info(
        'Business profile is stale or missing, refetching from Meta',
        {
          phoneNumberId,
          wabaId: phoneData.wabaId,
        },
      );

      const metaProfile = await MetaFetchService.fetchBusinessProfile({
        phoneNumberId,
        token: systemUserToken,
      });

      if (metaProfile) {
        const updatedPhone =
          await BusinessProfileRepository.upsertBusinessProfile({
            phoneNumberDbId: phoneData.id,
            businessProfile: metaProfile,
          });

        return updatedPhone.businessProfile;
      }
    }

    return businessProfile;
  },

  async updateWhatsAppBusinessProfile(params: {
    phoneNumberId: string;
    userId: string;
    data: WhatsAppBusinessProfileUpdateRequest;
  }) {
    const { phoneNumberId, userId, data } = params;

    const phoneData =
      await PhoneNumberRepository.findPhoneNumberByMetaId(phoneNumberId);
    if (!phoneData) throw new ApiError('Phone number not found', 404);

    const { systemUserToken } = await this._getSystemUserTokenByDbId({
      wabaDbId: phoneData.wabaId, // phoneData.wabaId is the internal DB ID
      userId,
    });

    logger.info('Updating business profile in Meta', {
      phoneNumberId,
      wabaId: phoneData.wabaId,
    });

    await MetaFetchService.updateBusinessProfile({
      phoneNumberId,
      token: systemUserToken,
      data,
    });

    logger.info('Business profile updated in Meta, refetching to sync DB', {
      phoneNumberId,
      wabaId: phoneData.wabaId,
    });

    // Refetch the updated profile from Meta to keep our DB in sync
    const metaProfile = await MetaFetchService.fetchBusinessProfile({
      phoneNumberId,
      token: systemUserToken,
    });

    if (metaProfile) {
      const updatedPhone =
        await BusinessProfileRepository.upsertBusinessProfile({
          phoneNumberDbId: phoneData.id,
          businessProfile: metaProfile,
        });

      return updatedPhone.businessProfile;
    }

    return null;
  },

  async _getSystemUserTokenByDbId(params: {
    wabaDbId: string;
    userId: string;
  }): Promise<{ wabaDbId: string; systemUserToken: string }> {
    const { wabaDbId, userId } = params;
    const waba = await WabaRepository.findById(wabaDbId);

    if (!waba) {
      throw new ApiError('WhatsApp Business Account not found', 404);
    }

    if (waba.userId !== userId) {
      throw new ApiError(
        'You are not authorised to manage this WhatsApp Business Account',
        403,
      );
    }

    if (!waba?.systemUserToken) {
      throw new ApiError(
        'System user token not found for this WABA. Please reconnect the account.',
        404,
      );
    }

    return {
      wabaDbId: waba.id,
      systemUserToken: decrypt(waba.systemUserToken),
    };
  },
};
