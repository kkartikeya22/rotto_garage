// src/middleware/rateLimiter.js

/**
 * sliding-window rate limiter, keyed by IP.
 */
function slidingWindowRateLimiter({
  windowMs = 60_000,
  maxRequests = 10,
} = {}) {
  const requestLog = new Map();

  console.log(
    `[RATE LIMITER INIT] windowMs=${windowMs} maxRequests=${maxRequests}`
  );

  const cleanupInterval = setInterval(() => {
    const cutoff = Date.now() - windowMs;

    for (const [ip, timestamps] of requestLog.entries()) {
      const fresh = timestamps.filter((t) => t > cutoff);

      if (fresh.length === 0) {
        requestLog.delete(ip);
      } else {
        requestLog.set(ip, fresh);
      }
    }
  }, windowMs);

  cleanupInterval.unref?.();

  return function rateLimiter(req, res, next) {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const windowStart = now - windowMs;

    const timestamps = (requestLog.get(ip) || []).filter(
      (t) => t > windowStart
    );

    console.log('---------------------------');
    console.log('[RATE LIMIT]');
    console.log('IP:', ip);
    console.log('Stored Requests:', timestamps.length);
    console.log('Max Requests:', maxRequests);
    console.log(
      'Timestamps:',
      timestamps.map((t) => new Date(t).toISOString())
    );

    if (timestamps.length >= maxRequests) {
      const oldest = timestamps[0];

      const retryAfterSec = Math.max(
        1,
        Math.ceil((oldest + windowMs - now) / 1000)
      );

      console.log('🚫 BLOCKED');
      console.log('Retry After:', retryAfterSec, 'seconds');

      res.setHeader('Retry-After', String(retryAfterSec));

      return res.status(429).json({
        error: 'Too many requests, please slow down.',
        retryAfter: retryAfterSec,
      });
    }

    timestamps.push(now);
    requestLog.set(ip, timestamps);

    console.log('✅ ALLOWED');
    console.log('New Count:', timestamps.length);

    next();
  };
}

module.exports = { slidingWindowRateLimiter };