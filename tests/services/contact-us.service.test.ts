import { ApiError } from '@/lib/api-helper/error';
import { EmailType, sendEmail } from '@/lib/auth/email/email';
import { ContactUsService } from '@/services/contact-us.service';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.unmock('@/services/contact-us.service');

vi.mock('@/lib/auth/email/email', () => ({
  EmailType: {
    CONTACT_US: 'contact-us',
  },
  sendEmail: vi.fn(),
}));

describe('ContactUsService', { tags: ['backend'] }, () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends a contact request email to the POC inbox', async () => {
    vi.mocked(sendEmail).mockResolvedValue({ messageId: 'message-1' } as never);

    const result = await ContactUsService.submitRequest({
      name: 'Jane Owner',
      email: 'jane@example.com',
      companyName: 'Jane Studio',
      phoneNumber: '6281234567890',
      message: 'Need access for two operators.',
    });

    expect(sendEmail).toHaveBeenCalledWith({
      to: 'poc.helpteam@gmail.com',
      replyTo: 'jane@example.com',
      subject: 'New Pesan AI contact request from Jane Owner',
      type: EmailType.CONTACT_US,
      text: [
        'New Pesan AI contact request',
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
      message: 'Contact request submitted successfully',
    });
  });

  it('throws an ApiError when the email helper cannot send', async () => {
    vi.mocked(sendEmail).mockResolvedValue(undefined as never);

    await expect(
      ContactUsService.submitRequest({
        name: 'Jane Owner',
        email: 'jane@example.com',
      }),
    ).rejects.toMatchObject({
      message: 'Unable to send contact request',
      status: 502,
    } satisfies Partial<ApiError>);
  });
});
