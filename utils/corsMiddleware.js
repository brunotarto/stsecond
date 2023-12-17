// corsMiddleware.js
const cors = require('cors');

// CORS options for IPN routes
const corsOptionsIpn = {
  origin: function (origin, callback) {
    if (
      !origin ||
      origin === 'http://88.99.198.205' ||
      origin === 'https://88.99.198.205'
    ) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
};

// CORS options for other routes (xomble)
const corsOptionsXomble = {
  origin: function (origin, callback) {
    if (
      ['https://xomble.com', 'https://www.xomble.com'].includes(origin) ||
      process.env.NODE_ENV === 'development'
    ) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
};

exports.xombleCorsMiddleware = cors(corsOptionsXomble);
exports.ipnCorsMiddleware = cors(corsOptionsIpn);
