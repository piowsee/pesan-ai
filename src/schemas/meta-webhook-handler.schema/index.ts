import { z } from 'zod';

import { AccountUpdateValueSchema } from './account-update';
import { WebhookValueSchema } from './messages';
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
export { ContactSchema } from './shared';

export type MetaWebhookPayload = z.infer<typeof MetaWebhookPayloadSchema>;
export type WebhookEntry = z.infer<typeof WebhookEntrySchema>;
export type { AccountUpdateEvent, AccountUpdateValue } from './account-update';
export type { WebhookMessage, WebhookStatus, WebhookValue } from './messages';
export type {
  WebhookMessageEcho,
  WebhookMessageEchoValue,
} from './smb-message-echoes';
export type { Contact } from './shared';
