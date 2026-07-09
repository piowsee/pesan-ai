import { z } from 'zod';

import { AccountUpdateValueSchema } from './account-update';
import { HistoryValueSchema } from './history';
import { WebhookValueSchema } from './messages';
import { SmbAppStateSyncValueSchema } from './smb-app-state-sync';
import { WebhookMessageEchoValueSchema } from './smb-message-echoes';

const WebhookChangeSchema = z.discriminatedUnion('field', [
  z.object({
    field: z.literal('messages'),
    value: WebhookValueSchema,
  }),
  z.object({
    field: z.literal('smb_message_echoes'),
    value: WebhookMessageEchoValueSchema,
  }),
  z.object({
    field: z.literal('account_update'),
    value: AccountUpdateValueSchema,
  }),
  z.object({
    field: z.literal('smb_app_state_sync'),
    value: SmbAppStateSyncValueSchema,
  }),
  z.object({
    field: z.literal('history'),
    value: HistoryValueSchema,
  }),
]);

const WebhookEntrySchema = z
  .object({
    id: z.string(),
    time: z.number().optional(),
    changes: z.array(WebhookChangeSchema).optional(),
  })
  .passthrough();

export const MetaWebhookPayloadSchema = z.object({
  object: z.literal('whatsapp_business_account'),
  entry: z.array(WebhookEntrySchema).optional(),
});

export {
  AccountUpdateEventSchema,
  AccountUpdateValueSchema,
} from './account-update';
export { WebhookValueSchema, WebhookMessageSchema } from './messages';
export {
  WebhookMessageEchoSchema,
  WebhookMessageEchoValueSchema,
} from './smb-message-echoes';
export { SmbAppStateSyncValueSchema } from './smb-app-state-sync';
export { HistoryValueSchema } from './history';
export { ContactSchema } from './shared';

export type MetaWebhookPayload = z.infer<typeof MetaWebhookPayloadSchema>;
export type WebhookEntry = z.infer<typeof WebhookEntrySchema>;
export type { AccountUpdateEvent, AccountUpdateValue } from './account-update';
export type { WebhookMessage, WebhookStatus, WebhookValue } from './messages';
export type {
  WebhookMessageEcho,
  WebhookMessageEchoValue,
} from './smb-message-echoes';
export type { SmbAppStateSyncValue } from './smb-app-state-sync';
export type { HistoryValue, HistoryMessage } from './history';
export type { Contact } from './shared';
