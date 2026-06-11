import {
  _resetEncryptionKeyCache,
  decryptString,
  encryptString,
  encryptedColumn,
  isEncrypted,
} from './encryption';
import { randomBytes } from 'crypto';

describe('encryption', () => {
  const originalKey = process.env.ENCRYPTION_KEY;

  beforeAll(() => {
    process.env.ENCRYPTION_KEY = randomBytes(32).toString('base64');
    _resetEncryptionKeyCache();
  });

  afterAll(() => {
    if (originalKey === undefined) delete process.env.ENCRYPTION_KEY;
    else process.env.ENCRYPTION_KEY = originalKey;
    _resetEncryptionKeyCache();
  });

  it('round-trips plaintext through encryptString/decryptString', () => {
    const plain = 'access-sandbox-abc-123';
    const ct = encryptString(plain);
    expect(isEncrypted(ct)).toBe(true);
    expect(ct).not.toContain(plain);
    expect(decryptString(ct)).toBe(plain);
  });

  it('produces a different ciphertext for the same input each time', () => {
    const plain = 'same-input';
    expect(encryptString(plain)).not.toBe(encryptString(plain));
  });

  it('decryptString passes plaintext through unchanged (legacy rows)', () => {
    expect(decryptString('plain-legacy-value')).toBe('plain-legacy-value');
  });

  it('throws on tampered ciphertext', () => {
    const ct = encryptString('hello');
    const parts = ct.split(':');
    parts[4] = Buffer.from('tampered').toString('base64');
    expect(() => decryptString(parts.join(':'))).toThrow();
  });

  describe('encryptedColumn transformer', () => {
    it('encrypts on write and decrypts on read', () => {
      const stored = encryptedColumn.to('secret');
      expect(typeof stored).toBe('string');
      expect(isEncrypted(stored as string)).toBe(true);
      expect(encryptedColumn.from(stored)).toBe('secret');
    });

    it('passes null through', () => {
      expect(encryptedColumn.to(null)).toBeNull();
      expect(encryptedColumn.from(null)).toBeNull();
    });

    it('does not double-encrypt', () => {
      const once = encryptedColumn.to('x') as string;
      const twice = encryptedColumn.to(once);
      expect(twice).toBe(once);
    });

    it('reads legacy plaintext', () => {
      expect(encryptedColumn.from('legacy')).toBe('legacy');
    });
  });
});
