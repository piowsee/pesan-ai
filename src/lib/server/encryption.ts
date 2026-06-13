// this file need to be called on startup
import { logError } from '@/lib/server/logger';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

import { ApiError } from '../api-helper/error';

/**
 * Gets the encryption key from environment variables.
 * Key must be 32 Bytes (256 bits). We need to convert to utf-8 and check the size
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error('ENCRYPTION_KEY is not set in environment variables');
  }

  const keyBuffer = Buffer.from(key, 'utf8');

  if (keyBuffer.length !== 32) {
    throw new Error('ENCRYPTION_KEY must be exactly 32 Bytes');
  }

  return keyBuffer;
}

const key = getEncryptionKey();
const PREFIX = 'enc';
const ALGO = 'aes-256-gcm';

/**
 * Encrypts a string using AES-256-GCM.
 * Encrypted tokens are prefixed with "enc:" to distinguish them.
 */
export function encrypt(text: string): string {
  try {
    const iv = randomBytes(12);
    const cipher = createCipheriv(ALGO, key, iv);
    const encryptedData = Buffer.concat([
      cipher.update(text, 'utf8'),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();

    return `${PREFIX}:${iv.toString('base64')}:${authTag.toString('base64')}:${encryptedData.toString('base64')}`;
  } catch (err) {
    logError(err, { action: 'encrypt helper' });
    throw new ApiError('Internal Server Error', 500);
  }
}

/**
 * Decrypts a string using AES-256-GCM.
 * Handles both "enc:" prefixed strings.
 */
export function decrypt(text: string): string {
  if (!text || !text.startsWith(PREFIX)) {
    logError(new Error('Decrypt failed: data is null or missing prefix'), {
      action: 'decrypt helper',
      reason: 'malformed_payload',
    });
    throw new ApiError('Internal Server Error', 500);
  }

  try {
    const slicedText = text.split(':');
    const ivB64 = slicedText[1];
    const tagB64 = slicedText[2];
    const encryptedB64 = slicedText[3];

    if (!ivB64 || !tagB64 || !encryptedB64) {
      logError(new Error('Decrypt failed: invalid format'), {
        action: 'decrypt helper',
        reason: 'malformed_payload',
      });
      throw new ApiError('Internal Server Error', 500);
    }

    const iv = Buffer.from(ivB64, 'base64');
    const authTag = Buffer.from(tagB64, 'base64');
    const encrypted = Buffer.from(encryptedB64, 'base64');

    const decipher = createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]).toString('utf8');

    return decrypted;
  } catch (err) {
    logError(err, { action: 'decrypt helper' });
    throw new ApiError('Internal Server Error', 500);
  }
}
