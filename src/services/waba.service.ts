import { ApiError } from '@/lib/api-helper/error';
import { logger } from '@/lib/server/logger';
import { PhoneNumberRepository } from '@/repositories/phone-number.repository';
import { WabaRepository } from '@/repositories/waba.repository';

interface PhoneNumberWithWebhook {
  id: string; // Internal DB PhoneNumber.id.
  displayPhoneNumber: string;
  botWebhook?: {
    id: string;
    name: string;
    webhookUrl: string;
  } | null;
}

interface WabaWithRelations {
  id: string; // Internal DB WhatsappBusinessAccount.id.
  wabaId: string; // Meta WABA ID.
  businessName: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  user?: {
    id: string;
    name: string;
    email: string;
  } | null;
  phoneNumbers?: PhoneNumberWithWebhook[];
}

export const WabaService = {
  // map function to format WABA exactly as expected by the frontend
  _mapWaba(waba: WabaWithRelations) {
    // The first phone number's webhook specifies the assigned webhook
    const assignedWebhook = waba.phoneNumbers?.[0]?.botWebhook || null;
    return {
      id: waba.id,
      wabaId: waba.wabaId,
      businessName: waba.businessName,
      status: waba.status,
      createdAt: waba.createdAt,
      updatedAt: waba.updatedAt,
      // Include user details
      user: {
        id: waba.user?.id,
        name: waba.user?.name,
        email: waba.user?.email,
      },
      assignedWebhook,
      phoneNumbers:
        waba.phoneNumbers?.map((pn: PhoneNumberWithWebhook) => ({
          id: pn.id,
          displayPhoneNumber: pn.displayPhoneNumber,
        })) || [],
    };
  },

  async getWabasByUserId(params: { userId: string }) {
    const { userId } = params;
    logger.info('Fetching WABA list for user', { userId });
    const wabaList = await WabaRepository.findAllByUserId(userId);
    return wabaList.map(this._mapWaba);
  },
  async getWabasPaginated({
    page,
    limit,
    userId,
  }: {
    page: number;
    limit: number;
    userId?: string;
  }) {
    logger.info('Fetching paginated WABA list', { page, limit, userId });
    const offset = (page - 1) * limit;
    const { wabas, total } = userId
      ? await WabaRepository.findPaginatedByUserId({ limit, offset, userId })
      : await WabaRepository.findPaginated({ limit, offset });

    return {
      wabas: wabas.map(this._mapWaba),
      total,
    };
  },

  async getTotalUnreadListByUserId(params: { userId: string }) {
    const { userId } = params;
    logger.info('Fetching total unread counts for all WABAs', { userId });

    const result = await WabaRepository.getTotalUnreadListByUserId(userId);
    logger.info('Total unread counts fetched successfully', {
      userId,
      count: result.length,
    });
    return result;
  },

  async assignWebhookToWaba(params: {
    wabaId: string; // Internal DB WhatsappBusinessAccount.id.
    webhookId: string | null;
  }) {
    const { wabaId, webhookId } = params;
    logger.info('Assigning webhook to WABA', { wabaId, webhookId });
    const waba = await WabaRepository.findById(wabaId);
    if (!waba) {
      throw new ApiError('WABA not found', 404);
    }

    await PhoneNumberRepository.updateWabaWebhook({
      wabaId,
      botWebhookId: webhookId,
    });
    return { success: true };
  },
};
