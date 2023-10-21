const mongoose = require('mongoose');
const Transaction = require('../models/transModel');
const User = require('../models/userModel');
const cryptoPriceModel = require('../models/cryptoPriceModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const GatewayHandler = require('../utils/gatewayHandler');

async function getCryptoPrice(symbol) {
  const symbolPrice = await cryptoPriceModel.findOne({ symbol });
  if (!symbolPrice) {
    throw new Error(`No price found for symbol: ${symbol}`);
  }
  return symbolPrice.usdPrice;
}

exports.createWithdrawal = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    let { paymentMethod, token } = req.body;
    const { amountUSD } = req.body;

    paymentMethod = paymentMethod ? paymentMethod.toUpperCase() : undefined;
    token = token ? token.toUpperCase() : undefined;
    if (paymentMethod === token) token = undefined;

    // Fetch user details to check balance and withdrawal address
    const user = await User.findById(userId).session(session);

    if (!user) {
      await session.abortTransaction();
      session.endSession();
      return next(new AppError('User not found', 404));
    }

    if (!['ETH', 'BTC', 'TRX', 'BNB'].includes(paymentMethod)) {
      await session.abortTransaction();
      session.endSession();
      return next(
        new AppError(`Network should be either: ETH, BTC, TRX or BSC`, 400)
      );
    }

    if (!['BUSD', 'USDT', 'USDC'].includes(token) && token) {
      await session.abortTransaction();
      session.endSession();
      return next(
        new AppError(`USD token should be either: USDT, BUSD or USDC`, 400)
      );
    }

    if (token && paymentMethod === 'BTC') {
      await session.abortTransaction();
      session.endSession();
      return next(
        new AppError(`Can not use Bitcoin as network to transfer USD`, 400)
      );
    }

    if (user.accountBalance < amountUSD) {
      await session.abortTransaction();
      session.endSession();
      return next(new AppError('Insufficient balance', 400));
    }

    if (!user.withdrawalAddresses[paymentMethod]) {
      await session.abortTransaction();
      session.endSession();
      return next(new AppError(`${paymentMethod} address is undefined`, 400));
    }
    // Convert USD to desired cryptocurrency
    let cryptoAmount;
    if (token) {
      cryptoAmount = amountUSD;
    } else {
      const priceUSD = await getCryptoPrice(paymentMethod);
      cryptoAmount = amountUSD / priceUSD;
    }

    // Deduct the user's balance by the withdrawal amount
    user.accountBalance -= amountUSD;
    await user.save({ validateBeforeSave: false, session });

    // Record the withdrawal transaction (status could be 'pending' initially)
    const newTransaction = new Transaction({
      userID: userId,
      action: 'withdraw',
      amountUSD,
      cryptoType: paymentMethod,
      cryptoAmount,
      status: 'pending',
    });
    await newTransaction.save({ session });
    const transactionId = newTransaction._id;

    // Send to the gateway
    const params = {
      network: paymentMethod,
      token: token,
      address: user.withdrawalAddresses[paymentMethod],
      statusURL: process.env.IPN_HANDLER,
      label: transactionId,
      amount: cryptoAmount,
    };

    // delete undefined params (token)
    Object.keys(params).forEach((key) => {
      if (params[key] === undefined) {
        delete params[key];
      }
    });

    const gatewayResponse = await GatewayHandler('send', params);

    // We might want to validate the response here
    if (!gatewayResponse || !gatewayResponse.result) {
      throw new Error('Failed to initiate gateway request.');
    }

    // Commit the transaction
    await session.commitTransaction();
    session.endSession();

    res
      .status(201)
      .json({ message: 'Withdrawal initiated', data: { newTransaction } });
  } catch (error) {
    // Rollback the transaction on error
    await session.abortTransaction();
    session.endSession();

    return next(new AppError('Error initiating withdrawal', 400));
  }
});
