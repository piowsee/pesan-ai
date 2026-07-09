import { logger } from '@/lib/server/logger';
import { PhoneNumberRepository } from '@/repositories/phone-number.repository';
import type { WebhookValue } from '@/schemas/meta-webhook-handler.schema/messages';
import type { Contact } from '@/schemas/meta-webhook-handler.schema/shared';

import {
  type WebhookContactDetails,
  type WebhookContactLookup,
} from '../shared';
import { IncomingMessageHandler } from './incoming-message';
import { StatusMessageHandler } from './status-message';

export const MessagesWebhookHandler = {
  async processChange(value: WebhookValue): Promise<number> {
    const metaPhoneNumberId = value.metadata?.phone_number_id; // Meta Phone Number ID.
    if (!metaPhoneNumberId) return 0;

    const internalPhoneResult =
      await PhoneNumberRepository.findPhoneNumberByMetaId(metaPhoneNumberId);

    if (!internalPhoneResult) {
      logger.warn('Received message for unknown Meta Phone Number ID', {
        metaPhoneNumberId,
      });
      return 0;
    }

    const incomingMessagesProcessed =
      await IncomingMessageHandler.processMessages({
        messages: value.messages,
        internalPhoneId: internalPhoneResult.id,
        contactsLookup: mapContacts(value.contacts),
      });
    const statusesProcessed = await StatusMessageHandler.processStatuses({
      statuses: value.statuses,
    });

    return incomingMessagesProcessed + statusesProcessed;
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
