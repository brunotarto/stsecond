const Position = require('../models/positionModel');
const Transaction = require('../models/transModel');
const User = require('../models/userModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const {
  getTickerPrice,
  getOptimalMarginRatioAndDirection,
} = require('../utils/stockUtils');
const authController = require('../controllers/authController');

const userMarginRatioOptions = [1000, 500, 100, 50, 20, 5, 1];

exports.createPosition = catchAsync(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const userId = req.user._id;
    let ai = false;
    const { ticker, direction, amount, auto } = req.body;

    let { orderCloseAtDate, orderCloseAtPrice, marginRatio } = req.body;

    // Fetch the user's balance
    const user = await User.findById(userId).session(session);

    // Calculate the stock price and total shares
    const price = await getTickerPrice(ticker);

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    if (amount < 0) {
      return next(new AppError('Invalid amount', 400));
    }

    if (user.balance < amount) {
      return next(new AppError('Insufficient funds', 400));
    }

    if (auto === true) {
      ai = true;
      const {
        optimalMarginRatio,
        optimalDirection,
        optimalFuturePrice,
        optimalFuturePriceDate,
      } = await getOptimalMarginRatioAndDirection(
        ticker,
        userMarginRatioOptions
      );
      direction = optimalDirection;
      orderCloseAtPrice = optimalFuturePrice;
      orderCloseAtDate = optimalFuturePriceDate;
      marginRatio = optimalMarginRatio;
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

    user.balance -= amount;
    await user.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({ message: 'Position initiated', data: { position } });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error); // Pass the error to your error handler
  }
});

exports.closePosition = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const positionId = req.params.id;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const position = await Position.findById(positionId).session(session);
    if (!position) {
      await session.abortTransaction();
      session.endSession();
      return next(new AppError('Position not found', 404));
    }

    if (position.userId.toString() !== userId.toString()) {
      await session.abortTransaction();
      session.endSession();
      return next(
        new AppError('You do not have permission to close this position', 403)
      );
    }

    const price = await getTickerPrice(position.ticker);
    if (!price) {
      await session.abortTransaction();
      session.endSession();
      return next(new AppError('Unable to retrieve stock price.', 400));
    }

    const currentValue = position.totalShares * price;
    let profitOrLoss;

    if (position.direction === 'long') {
      profitOrLoss = currentValue - position.initialCapital - position.loan;
    } else {
      // For short positions
      profitOrLoss =
        position.averageCost * position.totalShares -
        currentValue -
        position.loan;
    }

    // Update position
    position.open = false;
    position.closePrice = currentValue;
    position.closedAt = Date.now();
    await position.save({ session });

    // Update the user's balance
    const user = await User.findById(userId).session(session);
    user.balance += position.initialCapital + profitOrLoss;
    await user.save({ session });

    // Record the transaction
    await Transaction.create({
      userId,
      action: 'sell',
      ticker: position.ticker,
      amountUSD: profitOrLoss + position.initialCapital,
      shares: position.totalShares,
      memo: position._id,
    }).session(session);

    await session.commitTransaction();
    session.endSession();

    res
      .status(200)
      .json({ message: 'Position closed', data: { position, profitOrLoss } });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    return next(new AppError('Error closing position', 500));
  }
});

exports.cronClosePosition = async (positionId) => {
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

    const price = await getTickerPrice(position.ticker);
    if (!price) {
      await session.abortTransaction();
      session.endSession();
      console.error('Unable to retrieve stock price.');
      return null;
    }

    const currentValue = position.totalShares * price;
    let profitOrLoss;

    if (position.direction === 'long') {
      profitOrLoss = currentValue - position.initialCapital - position.loan;
    } else {
      profitOrLoss =
        position.averageCost * position.totalShares -
        currentValue -
        position.loan;
    }

    position.open = false;
    position.closePrice = currentValue;
    position.closedAt = Date.now();
    await position.save({ session });

    const user = await User.findById(position.userId).session(session);
    user.balance += position.initialCapital + profitOrLoss;
    await user.save({ session });

    await Transaction.create({
      userId: position.userId,
      action: 'sell',
      ticker: position.ticker,
      amountUSD: profitOrLoss + position.initialCapital,
      shares: position.totalShares,
      memo: position._id,
    }).session(session);

    await session.commitTransaction();
    session.endSession();

    return position;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Error closing position:', error);
    return null;
  }
};

exports.sendOpenPositions = (io) => {
  console.log('Open Positions WebSocket Established');

  io.on('connection', async (socket) => {
    const token = socket.handshake.query.token;
    const user = await authController.validateWebSocketToken(token);

    if (!user) {
      socket.emit('error', 'Authentication failed.');
      return;
    }

    // If successfully authenticated:
    socket.join(user._id.toString()); // Join a room specific to the user

    const sendUpdates = async () => {
      // Fetch open positions for the authenticated user
      const openPositions = await Position.find({ user: user._id, open: true });

      // Compute profit or loss for each position
      const positionsWithProfitOrLoss = [];
      for (let position of openPositions) {
        const currentPrice = await utils.getPositionPrice(position.ticker);

        const profitOrLoss =
          position.type === 'long'
            ? (currentPrice - position.entryPrice) * position.quantity
            : (position.entryPrice - currentPrice) * position.quantity;

        positionsWithProfitOrLoss.push({
          ...position._doc, // Spread all position properties
          profitOrLoss,
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
