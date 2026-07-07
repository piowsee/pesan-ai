import { logger } from '@/lib/server/logger';
import { WabaRepository } from '@/repositories/waba.repository';

import type { AccountUpdateHandlerParams } from './types';

export async function handleAccountOffboarded({
  metaWabaId,
  eventTime,
}: AccountUpdateHandlerParams) {
  const result = await WabaRepository.updateStatusByMetaWabaId({
    wabaId: metaWabaId,
    status: 'disconnected',
  });

  logger.info('Processed ACCOUNT_OFFBOARDED webhook', {
    metaWabaId,
    eventTime,
    updatedCount: result.count,
  });

  return result.count;
}
