const express = require('express');
const morgan = require('morgan');
const cors = require('cors');

const planRouter = require('./routes/planRoutes');
const userRouter = require('./routes/userRoutes');
const proofRouter = require('./routes/proofRoutes');
const feeRouter = require('./routes/feeRoutes');
const ipnRouter = require('./routes/ipnRoutes');
const limiter = require('./utils/limiter');
const cookieParser = require('cookie-parser');

const globalErrorHandler = require('./controllers/errorController');
const AppError = require('./utils/appError');
// const findNegativeBalances = require('./correctBalance');

const app = express();

// 1) Middleware
// Use morgan for logging in development mode
if (process.env.NODE_ENV === 'development') app.use(morgan('dev'));

// Parse incoming JSON data
app.use(express.json());

app.use(cors());

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
app.use('/api/v1/plans', limiter.general, planRouter);
app.use('/api/v1/users', limiter.general, userRouter);
app.use('/api/v1/fees', limiter.general, feeRouter);

app.use('/api/v1/proofs', limiter.general, proofRouter);
app.use('/api/v1/ipn', limiter.ipn, ipnRouter);

// Call the function to correct balances
// findNegativeBalances().catch((err) => {
//   console.error('Error correcting balances: ', err);
// });

// Catch unhandled routes
app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Use the global error handler
app.use(globalErrorHandler);

// 3) Export the app module
module.exports = app;
