// src/middleware/rateLimiter.js

/**
 * True sliding-window rate limiter, keyed by IP, no external deps.
 *
 * Unlike a fixed window (which resets at clock boundaries and can let
 * 2x the limit through right at the edge), this recomputes the count
 * from actual request timestamps every time, so the limit holds over
 * ANY rolling windowMs-length interval.
 */
function slidingWindowRateLimiter({ windowMs = 60_000, maxRequests = 10 } = {}) {
  // ip -> array of request timestamps (ms) within the current window
  const requestLog = new Map();

  // Periodic sweep so the Map doesn't grow unbounded with stale IPs
  const cleanupInterval = setInterval(() => {
    const cutoff = Date.now() - windowMs;
    for (const [ip, timestamps] of requestLog.entries()) {
      const fresh = timestamps.filter((t) => t > cutoff);
      if (fresh.length === 0) requestLog.delete(ip);
      else requestLog.set(ip, fresh);
    }
  }, windowMs);
  cleanupInterval.unref?.();

  return function rateLimiter(req, res, next) {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const windowStart = now - windowMs;

    const timestamps = (requestLog.get(ip) || []).filter((t) => t > windowStart);

    if (timestamps.length >= maxRequests) {
      const oldest = timestamps[0];
      const retryAfterSec = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));

      res.setHeader('Retry-After', String(retryAfterSec));
      return res.status(429).json({
        error: 'Too many requests, please slow down.',
        retryAfter: retryAfterSec,
      });
    }

    timestamps.push(now);
    requestLog.set(ip, timestamps);
    next();
  };
}

module.exports = { slidingWindowRateLimiter };