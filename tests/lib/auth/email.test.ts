import { logError, logger } from '@/lib/server/logger';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mailMocks = vi.hoisted(() => {
  const sendMail = vi.fn();

  return {
    createTransport: vi.fn(() => ({ sendMail })),
    sendMail,
  };
});

vi.mock('nodemailer', () => ({
  default: {
    createTransport: mailMocks.createTransport,
  },
}));

describe('auth email helper', { tags: ['backend'] }, () => {
  beforeEach(() => {
    mailMocks.createTransport.mockClear();
    mailMocks.sendMail.mockClear();
    vi.stubEnv('SMTP_HOST', 'smtp.test.local');
    vi.stubEnv('SMTP_PORT', '2525');
    vi.stubEnv('SMTP_USER', 'smtp-user');
    vi.stubEnv('SMTP_PASS', 'smtp-pass');
    mailMocks.sendMail.mockResolvedValue({ messageId: 'message-1' });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('sends reset-password email with the rendered template and SMTP options', async () => {
    vi.stubEnv('EMAIL_FROM', '"Pesan AI" <hello@example.com>');
    const { EmailType, sendEmail } = await import('@/lib/auth/email/email');

    const info = await sendEmail({
      to: 'user@example.com',
      subject: 'Reset your password',
      type: EmailType.RESET_PASSWORD,
      text: 'Reset using the secure link.',
      params: {
        user_name: 'Ada',
        reset_url: 'https://app.test/reset-password?token=reset-token',
      },
    });

    expect(mailMocks.createTransport).toHaveBeenCalledWith({
      host: 'smtp.test.local',
      port: 2525,
      auth: {
        user: 'smtp-user',
        pass: 'smtp-pass',
      },
    });
    expect(mailMocks.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: '"Pesan AI" <hello@example.com>',
        to: 'user@example.com',
        subject: 'Reset your password',
        text: 'Reset using the secure link.',
      }),
    );

    const sentMessage = mailMocks.sendMail.mock.calls[0]?.[0];
    expect(sentMessage.html).toContain('Hi Ada,');
    expect(sentMessage.html).toContain('Pesan AI');
    expect(sentMessage.html).toContain(
      'https://app.test/reset-password?token=reset-token',
    );
    expect(sentMessage.html).not.toContain('{{');
    expect(logger.info).toHaveBeenCalledWith('Email sent: message-1', {
      to: 'user@example.com',
      subject: 'Reset your password',
      type: EmailType.RESET_PASSWORD,
    });
    expect(info).toEqual({ messageId: 'message-1' });
  });

  it('sends account request email with reply-to details', async () => {
    vi.stubEnv('EMAIL_FROM', '"Pesan AI" <hello@example.com>');
    const { EmailType, sendEmail } = await import('@/lib/auth/email/email');

    const info = await sendEmail({
      to: 'poc.helpteam@gmail.com',
      replyTo: 'owner@example.com',
      subject: 'New Pesan AI account request from Owner',
      type: EmailType.ACCOUNT_REQUEST,
      text: 'New account request details',
      params: {
        requester_name: 'Owner',
        requester_email: 'owner@example.com',
        company_name: 'Owner Studio',
        phone_number: '+62 812 3456 7890',
        message: 'Please contact me.',
      },
    });

    expect(mailMocks.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: '"Pesan AI" <hello@example.com>',
        to: 'poc.helpteam@gmail.com',
        replyTo: 'owner@example.com',
        subject: 'New Pesan AI account request from Owner',
        text: 'New account request details',
      }),
    );
    expect(mailMocks.sendMail.mock.calls[0]?.[0].html).toContain(
      'Owner Studio',
    );
    expect(info).toEqual({ messageId: 'message-1' });
  });

  it('uses fallback sender and subject text while logging development links', async () => {
    vi.stubEnv('EMAIL_FROM', '');
    vi.stubEnv('NODE_ENV', 'development');
    const { EmailType, sendEmail } = await import('@/lib/auth/email/email');

    await sendEmail({
      to: 'new-user@example.com',
      subject: 'Verify your email address',
      type: EmailType.VERIFICATION,
      params: {
        user_name: 'Grace',
        verification_url:
          'https://app.test/verify-email?token=verification-token',
      },
    });

    expect(mailMocks.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: '"Pesan AI" <noreply@example.com>',
        to: 'new-user@example.com',
        subject: 'Verify your email address',
        text: 'Verify your email address',
      }),
    );
    expect(mailMocks.sendMail.mock.calls[0]?.[0].html).toContain('Hi Grace,');
    expect(logger.info).toHaveBeenCalledWith(
      'Verification URL: https://app.test/verify-email?token=verification-token',
    );
  });

  it('sends change-email-confirmation email with the rendered template and logs the approval URL in development', async () => {
    vi.stubEnv('EMAIL_FROM', '"Pesan AI" <hello@example.com>');
    vi.stubEnv('NODE_ENV', 'development');
    const { EmailType, sendEmail } = await import('@/lib/auth/email/email');

    const info = await sendEmail({
      to: 'old@example.com',
      subject: 'Approve email change',
      type: EmailType.CHANGE_EMAIL_CONFIRMATION,
      params: {
        user_name: 'Kai',
        new_email: 'new@example.com',
        approval_url:
          'https://app.test/change-email/approve?token=change-token',
      },
    });

    expect(mailMocks.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: '"Pesan AI" <hello@example.com>',
        to: 'old@example.com',
        subject: 'Approve email change',
        text: 'Approve email change',
      }),
    );

    const sentMessage = mailMocks.sendMail.mock.calls[0]?.[0];
    expect(sentMessage.html).toContain('Hi Kai,');
    expect(sentMessage.html).toContain('Pesan AI');
    expect(sentMessage.html).toContain('new@example.com');
    expect(sentMessage.html).toContain(
      'https://app.test/change-email/approve?token=change-token',
    );
    expect(sentMessage.html).not.toContain('{{');
    expect(logger.info).toHaveBeenCalledWith('Email sent: message-1', {
      to: 'old@example.com',
      subject: 'Approve email change',
      type: EmailType.CHANGE_EMAIL_CONFIRMATION,
    });
    expect(logger.info).toHaveBeenCalledWith(
      'Change email approval URL: https://app.test/change-email/approve?token=change-token',
    );
    expect(info).toEqual({ messageId: 'message-1' });
  });

  it('logs mail transport failures without throwing', async () => {
    const error = new Error('SMTP unavailable');
    mailMocks.sendMail.mockRejectedValue(error);
    const { EmailType, sendEmail } = await import('@/lib/auth/email/email');

    await expect(
      sendEmail({
        to: 'user@example.com',
        subject: 'Reset your password',
        type: EmailType.RESET_PASSWORD,
        params: {
          user_name: 'Ada',
          reset_url: 'https://app.test/reset-password?token=reset-token',
        },
      }),
    ).resolves.toBeUndefined();

    expect(logError).toHaveBeenCalledWith(error, {
      to: 'user@example.com',
      subject: 'Reset your password',
      type: EmailType.RESET_PASSWORD,
    });
  });
});
