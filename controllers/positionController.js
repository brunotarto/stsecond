const mongoose = require('mongoose');
const Position = require('../models/positionModel');
const Transaction = require('../models/transModel');
const Order = require('../models/orderModel');
const User = require('../models/userModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const {
  getTickerPrice,
  getMarginRatioAndDirection,
  getMarketStatus,
} = require('../utils/stockUtils');
const authController = require('../controllers/authController');
const { createOrder } = require('../controllers/orderController');

const aiPositionsCount = async (userId) => {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setHours(23, 59, 59, 999);
  const result = await Position.countDocuments({
    userId,
    ai: true,
    openedAt: {
      $gte: todayStart,
      $lte: todayEnd,
    },
  });
  return result;
};

const fetchUserSubscriptionStatus = async (userId) => {
  try {
    // Find the latest 'purchase' transaction for the user
    const latestPurchase = await Transaction.findOne({
      userId: userId,
      action: 'purchase',
    }).sort({ createdAt: -1 }); // Sort by createdAt in descending order to get the latest

    if (!latestPurchase) {
      return { isSubscribed: false, plan: null, expirationDate: null };
    }

    // Assuming the subscription is for 1 year or 1 month from the time of purchase
    const oneYearFromPurchase = new Date(latestPurchase.createdAt);
    oneYearFromPurchase.setFullYear(oneYearFromPurchase.getFullYear() + 1);

    const oneMonthFromPurchase = new Date(latestPurchase.createdAt);
    oneMonthFromPurchase.setMonth(oneMonthFromPurchase.getMonth() + 1);

    // Check the amount and createdAt to determine the subscription status and plan
    let isSubscribed = false;
    let plan = null;
    let expirationDate = null;
    const currentDate = new Date(); // Current date to compare with

    if (
      latestPurchase.amountUSD === +process.env.ANNUALLY_SUBSCRIPTION_FEE &&
      currentDate < oneYearFromPurchase
    ) {
      isSubscribed = true;
      plan = 'annually';
      expirationDate = oneYearFromPurchase;
    } else if (
      latestPurchase.amountUSD === +process.env.MONTHLY_SUBSCRIPTION_FEE &&
      currentDate < oneMonthFromPurchase
    ) {
      isSubscribed = true;
      plan = 'monthly';
      expirationDate = oneMonthFromPurchase;
    }

    // Return the subscription status, plan, and expirationDate
    return { isSubscribed, plan, expirationDate };
  } catch (error) {
    console.error('Error fetching user subscription status:', error);
    throw error;
  }
};

exports.fetchUserSubscriptionStatus = fetchUserSubscriptionStatus;

const returnRemainingAiPositions = async (userId) => {
  try {
    const user = await User.findById(userId);
    let initialCount = user.isVerified ? 2 : 1;
    const { isSubscribed } = await fetchUserSubscriptionStatus(userId);

    initialCount = isSubscribed ? initialCount + 3 : initialCount;
    // Counting AI positions that the user has opened today
    const todayAiPositionsCount = await aiPositionsCount(userId);
    const remainingAiPositions = initialCount - todayAiPositionsCount;
    return remainingAiPositions;
  } catch (error) {
    console.error('Error returnRemainingAiPositions:', error);
    throw error;
  }
};

exports.getAiPositionLimit = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const user = await User.findById(userId);

  if (!user) {
    return next(new AppError('User not found', 404));
  }
  let initialCount = user.isVerified ? 2 : 1;

  const { isSubscribed } = await fetchUserSubscriptionStatus(userId);

  initialCount = isSubscribed ? initialCount + 3 : initialCount;
  // Counting AI positions that the user has opened today
  const todayAiPositionsCount = await aiPositionsCount(userId);

  // Calculating remaining AI position limit for the day
  const remainingAiPositions = initialCount - todayAiPositionsCount;
  const remainingTime = getRemainingTimeUntilReset();
  res.status(200).json({
    status: 'success',
    data: {
      dailyLimit: initialCount,
      used: todayAiPositionsCount,
      remaining: remainingAiPositions,
      remainingTime,
    },
  });
});

const getRemainingTimeUntilReset = () => {
  // Current date and time
  const now = new Date();

  // Next reset time (midnight of the next day)
  const nextReset = new Date(now);
  nextReset.setDate(now.getDate() + 1);
  nextReset.setHours(0, 0, 0, 0); // set time to midnight

  // Calculate the difference in milliseconds
  const timeDifference = nextReset - now;

  // Convert time difference into hours, minutes, and seconds
  const hours = Math.floor(timeDifference / (1000 * 60 * 60));
  const minutes = Math.floor((timeDifference % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((timeDifference % (1000 * 60)) / 1000);

  // Format the time values as 2-digit strings
  const formattedHours = hours.toString().padStart(2, '0');
  const formattedMinutes = minutes.toString().padStart(2, '0');
  const formattedSeconds = seconds.toString().padStart(2, '0');

  // Return the formatted time
  return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
};

exports.sendOpenPositions = (io) => {
  console.log('Open Positions WebSocket Established');

  io.on('connection', async (socket) => {
    const token = socket.handshake.query.token;
    const accountType = socket.handshake.query.accountType; // Extract accountType from handshake query

    const user = await authController.validateWebSocketToken(
      token,
      accountType
    );

    if (!user) {
      socket.emit('error', 'Authentication failed.');
      return;
    }

    // If successfully authenticated:
    socket.join(user._id.toString()); // Join a room specific to the user

    const sendUpdates = async () => {
      // Fetch open positions for the authenticated user
      const openPositions = await Position.find({
        userId: user._id,
        open: true,
      });

      // Compute profit or loss for each position
      const positionsWithProfitOrLoss = [];
      for (let position of openPositions) {
        const currentPrice = await getTickerPrice(position.ticker);

        const profitOrLoss =
          position.direction === 'long'
            ? (currentPrice - position.averageCost) * position.totalShares
            : (position.averageCost - currentPrice) * position.totalShares;
        positionsWithProfitOrLoss.push({
          ...position._doc, // Spread all position properties
          profitOrLoss,
          currentPrice,
        });
      }

      // Emitting the data to the specific user's room only
      io.to(user._id.toString()).emit(
        'openPositionUpdate',
        positionsWithProfitOrLoss
      );

      let intervalTimer = positionsWithProfitOrLoss.length ? 1000 : 1000 * 10;

      // Start a new interval
      setTimeout(sendUpdates, intervalTimer);
    };

    // Kick off the first update
    sendUpdates();
  });
};

exports.createPosition = catchAsync(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const userId = req.user._id;
    let ai = false;
    const { ticker, amount, auto } = req.body;

    let { direction, orderCloseAtDate, orderCloseAtPrice, marginRatio } =
      req.body;

    // Fetch the user's balance
    let user = await User.findById(userId).session(session);
    await user.applyDefaultValues();
    // Calculate the stock price and total shares
    let price = await getTickerPrice(ticker, direction);

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    if (!user.marginRatios.includes(marginRatio)) {
      return next(new AppError('Invalid margin ratio', 400));
    }

    if (!amount || amount < 10) {
      return next(
        new AppError('Invalid amount, amount should be more than 10 USD', 400)
      );
    }

    if (user.accountBalance < amount) {
      return next(new AppError('Insufficient funds', 400));
    }
    const marketStatus = await getMarketStatus();

    if (!marketStatus) {
      if (auto === true) {
        return next(
          new AppError(
            'You can not open AI position while market is closed',
            400
          )
        );
      }
      const orderDetails = {
        userId,
        ticker,
        direction,
        marginRatio,
        initialCapital: amount,
        orderCloseAtPrice,
      };

      const newOrder = await createOrder(orderDetails, session);
      await session.commitTransaction();
      session.endSession();
      return res
        .status(201)
        .json({ message: 'Order initiated', data: { newOrder } });
    }
    if (auto === true) {
      const remainingAiPositions = await returnRemainingAiPositions(userId);
      if (remainingAiPositions === 0) {
        return next(
          new AppError('You can not open AI position, 0 Stamina', 400)
        );
      }
      ai = true;

      const optimal = await getMarginRatioAndDirection(
        ticker,
        user.marginRatios,
        user.profitPercentage
      );

      direction = optimal.direction;
      orderCloseAtPrice = optimal.optimalFuturePrice;
      marginRatio = optimal.optimalMarginRatio;

      price = await getTickerPrice(ticker);

      const originalDate = new Date(optimal.optimalFuturePriceDate);
      const updatedTimestamp =
        originalDate.getTime() + process.env.DELAY_TIME * 60 * 1000;
      orderCloseAtDate = new Date(updatedTimestamp);
    }

    if (
      orderCloseAtPrice &&
      direction === 'long' &&
      orderCloseAtPrice < price
    ) {
      return next(
        new AppError(
          'orderCloseAtPrice can not be less than current price for long positions',
          400
        )
      );
    }
    if (
      orderCloseAtPrice &&
      direction === 'short' &&
      orderCloseAtPrice > price
    ) {
      return next(
        new AppError(
          'orderCloseAtPrice can not be greater than current price for short positions',
          400
        )
      );
    }
    // Calculate effective amount with margin
    const effectiveAmount = amount * marginRatio;

    if (!price) {
      return next(new AppError('Unable to retrieve stock price.', 400));
    }
    const totalShares = effectiveAmount / price;

    const position = await Position.create(
      [
        {
          userId,
          ticker,
          direction,
          marginRatio,
          totalShares,
          initialCapital: amount,
          loan: effectiveAmount - amount,
          averageCost: price,
          ai,
          orderCloseAtDate,
          orderCloseAtPrice,
        },
      ],
      { session }
    );

    await Transaction.create(
      [
        {
          userId,
          action: 'buy',
          ticker,
          amountUSD: amount,
          shares: totalShares,
          memo: position[0]._id,
        },
      ],
      { session }
    );

    user = await User.findByIdAndUpdate(
      userId,
      { $inc: { [`accountBalance`]: -amount } },
      { validateBeforeSave: false, new: true, session }
    );

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({ message: 'Position initiated', data: { position } });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error); // Pass the error to your error handler
  }
});

exports.cronCreatePosition = async (orderDetails) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      _id,
      userId,
      ticker,
      direction,
      marginRatio,
      initialCapital,
      orderCloseAtPrice,
    } = orderDetails;

    // Calculate the stock price and total shares
    const price = await getTickerPrice(ticker, direction);

    if (!price) {
      throw new Error('Unable to retrieve stock price.');
    }

    // Calculate effective amount with margin
    const effectiveAmount = initialCapital * marginRatio;
    const totalShares = effectiveAmount / price;

    const position = await Position.create(
      [
        {
          userId,
          ticker,
          direction,
          marginRatio,
          totalShares,
          initialCapital,
          loan: effectiveAmount - initialCapital,
          averageCost: price,
          orderCloseAtPrice,
        },
      ],
      { session }
    );

    await Transaction.create(
      [
        {
          userId,
          action: 'buy',
          ticker,
          amountUSD: initialCapital,
          shares: totalShares,
          memo: position._id,
        },
      ],
      { session }
    );

    await Order.findByIdAndUpdate(
      { _id },
      { orderStatus: 'filled' },
      {
        session,
      }
    );

    await session.commitTransaction();
    session.endSession();
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error(`Error creating position for order:` + error);
  }
};

const cronClosePosition = async (positionId) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const position = await Position.findById(positionId).session(session);
    if (!position) {
      await session.abortTransaction();
      session.endSession();
      console.error(`Position with ID ${positionId} not found.`);
      return null;
    }

    if (!position.open) {
      await session.abortTransaction();
      session.endSession();
      console.error(`Position has been closed already`);
      return null;
    }

    const price = await getTickerPrice(position.ticker);
    if (!price) {
      await session.abortTransaction();
      session.endSession();
      console.error('Unable to retrieve stock price.');
      throw new Error('Unable to retrieve stock price.');
    }

    let profitOrLoss;

    profitOrLoss =
      position.direction === 'long'
        ? (price - position.averageCost) * position.totalShares
        : (position.averageCost - price) * position.totalShares;

    position.open = false;
    position.profitOrLoss = profitOrLoss;
    position.closePrice = price;
    position.closedAt = Date.now();
    await position.save({ session });
    // Update the user's balance

    await User.findByIdAndUpdate(
      position.userId,
      {
        $inc: { [`accountBalance`]: +(position.initialCapital + profitOrLoss) },
      },
      { validateBeforeSave: false, new: true, session }
    );

    // Record the transaction
    const newTransaction = await Transaction({
      userId: position.userId,
      action: 'sell',
      ticker: position.ticker,
      amountUSD: profitOrLoss + position.initialCapital,
      shares: position.totalShares,
      memo: position._id,
    });
    await newTransaction.save({ session });
    await session.commitTransaction();
    session.endSession();

    return position;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Error closing position:', error);
    throw new Error('Error closing position');
  }
};
exports.cronClosePosition = cronClosePosition;

exports.closePosition = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const positionId = req.params.id;
  const marketStatus = await getMarketStatus();

  try {
    if (!marketStatus) {
      const position = await Position.findOneAndUpdate(
        { _id: positionId, userId, open: true },
        { orderCloseAtDate: new Date() }
      );
      if (!position) {
        return next(new AppError('Open position not found', 404));
      }
      return res.status(200).json({
        message: 'Order of closing the position has been initiated',
        data: { position },
      });
    }

    const position = await Position.findOne({
      _id: positionId,
      userId,
      open: true,
    });
    if (!position) {
      return next(new AppError('Open position not found', 404));
    }

    const closedPosition = await cronClosePosition(positionId);

    res
      .status(200)
      .json({ message: 'Position closed', data: { closedPosition } });
  } catch (error) {
    return next(new AppError('Error closing position', 500));
  }
});

exports.getPosition = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const _id = req.params.id;
  const position =
    req.user.role === 'Admin'
      ? await Position.findOne({ _id })
      : await Position.findOne({ _id, userId });

  res.status(200).json({
    status: 'success',
    data: position,
  });
});
exports.getAllPositions = catchAsync(async (req, res, next) => {
  const userId = req.user._id;

  const positions =
    req.user.role === 'Admin'
      ? await Position.find({})
      : await Position.find({ userId });

  res.status(200).json({
    status: 'success',
    results: positions.length,
    data: { positions },
  });
});

exports.sumProfitOrLoss = catchAsync(async (req, res, next) => {
  const userId = req.user._id;

  const result = await Position.aggregate([
    { $match: { userId: userId } },
    { $group: { _id: null, totalProfitOrLoss: { $sum: '$profitOrLoss' } } },
  ]);
  const total = result[0] ? result[0].totalProfitOrLoss : 0;

  res.status(200).json({
    status: 'success',
    data: { totalProfitOrLoss: total },
  });
});

exports.sumOpenEquity = catchAsync(async (req, res, next) => {
  const userId = req.user._id;

  // Fetch all open positions for the user
  const openPositions = await Position.find({ userId: userId, open: true });

  let totalEquity = 0;

  for (const position of openPositions) {
    const currentPrice = await getTickerPrice(position.ticker);

    if (position.direction === 'long') {
      // For long positions: Equity = (current ticker price * total shares) - loan
      totalEquity += currentPrice * position.totalShares - position.loan;
    } else {
      // For short positions: Equity = (short sell price * total shares) + (short sell price - current ticker price) * total shares - loan
      totalEquity +=
        position.averageCost * position.totalShares +
        (position.averageCost - currentPrice) * position.totalShares -
        position.loan;
    }
  }

  res.status(200).json({
    status: 'success',
    data: { totalOpenEquity: totalEquity },
  });
});