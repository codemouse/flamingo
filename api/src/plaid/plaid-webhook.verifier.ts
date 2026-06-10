import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, createPublicKey, createVerify } from 'crypto';
import { PlaidService } from './plaid.service.js';

interface JwkRsa {
  kty: string;
  alg: string;
  kid: string;
  use?: string;
  crv?: string;
  x?: string;
  y?: string;
  n?: string;
  e?: string;
}

/**
 * Verifies Plaid webhook signatures.
 *
 * Plaid signs each webhook with an ES256 (or ES256K) JWT placed in the
 * `Plaid-Verification` header. The token's body is the SHA-256 hex digest of
 * the raw request body. The public key is fetched from
 * /webhook_verification_key/get and cached briefly.
 *
 * In sandbox / non-prod we accept unsigned webhooks for local testing —
 * production rejects them.
 */
@Injectable()
export class PlaidWebhookVerifier {
  private readonly logger = new Logger(PlaidWebhookVerifier.name);
  private readonly keyCache = new Map<
    string,
    { key: JwkRsa; fetchedAt: number }
  >();
  private readonly KEY_TTL_MS = 24 * 60 * 60 * 1000;

  constructor(
    private readonly plaid: PlaidService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Returns true if the signature is valid. Throws UnauthorizedException
   * in production when the signature is missing/invalid.
   */
  async verify(
    rawBody: Buffer | string,
    signatureHeader: string | undefined,
  ): Promise<boolean> {
    const isProd = this.config.get<string>('NODE_ENV') === 'production';

    if (!signatureHeader) {
      if (isProd)
        throw new UnauthorizedException('Missing Plaid-Verification header');
      this.logger.warn(
        'Plaid webhook received without signature (allowed in non-prod)',
      );
      return false;
    }

    const parts = signatureHeader.split('.');
    if (parts.length !== 3) {
      if (isProd)
        throw new UnauthorizedException('Malformed Plaid-Verification token');
      return false;
    }

    let header: { kid?: string; alg?: string };
    let payload: { request_body_sha256?: string; iat?: number };
    try {
      header = JSON.parse(
        Buffer.from(parts[0], 'base64url').toString('utf8'),
      ) as { kid?: string; alg?: string };
      payload = JSON.parse(
        Buffer.from(parts[1], 'base64url').toString('utf8'),
      ) as { request_body_sha256?: string; iat?: number };
    } catch {
      if (isProd)
        throw new UnauthorizedException('Invalid Plaid-Verification encoding');
      return false;
    }

    if (!header.kid) {
      if (isProd)
        throw new UnauthorizedException(
          'Missing kid in Plaid-Verification header',
        );
      return false;
    }

    // Reject webhooks older than 5 minutes (replay defense).
    const ageMs = Math.abs(Date.now() - (payload.iat ?? 0) * 1000);
    if (ageMs > 5 * 60_000) {
      if (isProd)
        throw new UnauthorizedException('Plaid-Verification token expired');
      return false;
    }

    const computedSha = createHash('sha256').update(rawBody).digest('hex');
    if (payload.request_body_sha256 !== computedSha) {
      if (isProd) throw new UnauthorizedException('Body hash mismatch');
      return false;
    }

    const jwk = await this.getKey(header.kid);
    if (!jwk) {
      if (isProd) throw new UnauthorizedException('Unknown signing key');
      return false;
    }

    const ok = this.verifyJwsSignature(parts, jwk);
    if (!ok && isProd)
      throw new UnauthorizedException('Plaid-Verification signature invalid');
    return ok;
  }

  private async getKey(kid: string): Promise<JwkRsa | null> {
    const cached = this.keyCache.get(kid);
    if (cached && Date.now() - cached.fetchedAt < this.KEY_TTL_MS) {
      return cached.key;
    }
    try {
      const jwk = await this.plaid.getWebhookVerificationKey(kid);
      this.keyCache.set(kid, { key: jwk, fetchedAt: Date.now() });
      return jwk;
    } catch (err) {
      this.logger.error(
        `Failed to fetch webhook verification key kid=${kid}: ${(err as Error).message}`,
      );
      return null;
    }
  }

  private verifyJwsSignature(parts: string[], jwk: JwkRsa): boolean {
    try {
      const signingInput = `${parts[0]}.${parts[1]}`;
      const signature = Buffer.from(parts[2], 'base64url');
      const keyObject = createPublicKey({ key: jwk as never, format: 'jwk' });

      const verifier = createVerify('SHA256');
      verifier.update(signingInput);
      verifier.end();
      return verifier.verify(
        { key: keyObject, dsaEncoding: 'ieee-p1363' },
        signature,
      );
    } catch (err) {
      this.logger.error(`JWS verification error: ${(err as Error).message}`);
      return false;
    }
  }
}
