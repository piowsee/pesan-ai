import { logError, logger } from '@/lib/server/logger';
import fs from 'fs';
import nodemailer, { type SentMessageInfo, type Transporter } from 'nodemailer';
import path from 'path';

export enum EmailType {
  VERIFICATION = 'verification',
  RESET_PASSWORD = 'reset-password',
  CHANGE_EMAIL_CONFIRMATION = 'change-email-confirmation',
}

interface BaseTemplateParams {
  app_name?: string;
}

interface VerificationParams extends BaseTemplateParams {
  user_name: string;
  verification_url: string;
}

interface ResetPasswordParams extends BaseTemplateParams {
  user_name: string;
  reset_url: string;
}

interface ChangeEmailConfirmationParams extends BaseTemplateParams {
  user_name: string;
  new_email: string;
  approval_url: string;
}

type TemplateParams =
  | VerificationParams
  | ResetPasswordParams
  | ChangeEmailConfirmationParams;

const getTransporter = (): Transporter => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

/**
 * Load and populate an HTML template
 */
const loadTemplate = (type: EmailType, params: TemplateParams): string => {
  const templatePath = path.join(
    process.cwd(),
    'src',
    'lib',
    'auth',
    'email',
    'templates',
    `${type}.html`,
  );

  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template not found: ${type}`);
  }

  const template = fs.readFileSync(templatePath, 'utf8');

  params.app_name = 'Pesan AI';

  return template.replace(/{{\s*(.+?)\s*}}/g, (match, key) => {
    return (params as unknown as Record<string, string>)[key] || match;
  });
};

type SendEmailOptions =
  | {
      to: string;
      subject: string;
      type: EmailType.VERIFICATION;
      params: VerificationParams;
      text?: string;
    }
  | {
      to: string;
      subject: string;
      type: EmailType.RESET_PASSWORD;
      params: ResetPasswordParams;
      text?: string;
    }
  | {
      to: string;
      subject: string;
      type: EmailType.CHANGE_EMAIL_CONFIRMATION;
      params: ChangeEmailConfirmationParams;
      text?: string;
    };

/**
 * Send an email using a template
 */
export async function sendEmail(
  options: SendEmailOptions,
): Promise<SentMessageInfo> {
  const { to, subject, type, params, text } = options;
  try {
    const html = loadTemplate(type, params);
    const transporter = getTransporter();

    const info: SentMessageInfo = await transporter.sendMail({
      from: process.env.EMAIL_FROM || '"Pesan AI" <noreply@example.com>',
      to,
      subject,
      text: text || subject,
      html,
    });

    logger.info(`Email sent: ${info.messageId}`, { to, subject, type });

    if (process.env.NODE_ENV === 'development') {
      if ('verification_url' in params) {
        logger.info(`Verification URL: ${params.verification_url}`);
      }
      if ('reset_url' in params) {
        logger.info(`Reset URL: ${params.reset_url}`);
      }
      if ('approval_url' in params) {
        logger.info(`Change email approval URL: ${params.approval_url}`);
      }
    }

    return info;
  } catch (error) {
    logError(error, { to, subject, type });
  }
}
