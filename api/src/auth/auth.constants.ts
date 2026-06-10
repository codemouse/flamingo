/**
 * Cookie / token configuration constants used across auth + plaid modules.
 */
export const ACCESS_COOKIE = 'flamingo_at';
export const REFRESH_COOKIE = 'flamingo_rt';

export interface CookieDurations {
  accessMs: number;
  refreshMs: number;
}

const UNIT_MS: Record<string, number> = {
  s: 1000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

/** Parses simple JWT-style durations like "15m", "7d", "30s". */
export function parseDuration(input: string, fallbackMs: number): number {
  const match = /^(\d+)([smhd])$/.exec(input.trim());
  if (!match) return fallbackMs;
  return parseInt(match[1], 10) * UNIT_MS[match[2]];
}
