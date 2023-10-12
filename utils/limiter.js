const rateLimit = require('express-rate-limit');

const keyGeneratorFunction = (req) => {
  let ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  if (!ip) {
    ip = req.socket.remoteAddress;
  }
  return ip;
};

exports.signup = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: 'Too many sign-up requests from this IP. Please try again later.',
  keyGenerator: keyGeneratorFunction,
});

exports.login = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minutes
  max: 15, // limit each IP to 5 requests per windowMs
  message: 'Too many login requests from this IP. Please try again later.',
  keyGenerator: keyGeneratorFunction,
});

exports.general = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minutes
  max: 120, // limit each IP to 5 requests per windowMs
  message: 'Too many requests from this IP. Please try again later.',
  keyGenerator: keyGeneratorFunction,
});

exports.ipn = rateLimit({
  windowMs: 1 * 1000, // 1 second
  max: 5, // limit each IP to 2 requests per windowMs
  message: 'Too many requests from this IP. Please try again later.',
  keyGenerator: keyGeneratorFunction,
});
