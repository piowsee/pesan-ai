import { logger } from '@/lib/server/logger';
import prisma from '@/lib/server/prisma';
import { ContactRepository } from '@/repositories/contact.repository';
import { SmbAppStateSyncValue } from '@/schemas/meta-webhook-handler.schema';

export const SmbAppStateSyncWebhookHandler = {
  // @see https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/reference/smb_app_state_sync
  async processChange(params: {
    metaWabaId: string;
    value: SmbAppStateSyncValue;
  }): Promise<number> {
    const { metaWabaId, value } = params;
    const { metadata, state_sync } = value;

    if (!state_sync || state_sync.length === 0) {
      return 0;
    }

    // Find the internal phone number
    const phoneNumber = await prisma.phoneNumber.findUnique({
      where: { phoneNumberId: metadata.phone_number_id },
    });

    if (!phoneNumber) {
      logger.warn(
        'Received smb_app_state_sync webhook for unknown phone number',
        {
          metaWabaId,
          phoneNumberId: metadata.phone_number_id,
        },
      );
      return 0;
    }

    let processedCount = 0;

    for (const entry of state_sync) {
      if (!entry.contact || !entry.contact.phone_number) {
        continue;
      }

      const { phone_number, full_name, first_name } = entry.contact;
      const customerName = full_name ?? first_name ?? null;

      try {
        if (entry.action === 'add') {
          await ContactRepository.upsertContact({
            customerPhone: phone_number,
            customerName,
          });
          processedCount++;
        } else if (entry.action === 'remove') {
          // If a contact is removed, we shouldn't delete the record to preserve conversation history.
          // Instead, we clear the name.
          await ContactRepository.upsertContact({
            customerPhone: phone_number,
            customerName: null,
          });
          processedCount++;
        }
      } catch (error) {
        logger.error('Failed to process smb_app_state_sync entry', {
          action: entry.action,
          customerPhone: phone_number,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    logger.info('Processed smb_app_state_sync webhook', {
      metaWabaId,
      phoneNumberId: metadata.phone_number_id,
      processedCount,
      totalEntries: state_sync.length,
    });

    return processedCount;
  },
};
