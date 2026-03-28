import { ApiError } from '@/lib/error';
import { logError, logger } from '@/logger/logger';
import { WabaRepository } from '@/repositories/waba.repository';

interface PhoneNumberWithWebhook {
  id: string;
  displayPhoneNumber: string;
  botWebhook?: {
    id: string;
    name: string;
    webhookUrl: string;
  } | null;
}

interface WabaWithRelations {
  id: string;
  wabaId: string;
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

  async getWabasByUserId(userId: string) {
    logger.info('Fetching WABA list for user', { userId });
    try {
      const wabaList = await WabaRepository.findAllByUserId(userId);
      return wabaList.map(this._mapWaba);
    } catch (err) {
      logError(err, { action: 'getWabasByUserId', userId });
      throw err;
    }
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
    try {
      const offset = (page - 1) * limit;
      const { wabas, total } = userId
        ? await WabaRepository.findPaginatedByUserId(limit, offset, userId)
        : await WabaRepository.findPaginated(limit, offset);

      return {
        wabas: wabas.map(this._mapWaba),
        total,
      };
    } catch (err) {
      logError(err, { action: 'getWabasPaginated', page, limit, userId });
      throw err;
    }
  },

  async getTotalUnreadListByUserId(userId: string) {
    logger.info('Fetching total unread counts for all WABAs', { userId });

    try {
      const result = await WabaRepository.getTotalUnreadListByUserId(userId);
      logger.info('Total unread counts fetched successfully', {
        userId,
        count: result.length,
      });
      return result;
    } catch (err) {
      logError(err, { action: 'getTotalUnreadListByUserId', userId });
      throw err;
    }
  },

  async assignWebhookToWaba(wabaId: string, webhookId: string | null) {
    logger.info('Assigning webhook to WABA', { wabaId, webhookId });
    try {
      const waba = await WabaRepository.findById(wabaId);
      if (!waba) {
        throw new ApiError('WABA not found', 404);
      }

      await WabaRepository.updateWabaWebhook(wabaId, webhookId);
      return { success: true };
    } catch (err) {
      logError(err, { action: 'assignWebhookToWaba', wabaId, webhookId });
      throw err;
    }
  },
};
