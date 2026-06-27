import { ApiError } from '@/lib/api-helper/error';
import { EmailType, sendEmail } from '@/lib/auth/email/email';
import type { ContactUsPayload } from '@/schemas/contact-us.schema';

const DEFAULT_CONTACT_RECIPIENT = 'poc.helpteam@gmail.com';
const EMPTY_FIELD_LABEL = 'Not provided';

function buildContactRequestText(payload: ContactUsPayload) {
  return [
    'New Pesan AI contact request',
    '',
    `Name: ${payload.name}`,
    `Email: ${payload.email}`,
    `Company: ${payload.companyName || EMPTY_FIELD_LABEL}`,
    `Phone: ${payload.phoneNumber || EMPTY_FIELD_LABEL}`,
    '',
    'Message:',
    payload.message || EMPTY_FIELD_LABEL,
  ].join('\n');
}

export const ContactUsService = {
  async submitRequest(payload: ContactUsPayload) {
    const subject = `New Pesan AI contact request from ${payload.name}`;

    const info = await sendEmail({
      to: DEFAULT_CONTACT_RECIPIENT,
      replyTo: payload.email,
      subject,
      type: EmailType.CONTACT_US,
      text: buildContactRequestText(payload),
      params: {
        requester_name: payload.name,
        requester_email: payload.email,
        company_name: payload.companyName || EMPTY_FIELD_LABEL,
        phone_number: payload.phoneNumber || EMPTY_FIELD_LABEL,
        message: payload.message || EMPTY_FIELD_LABEL,
      },
    });

    if (!info) {
      throw new ApiError('Unable to send contact request', 502);
    }

    return {
      message: 'Contact request submitted successfully',
    };
  },
};
