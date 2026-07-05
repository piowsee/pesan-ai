import { logger } from '@/lib/server/logger';
import { ConversationRepository } from '@/repositories/conversation.repository';
import type {
  Contact,
  WebhookValue,
} from '@/schemas/meta-webhook-handler.schema';

import {
  type WebhookContactDetails,
  type WebhookContactLookup,
} from '../shared';
import { IncomingMessageHandler } from './incoming-message';

export const MessagesWebhookHandler = {
  async processChange(value: WebhookValue): Promise<number> {
    const metaPhoneNumberId = value.metadata?.phone_number_id; // Meta Phone Number ID.
    if (!metaPhoneNumberId) return 0;

    const internalPhoneResult =
      await ConversationRepository.findPhoneNumberByMetaId(metaPhoneNumberId);

    if (!internalPhoneResult) {
      logger.warn('Received message for unknown Meta Phone Number ID', {
        metaPhoneNumberId,
      });
      return 0;
    }

    return IncomingMessageHandler.processMessages({
      messages: value.messages,
      internalPhoneId: internalPhoneResult.id,
      contactsLookup: mapContacts(value.contacts),
    });
  },
};

function mapContacts(contacts: Contact[] = []): WebhookContactLookup {
  const lookup: WebhookContactLookup = {
    byPhone: new Map(),
    byBsuid: new Map(),
  };

  for (const contact of contacts) {
    const details: WebhookContactDetails = {
      bsuid: contact.user_id,
      customerPhone: contact.wa_id,
      customerName: contact.profile?.name,
      customerUsername: contact.profile?.username,
    };

    if (!details.bsuid && !details.customerPhone && !details.customerUsername) {
      continue;
    }

    if (details.customerPhone) {
      lookup.byPhone.set(details.customerPhone, details);
    }

    if (details.bsuid) {
      lookup.byBsuid.set(details.bsuid, details);
    }
  }

  return lookup;
}
