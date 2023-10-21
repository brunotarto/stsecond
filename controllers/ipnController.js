const crypto = require('crypto');
const Transaction = require('../models/transModel');
const User = require('../models/userModel');
const cryptoPriceModel = require('../models/cryptoPriceModel');

async function transactionExists(txhash, userId) {
  const existingTransaction = await Transaction.findOne({
    txhash,
    userId,
  });
  return !!existingTransaction;
}

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
    const [userId] = data['label'];

    // Set paymentMethod to token or currency if token is empty
    let paymentMethod;
    if (
      data['token'] === 'BUSD' ||
      data['token'] === 'USDT' ||
      data['token'] === 'USDC'
    ) {
      paymentMethod = data['token'];
    } else {
      paymentMethod = data['currency'];
    }

    // Set cryptoType to network
    const cryptoType = data['currency'];

    // Set txHash to txId:position
    const txHash = data['txid'] + ':' + data['pos'];

    // Set memo to paymentMethod (USD | network )
    const memo = paymentMethod;

    // If the transaction already exists, send an appropriate response
    const exists = await transactionExists(txHash, userId);
    if (exists) {
      return res.status(200).send();
    }
    const cryptoUsdPrice = await getCryptoPrice(cryptoType);
    const newReq = {
      body: {
        userId,
        action: 'deposit', // since it's a deposit controller
        cryptoType, // already extracted from IPN
        txHash, // already extracted from IPN
        amountUSD: +data['amount'] * cryptoUsdPrice, // assuming the IPN provides the amount in USD
        cryptoAmount: +data['amount'], // assuming the IPN provides the amount in the cryptocurrency
        status: 'completed', // start as completed
        memo, // already extracted from IPN
      },
    };

    // Call the createDeposit method with the new request object
    await depositController.createDeposit(newReq, res);
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
