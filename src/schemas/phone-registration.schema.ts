import { z } from 'zod';

export const CreatePhoneNumberSchema = z.object({
  wabaId: z.string().min(1, 'WABA ID is required'),
  countryCode: z.string().min(1, 'Country code is required').default('62'),
  phoneNumber: z.string().min(1, 'Phone number is required'),
  name: z.string().min(1, 'Name is required'),
});

export const RequestVerificationCodeSchema = z.object({
  phoneNumberId: z.string().min(1, 'Phone number ID is required'),
  wabaId: z.string().min(1, 'WABA ID is required'),
  codeMethod: z.enum(['SMS', 'VOICE']).optional().default('SMS'),
  language: z.string().optional().default('en_US'),
});

export const VerifyAndRegisterSchema = z.object({
  phoneNumberId: z.string().min(1, 'Phone number ID is required'),
  wabaId: z.string().min(1, 'WABA ID is required'),
  code: z
    .string()
    .min(6, 'Verification code must be 6 digits')
    .max(6, 'Verification code must be 6 digits')
    .regex(/^\d{6}$/, 'Verification code must be 6 digits'),
});
