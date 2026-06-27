type RateLimiterOptions = {
  maxRequests: number;
  windowMs: number;
};

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

export type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
};

export function createFixedWindowRateLimiter({
  maxRequests,
  windowMs,
}: RateLimiterOptions) {
  const entries = new Map<string, RateLimitEntry>();

  return {
    consume(key: string, now = Date.now()): RateLimitResult {
      const current = entries.get(key);

      if (!current || current.resetAt <= now) {
        entries.set(key, {
          count: 1,
          resetAt: now + windowMs,
        });

        return { allowed: true, retryAfterSeconds: 0 };
      }

      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((current.resetAt - now) / 1000),
      );

      if (current.count >= maxRequests) {
        return { allowed: false, retryAfterSeconds };
      }

      current.count += 1;
      return { allowed: true, retryAfterSeconds: 0 };
    },
  };
}

export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  const forwardedIp = forwardedFor?.split(',')[0]?.trim();

  return (
    forwardedIp || request.headers.get('x-real-ip')?.trim() || 'unknown-client'
  );
}
