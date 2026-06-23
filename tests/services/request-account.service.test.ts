import { ApiError } from '@/lib/api-helper/error';
import { EmailType, sendEmail } from '@/lib/auth/email/email';
import { RequestAccountService } from '@/services/request-account.service';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.unmock('@/services/request-account.service');

vi.mock('@/lib/auth/email/email', () => ({
  EmailType: {
    ACCOUNT_REQUEST: 'account-request',
  },
  sendEmail: vi.fn(),
}));

describe('RequestAccountService', { tags: ['backend'] }, () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends an account request email to the POC inbox', async () => {
    vi.mocked(sendEmail).mockResolvedValue({ messageId: 'message-1' } as never);

    const result = await RequestAccountService.sendRequest({
      name: 'Jane Owner',
      email: 'jane@example.com',
      companyName: 'Jane Studio',
      phoneNumber: '6281234567890',
      message: 'Need access for two operators.',
    });

    expect(sendEmail).toHaveBeenCalledWith({
      to: 'poc.helpteam@gmail.com',
      replyTo: 'jane@example.com',
      subject: 'New Pesan AI account request from Jane Owner',
      type: EmailType.ACCOUNT_REQUEST,
      text: [
        'New Pesan AI account request',
        '',
        'Name: Jane Owner',
        'Email: jane@example.com',
        'Company: Jane Studio',
        'Phone: 6281234567890',
        '',
        'Message:',
        'Need access for two operators.',
      ].join('\n'),
      params: {
        requester_name: 'Jane Owner',
        requester_email: 'jane@example.com',
        company_name: 'Jane Studio',
        phone_number: '6281234567890',
        message: 'Need access for two operators.',
      },
    });
    expect(result).toEqual({
      message: 'Account request submitted successfully',
    });
  });

  it('throws an ApiError when the email helper cannot send', async () => {
    vi.mocked(sendEmail).mockResolvedValue(undefined as never);

    await expect(
      RequestAccountService.sendRequest({
        name: 'Jane Owner',
        email: 'jane@example.com',
      }),
    ).rejects.toMatchObject({
      message: 'Unable to send account request',
      status: 502,
    } satisfies Partial<ApiError>);
  });
});
