// middleware/rateLimiter.js
const rateLimit = require('express-rate-limit');

const claimLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: 5, // limit each IP to 5 requests per windowMs
  message: { error: 'Too many requests from this IP, please try again after an hour.' },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { claimLimiter };