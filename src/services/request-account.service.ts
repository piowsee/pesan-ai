import { ApiError } from '@/lib/api-helper/error';
import { EmailType, sendEmail } from '@/lib/auth/email/email';
import type { RequestAccountPayload } from '@/schemas/request-account.schema';

const DEFAULT_ACCOUNT_REQUEST_RECIPIENT = 'poc.helpteam@gmail.com';
const EMPTY_FIELD_LABEL = 'Not provided';

function buildAccountRequestText(payload: RequestAccountPayload) {
  return [
    'New Pesan AI account request',
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

export const RequestAccountService = {
  async sendRequest(payload: RequestAccountPayload) {
    const recipient =
      process.env.ACCOUNT_REQUEST_TO || DEFAULT_ACCOUNT_REQUEST_RECIPIENT;
    const subject = `New Pesan AI account request from ${payload.name}`;

    const info = await sendEmail({
      to: recipient,
      replyTo: payload.email,
      subject,
      type: EmailType.ACCOUNT_REQUEST,
      text: buildAccountRequestText(payload),
      params: {
        requester_name: payload.name,
        requester_email: payload.email,
        company_name: payload.companyName || EMPTY_FIELD_LABEL,
        phone_number: payload.phoneNumber || EMPTY_FIELD_LABEL,
        message: payload.message || EMPTY_FIELD_LABEL,
      },
    });

    if (!info) {
      throw new ApiError('Unable to send account request', 502);
    }

    return {
      message: 'Account request submitted successfully',
    };
  },
};
