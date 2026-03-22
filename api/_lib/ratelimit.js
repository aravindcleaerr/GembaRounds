// Simple rate limiter for serverless (per IP, per minute)
const requests = {};

function rateLimit(limit = 60, windowMs = 60000) {
  return (req, res, next) => {
    const ip = req.headers['x-forwarded-for'] || req.ip || 'unknown';
    const now = Date.now();
    if (!requests[ip]) requests[ip] = [];
    requests[ip] = requests[ip].filter(t => now - t < windowMs);
    if (requests[ip].length >= limit) {
      return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }
    requests[ip].push(now);
    next();
  };
}

module.exports = rateLimit;
