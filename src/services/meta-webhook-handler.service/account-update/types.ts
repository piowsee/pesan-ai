import type { AccountUpdateValue } from '@/schemas/meta-webhook-handler.schema';

export type AccountUpdateHandlerParams = {
  metaWabaId: string;
  eventTime?: number;
  value: AccountUpdateValue;
};
