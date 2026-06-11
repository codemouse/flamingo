import { Injectable, Logger } from '@nestjs/common';
import * as argon2 from 'argon2';
import * as bcrypt from 'bcrypt';

/**
 * Password hashing & verification with built-in legacy migration.
 *
 * - New passwords are always hashed with argon2id (OWASP-recommended).
 * - `verify()` accepts both argon2 (`$argon2id$…`) and legacy bcrypt
 *   (`$2a$…`, `$2b$…`, `$2y$…`) hashes, returning a flag that tells callers
 *   to opportunistically re-hash on the next successful login.
 *
 * Argon2id parameters follow the OWASP 2024 cheatsheet (memoryCost: 19MiB,
 * timeCost: 2, parallelism: 1) — strong but cheap enough for ~50ms verify
 * times on commodity hardware.
 */
@Injectable()
export class PasswordService {
  private readonly logger = new Logger(PasswordService.name);

  // OWASP-recommended argon2id baseline.
  private readonly options: argon2.Options = {
    type: argon2.argon2id,
    memoryCost: 19 * 1024,
    timeCost: 2,
    parallelism: 1,
  };

  async hash(password: string): Promise<string> {
    return argon2.hash(password, this.options);
  }

  /**
   * Verify a password against a stored hash.
   * @returns `{ valid, needsRehash }` — `needsRehash` is true when verify
   *          succeeded but the stored hash is bcrypt (legacy) or uses
   *          weaker argon2 parameters than the current baseline.
   */
  async verify(
    password: string,
    storedHash: string,
  ): Promise<{ valid: boolean; needsRehash: boolean }> {
    if (!storedHash) return { valid: false, needsRehash: false };

    if (this.isBcrypt(storedHash)) {
      const valid = await bcrypt.compare(password, storedHash);
      return { valid, needsRehash: valid };
    }

    if (this.isArgon2(storedHash)) {
      try {
        const valid = await argon2.verify(storedHash, password);
        return {
          valid,
          needsRehash: valid && argon2.needsRehash(storedHash, this.options),
        };
      } catch (err) {
        this.logger.warn(`argon2 verify failed: ${(err as Error).message}`);
        return { valid: false, needsRehash: false };
      }
    }

    this.logger.warn('verify() called with unrecognised hash format');
    return { valid: false, needsRehash: false };
  }

  private isBcrypt(hash: string): boolean {
    return /^\$2[aby]\$/.test(hash);
  }

  private isArgon2(hash: string): boolean {
    return hash.startsWith('$argon2');
  }
}
