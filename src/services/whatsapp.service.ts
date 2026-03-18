import { ApiError } from '@/lib/error';
import { logError, logger } from '@/logger/logger';

export const WhatsappService = {
  async sendTextMessage(
    phoneNumberId: string,
    token: string,
    to: string,
    text: string,
  ) {
    const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'text',
      text: {
        preview_url: false,
        body: text,
      },
    };

    logger.info('Sending WhatsApp message', { phoneNumberId, to });

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        logError(new Error('WhatsApp API error'), {
          status: response.status,
          data,
          phoneNumberId,
          to,
        });
        throw new ApiError(
          data.error?.message || 'Failed to send WhatsApp message',
          400,
        );
      }

      logger.info('WhatsApp message sent successfully', {
        messageId: data.messages?.[0]?.id,
      });

      return {
        messageId: data.messages?.[0]?.id,
        status: 'sent',
      };
    } catch (err) {
      if (err instanceof ApiError) throw err;

      logError(err, { action: 'sendTextMessage', phoneNumberId, to });
      throw err;
    }
  },
};
