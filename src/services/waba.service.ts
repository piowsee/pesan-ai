import { logError, logger } from '@/logger/logger';
import { WabaRepository } from '@/repositories/waba.repository';

export const WabaService = {
  async getWabasByUserId(userId: string) {
    logger.info('Fetching WABA list', { userId });

    try {
      const wabaList = await WabaRepository.findAllByUserId(userId);
      logger.info('WABA list fetched successfully', {
        userId,
        count: wabaList.length,
      });
      return wabaList;
    } catch (err) {
      logError(err, { action: 'getWabasByUserId', userId });
      throw err;
    }
  },
};
