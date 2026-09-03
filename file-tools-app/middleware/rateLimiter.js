const windows = new Map();

function rateLimit({ windowMs, max, message = 'Too many requests. Please try again later.' }) {
  return (req, res, next) => {
    const key = `${req.ip || req.connection.remoteAddress || 'unknown'}:${req.baseUrl}`;
    const now = Date.now();
    const current = windows.get(key);
    const record = current && now - current.startedAt < windowMs
      ? current
      : { startedAt: now, count: 0 };

    record.count += 1;
    windows.set(key, record);
    if (record.count > max) {
      return res.status(429).json({ success: false, message });
    }
    return next();
  };
}

setInterval(() => {
  const cutoff = Date.now() - 60 * 60 * 1000;
  for (const [key, record] of windows) {
    if (record.startedAt < cutoff) windows.delete(key);
  }
}, 10 * 60 * 1000).unref();

module.exports = { rateLimit };
