import { logger } from '@/lib/server/logger';
import { ContactRepository } from '@/repositories/contact.repository';
import { PhoneNumberRepository } from '@/repositories/phone-number.repository';
import { SyncRequestRepository } from '@/repositories/sync-request.repository';
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
    const phoneNumber = await PhoneNumberRepository.findPhoneNumberByMetaId(
      metadata.phone_number_id,
    );

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

    const contactsPayload = [];

    for (const entry of state_sync) {
      if (!entry.contact || !entry.contact.phone_number) {
        continue;
      }

      const { phone_number, full_name, first_name } = entry.contact;
      const customerName = full_name ?? first_name ?? null;

      if (entry.action === 'add') {
        contactsPayload.push({
          phoneNumberId: phoneNumber.id,
          customerPhone: phone_number,
          customerName,
        });
      } else if (entry.action === 'remove') {
        contactsPayload.push({
          phoneNumberId: phoneNumber.id,
          customerPhone: phone_number,
          customerName: null,
        });
      }
    }

    const pendingRequests =
      await SyncRequestRepository.findPendingByPhoneNumberId({
        phoneNumberId: phoneNumber.id,
      });
    // For SMB App State Sync, we might just grab the first pending request since it is the latest req
    const activeSyncRequest =
      pendingRequests.find((req) => req.syncType === 'smb_app_state_sync') ??
      pendingRequests[0];

    let processedCount = 0;
    if (contactsPayload.length > 0) {
      try {
        processedCount =
          await ContactRepository.upsertContactsBulk(contactsPayload);

        if (activeSyncRequest) {
          await SyncRequestRepository.updateSyncRequestStatus({
            requestId: activeSyncRequest.requestId,
            status: 'completed',
          });
        }
      } catch (error) {
        if (activeSyncRequest) {
          await SyncRequestRepository.updateSyncRequestStatus({
            requestId: activeSyncRequest.requestId,
            status: 'failed',
          });
        }
        logger.error('Failed to process bulk smb_app_state_sync contacts', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    } else {
      if (activeSyncRequest) {
        await SyncRequestRepository.updateSyncRequestStatus({
          requestId: activeSyncRequest.requestId,
          status: 'completed',
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
