const express = require('express');
const morgan = require('morgan');

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
const {
  xombleCorsMiddleware,
  ipnCorsMiddleware,
  xombleAndUndefinedCorsMiddleware,
} = require('./utils/corsMiddleware');

const globalErrorHandler = require('./controllers/errorController');
const authController = require('./controllers/authController');
const AppError = require('./utils/appError');

const app = express();

// 1) Middleware
// Use morgan for logging in development mode
if (process.env.NODE_ENV === 'development') app.use(morgan('dev'));

// Parse incoming JSON data
app.use(express.json());

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
app.use('/api/v1/users', xombleCorsMiddleware, limiter.general, userRouter);
app.use('/api/v1/ipn', ipnCorsMiddleware, limiter.ipn, ipnRouter);
app.use(
  '/api/v1/market',
  xombleAndUndefinedCorsMiddleware,
  limiter.general,
  marketRouter
);
app.use(
  '/api/v1/positions',
  xombleCorsMiddleware,
  limiter.general,
  authController.protect,
  positionRouter
);
app.use(
  '/api/v1/orders',
  xombleCorsMiddleware,
  limiter.general,
  authController.protect,
  orderRouter
);
app.use(
  '/api/v1/admin',
  xombleCorsMiddleware,
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
