import type { AccountUpdateValue } from '@/schemas/meta-webhook-handler.schema/account-update';

export type AccountUpdateHandlerParams = {
  metaWabaId: string;
  eventTime?: number;
  value: AccountUpdateValue;
};
