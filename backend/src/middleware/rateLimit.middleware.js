// Tiny in-memory rate limiter (no external dependency).
// Good for a single instance; for multi-instance production, back it with Redis.
const buckets = new Map(); // key -> { count, resetAt }

function rateLimit({ windowMs = 15 * 60 * 1000, max = 10, keyFn } = {}) {
  return (req, res, next) => {
    const key = (keyFn ? keyFn(req) : req.ip) || 'anon';
    const now = Date.now();
    let rec = buckets.get(key);
    if (!rec || now > rec.resetAt) { rec = { count: 0, resetAt: now + windowMs }; buckets.set(key, rec); }
    rec.count += 1;
    if (rec.count > max) {
      const retry = Math.ceil((rec.resetAt - now) / 1000);
      res.set('Retry-After', String(retry));
      const err = new Error('Too many attempts. Please wait a few minutes and try again.');
      err.status = 429;
      return next(err);
    }
    return next();
  };
}

// Occasionally sweep expired buckets so the map doesn't grow unbounded.
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of buckets) if (now > v.resetAt) buckets.delete(k);
}, 10 * 60 * 1000).unref?.();

module.exports = { rateLimit };
