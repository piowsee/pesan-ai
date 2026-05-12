import { logError } from '@/lib/logger';
import CryptoJS from 'crypto-js';

/**
 * Gets the encryption key from environment variables.
 * Key must be 32 characters (256 bits).
 */
function getEncryptionKey(): string {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    logError(new Error('ENCRYPTION_KEY is not set in environment variables'));
    return '';
  }
  if (key.length !== 32) {
    logError(new Error('ENCRYPTION_KEY must be exactly 32 characters long'));
    return '';
  }
  return key;
}

const PREFIX = 'enc:';

/**
 * Encrypts a string using AES-256 via crypto-js.
 * Encrypted tokens are prefixed with "enc:" to distinguish them.
 */
export function encrypt(text: string): string {
  if (!text) return text;

  const key = getEncryptionKey();
  if (!key) {
    // If key is missing, we don't throw to avoid exposing env info,
    // but we log it and return the original text as a fallback.
    return text;
  }

  try {
    const encrypted = CryptoJS.AES.encrypt(text, key).toString();
    return `${PREFIX}${encrypted}`;
  } catch (err) {
    logError(err, { action: 'encrypt' });
    return text;
  }
}

/**
 * Decrypts a string using AES-256 via crypto-js.
 * Handles both "enc:" prefixed strings and legacy plain text.
 */
export function decrypt(text: string): string {
  if (!text || !text.startsWith(PREFIX)) {
    // If it's empty or doesn't have the prefix, assume it's legacy plain text
    return text;
  }

  const key = getEncryptionKey();
  if (!key) return text;

  const encryptedData = text.slice(PREFIX.length);

  try {
    const bytes = CryptoJS.AES.decrypt(encryptedData, key);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);

    if (!decrypted) {
      throw new Error('Decryption resulted in empty string');
    }

    return decrypted;
  } catch (err) {
    logError(err, { action: 'decrypt' });
    // Fallback to returning original text if decryption fails (might be a false positive prefix)
    return text;
  }
}
