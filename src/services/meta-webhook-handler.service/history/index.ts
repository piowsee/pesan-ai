import { decrypt } from '@/lib/server/encryption';
import { logger } from '@/lib/server/logger';
import { MessageRepository } from '@/repositories/message.repository';
import { PhoneNumberRepository } from '@/repositories/phone-number.repository';
import { SyncRequestRepository } from '@/repositories/sync-request.repository';
import { HistoryValue } from '@/schemas/meta-webhook-handler.schema';
import { MetaFetchService } from '@/services/meta-fetch.service';
import { S3Service } from '@/services/s3.service';

export const HistoryWebhookHandler = {
  // @see https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/reference/history
  async processChange(params: {
    metaWabaId: string;
    value: HistoryValue;
  }): Promise<number> {
    const { metaWabaId, value } = params;
    const { metadata, history, messages } = value;
    let processedCount = 0;

    const phoneNumber = await PhoneNumberRepository.findPhoneNumberByMetaId(
      metadata.phone_number_id,
    );

    if (!phoneNumber) {
      logger.warn('Received history webhook for unknown phone number', {
        metaWabaId,
        phoneNumberId: metadata.phone_number_id,
      });
      return 0;
    }

    const pendingRequests =
      await SyncRequestRepository.findPendingByPhoneNumberId({
        phoneNumberId: phoneNumber.id,
      });
    const activeSyncRequest = pendingRequests[0];

    // Handle history error payloads
    if (history && history.length > 0) {
      for (const entry of history) {
        if (entry.errors && entry.errors.length > 0) {
          logger.warn('Received error in history webhook', {
            errors: entry.errors,
            phoneNumberId: phoneNumber.phoneNumberId,
          });

          if (activeSyncRequest) {
            await SyncRequestRepository.updateSyncRequestStatus({
              requestId: activeSyncRequest.requestId,
              status: 'failed',
            });
          }
          return 0; // We can't proceed if there are errors
        }

        const progress = entry.metadata?.progress;
        if (activeSyncRequest && progress !== undefined) {
          const status = progress === 100 ? 'completed' : 'in_progress';
          await SyncRequestRepository.updateSyncRequestStatus({
            requestId: activeSyncRequest.requestId,
            status,
            progress,
          });
        }

        if (entry.threads) {
          for (const thread of entry.threads) {
            if (!thread.messages) continue;

            const customerPhone = thread.id.replace(/\D/g, '');

            for (const message of thread.messages) {
              const displayPhone = metadata.display_phone_number.replace(
                /\D/g,
                '',
              );
              const messageFrom = message.from?.replace(/\D/g, '') || '';
              const isOutgoing = messageFrom === displayPhone;
              let status = (
                message.history_context?.status || ''
              ).toLowerCase();
              if (status === 'played') {
                status = 'read';
              }
              const messageData = {
                messageId: message.id,
                type: message.type,
                timestamp: new Date(Number(message.timestamp) * 1000),
                content:
                  message.type === 'text' ? message.text?.body : undefined,
                metadata: JSON.stringify(message), // store full raw message as metadata
                status: status || 'sent',
                source: 'whatsapp_app' as const,
              };

              try {
                if (isOutgoing) {
                  await MessageRepository.processOutgoingMessageEcho({
                    phoneNumberId: phoneNumber.id,
                    customerPhone,
                    message: messageData,
                  });
                } else {
                  await MessageRepository.processIncomingMessage({
                    phoneNumberId: phoneNumber.id,
                    customerPhone,
                    message: messageData,
                  });
                }
                processedCount++;
              } catch (error) {
                logger.error('Failed to process history message', {
                  messageId: message.id,
                  error: error instanceof Error ? error.message : String(error),
                });
              }
            }
          }
        }
      }
    }

    // Handle media follow-up webhooks
    if (messages && messages.length > 0) {
      for (const message of messages) {
        try {
          const mediaObj = (
            message as Record<
              string,
              { id?: string; mime_type?: string; caption?: string } | undefined
            >
          )[message.type];
          const mediaId = mediaObj?.id;

          if (!mediaId) {
            // No media ID to fetch, just update type
            await MessageRepository.updateMediaPlaceholder({
              messageId: message.id,
              type: message.type,
              mediaObjectKey: '',
              mediaMimeType: '',
              mediaSize: null,
              metadata: JSON.stringify(message),
            });
            processedCount++;
            continue;
          }

          const existingMessage = await MessageRepository.findMessageWithWaba(
            message.id,
          );

          if (!existingMessage) {
            logger.warn(
              'Received history media follow-up for unknown message. Ignoring.',
              {
                messageId: message.id,
              },
            );
            continue;
          }

          const waba = existingMessage.conversation.phoneNumber.waba;
          if (!waba.systemUserToken) {
            logger.warn('WABA missing token for media fetch', { metaWabaId });
            continue;
          }

          const token = decrypt(waba.systemUserToken);
          const mediaUrlInfo = await MetaFetchService.getMediaUrl({
            mediaId,
            token,
            phoneNumberId:
              existingMessage.conversation.phoneNumber.phoneNumberId,
          });

          if (mediaUrlInfo && mediaUrlInfo.url) {
            const streamedMedia =
              await S3Service.streamWhatsAppMediaToObjectStorage({
                whatsappUrl: mediaUrlInfo.url,
                token,
                userId: waba.userId,
                wabaId: waba.id,
                convId: existingMessage.conversation.id,
                contentType: mediaUrlInfo.mime_type || mediaObj?.mime_type,
              });

            await MessageRepository.updateMediaPlaceholder({
              messageId: message.id,
              type: message.type,
              mediaObjectKey: streamedMedia.key,
              mediaMimeType: streamedMedia.mediaMimeType || '',
              mediaSize:
                streamedMedia.mediaSize ||
                Number(mediaUrlInfo.file_size) ||
                null,
              content: mediaObj?.caption || undefined,
              metadata: JSON.stringify(message),
            });
            processedCount++;
          }
        } catch (error) {
          logger.error('Failed to process history media follow-up message', {
            messageId: message.id,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }

    logger.info('Processed history webhook', {
      metaWabaId,
      phoneNumberId: metadata.phone_number_id,
      processedCount,
    });

    return processedCount;
  },
};
