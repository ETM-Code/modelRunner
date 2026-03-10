export class RateLimitError extends Error {
  retryAfterMs: number;

  constructor(message: string, retryAfterMs: number = 60_000) {
    super(message);
    this.name = "RateLimitError";
    this.retryAfterMs = retryAfterMs;
  }
}

// Patterns that indicate rate limiting from various backends
const RATE_LIMIT_PATTERNS = [
  /rate.?limit/i,
  /too many requests/i,
  /429/,
  /quota.?exceeded/i,
  /throttl/i,
  /capacity/i,
  /overloaded/i,
  /retry.?after/i,
  /request limit/i,
];

/**
 * Check if an error message indicates a rate limit.
 * Returns the retry delay in ms, or null if not a rate limit error.
 */
export function detectRateLimit(stderr: string): number | null {
  const isRateLimit = RATE_LIMIT_PATTERNS.some((p) => p.test(stderr));
  if (!isRateLimit) return null;

  // Try to extract retry-after seconds from the error message
  // Common patterns: "retry after 30s", "Retry-After: 60", "try again in 45 seconds"
  const retryMatch = stderr.match(
    /retry.?after[:\s]*(\d+)\s*s/i
  ) ?? stderr.match(
    /try again in (\d+)\s*s/i
  ) ?? stderr.match(
    /wait (\d+)\s*s/i
  ) ?? stderr.match(
    /(\d+)\s*second/i
  );

  if (retryMatch) {
    const seconds = parseInt(retryMatch[1], 10);
    // Sanity check: cap at 10 minutes, floor at 10 seconds
    return Math.min(Math.max(seconds * 1000, 10_000), 600_000);
  }

  // Default: wait 60 seconds
  return 60_000;
}
