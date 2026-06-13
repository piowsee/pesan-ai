import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.unmock('@/lib/server/encryption');

describe('server encryption helper', { tags: ['backend'] }, () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('ENCRYPTION_KEY', '12345678901234567890123456789012');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('encrypts plaintext with an enc prefix and decrypts it back', async () => {
    const { decrypt, encrypt } = await import('@/lib/server/encryption');

    const encrypted = encrypt('secret-token');

    expect(encrypted).toMatch(/^enc:[^:]+:[^:]+:[^:]+$/);
    expect(encrypted).not.toBe('secret-token');
    expect(decrypt(encrypted)).toBe('secret-token');
  });

  it('uses a fresh iv for each encryption call', async () => {
    const { encrypt } = await import('@/lib/server/encryption');

    expect(encrypt('same-token')).not.toBe(encrypt('same-token'));
  });

  it('throws when decrypting plaintext seeded without encryption', async () => {
    const { decrypt } = await import('@/lib/server/encryption');

    expect(() => decrypt('plain-seeded-token')).toThrow(
      'Internal Server Error',
    );
  });
});
