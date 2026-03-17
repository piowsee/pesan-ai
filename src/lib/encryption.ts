import CryptoJS from 'crypto-js';

/**
 * Gets the encryption key from environment variables.
 * Key must be 32 characters (256 bits).
 */
function getEncryptionKey(): string {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error('ENCRYPTION_KEY is not set in environment variables');
  }
  if (key.length !== 32) {
    throw new Error('ENCRYPTION_KEY must be exactly 32 characters long');
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
  const encrypted = CryptoJS.AES.encrypt(text, key).toString();
  return `${PREFIX}${encrypted}`;
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
  const encryptedData = text.slice(PREFIX.length);

  try {
    const bytes = CryptoJS.AES.decrypt(encryptedData, key);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);

    if (!decrypted) {
      throw new Error('Decryption resulted in empty string');
    }

    return decrypted;
  } catch (err) {
    console.error('Decryption failed:', err);
    // Fallback to returning original text if decryption fails (might be a false positive prefix)
    return text;
  }
}
