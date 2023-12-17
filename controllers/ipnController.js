const crypto = require('crypto');
const Transaction = require('../models/transModel');
const User = require('../models/userModel');
const cryptoPriceModel = require('../models/cryptoPriceModel');
const depositController = require('./depositController');

async function getCryptoPrice(symbol) {
  const symbolPrice = await cryptoPriceModel.findOne({
    symbol,
  });
  if (!symbolPrice) {
    throw new Error(`No price found for symbol: ${symbol}`);
  }
  return symbolPrice.usdPrice;
}

async function getTransaction(_id) {
  const transaction = await Transaction.findOne({
    _id,
  });
  return transaction;
}

exports.receive = async (req, res) => {
  const data = req.body;
  if (+data['cryptocurrencyapi.net'] < 3) {
    return res.status(200).send();
  }

  const sign0 = data['sign'];
  delete data['sign'];

  const sortedKeys = Object.keys(data).sort();
  const sortedData = sortedKeys.map((key) => data[key]);

  const stringToHash =
    sortedData.join(':') +
    ':' +
    crypto.createHash('md5').update(process.env.API_KEY).digest('hex');
  const sign = crypto.createHash('sha1').update(stringToHash).digest('hex');

  if (sign !== sign0) {
    return res.status(200).send();
  }

  //Deposit logic
  if (data['type'] === 'in' && +data['confirmation'] > 0) {
    // Extract userId and planId from the label

    const userId = data['label'];
    const cryptoType = data['currency'].toUpperCase();
    const txHash = data['txid'];

    const user = await User.findById(userId);

    if (!user) {
      return res.status(200).send();
    }

    let amountUSD;
    let cryptoAmount;
    let paymentMethod;
    if (
      data['token'] === 'BUSD' ||
      data['token'] === 'USDT' ||
      data['token'] === 'USDC'
    ) {
      paymentMethod = data['token'];
      amountUSD = +data['amount'];
      cryptoAmount = 0;
    } else {
      if (data['token']) {
        return res.status(200).send();
      }
      const cryptoUsdPrice = await getCryptoPrice(cryptoType);
      paymentMethod = cryptoType;
      amountUSD = +data['amount'] * cryptoUsdPrice;
      cryptoAmount = +data['amount'];
    }
    const memo = paymentMethod;

    const existingTransaction = await Transaction.findOne({
      txHash,
      userId,
    });

    if (existingTransaction) {
      return res.status(200).send();
    }

    const newReq = {
      body: {
        userId,
        action: 'deposit',
        cryptoType,
        amountUSD,
        cryptoAmount,
        txHash,
        status: 'completed',
        memo,
      },
    };

    // Call the createDeposit method with the new request object
    depositController.createDeposit(newReq, res);
  } else if (data['type'] === 'out' && data['txid']) {
    // withdraw logic
    // get transaction Id
    const transactionId = data['label'];

    // If the transaction already exists, send an appropriate response
    const transaction = await getTransaction(transactionId);

    if (transaction && !transaction.txHash) {
      try {
        //update transaction with completed status and txHash
        await Transaction.findByIdAndUpdate(transactionId, {
          txHash: data['txid'],
          status: 'completed',
        });

        return res.status(200).send();
      } catch (error) {
        console.error('Error updating transaction:', error);
        return res.status(500).send();
      }
    } else {
      return res.status(200).send();
    }
  } else {
    return res.status(200).send();
  }
};
