const crypto = require('crypto');
const depositController = require('./depositController');
const Transaction = require('../models/transModel');
const Proof = require('./../models/proofModel');
const maskEmail = require('../utils/maskEmail');
const User = require('../models/userModel');

async function transactionExists(transactionReference, userId) {
  const existingTransaction = await Transaction.findOne({
    transactionReference,
    userId,
  });
  return !!existingTransaction;
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
    const [userId, planId] = data['label'].split('.');

    // Set paymentMethod to token or currency if token is empty
    let paymentMethod;
    if (
      data['token'] === 'BUSD' ||
      data['token'] === 'USDT' ||
      data['token'] === 'USDC'
    ) {
      paymentMethod = 'USD';
    } else {
      paymentMethod = data['currency'];
    }

    // Set transactionReference to txid
    const transactionReference =
      data['currency'] + ':' + data['txid'] + ':' + data['pos'];

    // If the transaction already exists, send an appropriate response
    const exists = await transactionExists(transactionReference, userId);
    if (exists) {
      return res.status(200).send();
    }

    const user = await User.findById(userId);

    const proofRequest = {
      email: maskEmail(user.email),
      txid: data['txid'],
      network: data['currency'],
      token: data['token'] ? data['token'] : data['currency'],
      type: 'deposit',
      amount: +data['amount'],
    };
    const proof = new Proof(proofRequest);
    // Save proof to the database
    await proof.save();

    // Create a new request object with the required data
    const ipn = true;
    const newReq = {
      body: {
        userId,
        planId,
        amount: +data['amount'],
        paymentMethod,
        transactionReference,
        ipn,
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

    if (transaction) {
      const proofCheck = await Proof.findOne({
        txid: data['txid'],
      });
      if (!proofCheck) {
        const user = await User.findById(transaction.userId);

        const proofRequest = {
          email: maskEmail(user.email),
          txid: data['txid'],
          network: data['currency'],
          token: data['token'] ? data['token'] : data['currency'],
          type: 'withdrawal',
          amount: +data['amount'],
        };
        const proof = new Proof(proofRequest);
        // Save proof to the database
        await proof.save();
      }

      const transactionReference =
        transaction.transactionReference + ':' + data['txid'];

      try {
        //update transaction with completed status and txid in transactionReference (network:token:txid)
        await Transaction.findByIdAndUpdate(transactionId, {
          transactionReference,
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
