/**
 * Application-layer AES-256-GCM encryption for sensitive columns
 * (Plaid access_token, future PII, etc.).
 *
 * Key sourcing: process.env.ENCRYPTION_KEY must be a 32-byte value,
 * provided as either base64 (preferred, 44 chars) or hex (64 chars).
 *
 * Stored format: `enc:v1:<iv_b64>:<tag_b64>:<ciphertext_b64>`
 * Reads of plaintext (legacy rows) are returned as-is and re-encrypted
 * on the next save.
 */
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  timingSafeEqual,
} from 'crypto';
import type { ValueTransformer } from 'typeorm';

const ALG = 'aes-256-gcm';
const IV_BYTES = 12;
const KEY_BYTES = 32;
const PREFIX = 'enc:v1:';

let cachedKey: Buffer | null = null;

function loadKey(): Buffer {
  if (cachedKey) return cachedKey;
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw || raw.trim().length === 0) {
    throw new Error(
      'ENCRYPTION_KEY is not set. Generate one with: ' +
        "node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\"",
    );
  }
  let buf: Buffer;
  if (/^[A-Fa-f0-9]+$/.test(raw) && raw.length === KEY_BYTES * 2) {
    buf = Buffer.from(raw, 'hex');
  } else {
    buf = Buffer.from(raw, 'base64');
  }
  if (buf.length !== KEY_BYTES) {
    throw new Error(
      `ENCRYPTION_KEY must decode to ${KEY_BYTES} bytes (got ${buf.length}).`,
    );
  }
  cachedKey = buf;
  return buf;
}

/** Reset the cached key (test-only). */
export function _resetEncryptionKeyCache(): void {
  cachedKey = null;
}

export function isEncrypted(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.startsWith(PREFIX);
}

export function encryptString(plaintext: string): string {
  const key = loadKey();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALG, key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString('base64')}:${tag.toString('base64')}:${enc.toString('base64')}`;
}

export function decryptString(value: string): string {
  if (!isEncrypted(value)) return value;
  const [, , ivB64, tagB64, ctB64] = value.split(':');
  if (!ivB64 || !tagB64 || !ctB64) {
    throw new Error('Malformed encrypted value');
  }
  const iv = Buffer.from(ivB64, 'base64');
  const tag = Buffer.from(tagB64, 'base64');
  const ct = Buffer.from(ctB64, 'base64');
  const decipher = createDecipheriv(ALG, loadKey(), iv);
  decipher.setAuthTag(tag);
  const out = Buffer.concat([decipher.update(ct), decipher.final()]);
  return out.toString('utf8');
}

/** Constant-time string comparison helper. */
export function safeEquals(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

/**
 * TypeORM transformer that transparently encrypts/decrypts a string column.
 * Plaintext legacy values pass through on read; the next save re-encrypts.
 */
export const encryptedColumn: ValueTransformer = {
  to(value: string | null | undefined): string | null {
    if (value === null || value === undefined) return null;
    if (isEncrypted(value)) return value;
    return encryptString(value);
  },
  from(value: string | null | undefined): string | null {
    if (value === null || value === undefined) return null;
    return isEncrypted(value) ? decryptString(value) : value;
  },
};
