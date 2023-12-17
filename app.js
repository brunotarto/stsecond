const express = require('express');
const morgan = require('morgan');
const cors = require('cors');

const userRouter = require('./routes/userRoutes');
const ipnRouter = require('./routes/ipnRoutes');
const marketRouter = require('./routes/marketRoutes');
const positionRouter = require('./routes/positionRoutes');
const orderRouter = require('./routes/orderRoutes');
const adminRouter = require('./routes/adminRoutes');

const limiter = require('./utils/limiter');
const cookieParser = require('cookie-parser');
const updatesAndIntervals = require('./utils/updatesAndIntervals');
const { initializeCronJobs } = require('./utils/cronJob');

const globalErrorHandler = require('./controllers/errorController');
const authController = require('./controllers/authController');
const AppError = require('./utils/appError');

const app = express();

// 1) Middleware
// Use morgan for logging in development mode
if (process.env.NODE_ENV === 'development') app.use(morgan('dev'));

// Parse incoming JSON data
app.use(express.json());

let allowedOrigins = [
  'https://xomble.com',
  'https://www.xomble.com',
  'https://88.99.198.205',
  'http://88.99.198.205',
];
if (process.env.NODE_ENV === 'development')
  allowedOrigins.push('http://127.0.0.1:4200');

const corsOptions = {
  origin: function (origin, callback) {
    if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // to allow cookies and headers to be sent along with the request
};

app.use(cors(corsOptions));
// Serve static files from the public folder
app.use(express.static(`${__dirname}/public`));

// Add request time to the request object
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  next();
});

app.use(cookieParser());

// 2) Routes
// Mount plan and user routers
app.use('/api/v1/users', limiter.general, userRouter);
app.use('/api/v1/ipn', limiter.ipn, ipnRouter);
app.use('/api/v1/market', limiter.general, marketRouter);
app.use(
  '/api/v1/positions',
  limiter.general,
  authController.protect,
  positionRouter
);
app.use('/api/v1/orders', limiter.general, authController.protect, orderRouter);
app.use(
  '/api/v1/admin',
  limiter.general,
  authController.protect,
  authController.restrictTo('Admin'),
  adminRouter
);

updatesAndIntervals();
// Update and Intervals
if (process.env.LOCALLY !== 'locally') {
  initializeCronJobs();
}

// Catch unhandled routes
app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Use the global error handler
app.use(globalErrorHandler);

// 3) Export the app module
module.exports = app;
