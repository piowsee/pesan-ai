import { logger } from '@/lib/server/logger';
import { WabaRepository } from '@/repositories/waba.repository';

import type { AccountUpdateHandlerParams } from './types';

export async function handleAccountReconnected({
  metaWabaId,
  eventTime,
}: AccountUpdateHandlerParams) {
  const result = await WabaRepository.updateStatusByMetaWabaId({
    wabaId: metaWabaId,
    status: 'active',
  });

  logger.info('Processed ACCOUNT_RECONNECTED webhook', {
    metaWabaId,
    eventTime,
    updatedCount: result.count,
  });

  return result.count;
}
