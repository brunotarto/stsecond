const Deposit = require('./../models/depositModel');
const Transaction = require('./../models/transModel');
const User = require('../models/userModel');

const MILLISECONDS = {
  minutely: 60 * 1000,
  hourly: 60 * 60 * 1000,
  daily: 24 * 60 * 60 * 1000,
  weekly: 7 * 24 * 60 * 60 * 1000,
  monthly: 30 * 24 * 60 * 60 * 1000,
};

const calculateProfits = async (userID = null) => {
  console.log('Cron started ✅✅✅');
  try {
    const query = { status: 'active' };

    if (userID) {
      query.userId = userID;
    }

    const deposits = await Deposit.find(query).populate('userId planId');

    const operations = deposits.map(async (deposit) => {
      try {
        const { planId: plan } = deposit;
        let user = deposit.userId;

        if (!plan || !user || deposit.amount <= 0.00001) {
          if (deposit.amount <= 0.00001) {
            deposit.status = 'inactive';
            await deposit.save();
          }
          return;
        }

        const now = new Date();
        const depositDate = deposit.createdAt;

        const durationInMilliseconds =
          plan.duration * MILLISECONDS[plan.period];
        const endDate = new Date(
          depositDate.getTime() + durationInMilliseconds
        );

        const maxEarnings = Math.floor(
          durationInMilliseconds / MILLISECONDS[plan.period]
        );

        let earningsCount = 0;
        const lastEarningDate = deposit.lastEarningDate || deposit.createdAt;

        let nextEarningDate = new Date(
          lastEarningDate.getTime() + MILLISECONDS[plan.period]
        );

        while (
          now >= nextEarningDate &&
          nextEarningDate <= endDate &&
          earningsCount < maxEarnings
        ) {
          const profit = deposit.amount * (plan.percentage / 100);
          const amount = profit * (1 - deposit.compound / 100);

          deposit.amount += profit - amount;

          try {
            const earningTransaction = new Transaction({
              userId: user._id,
              type: 'earning',
              amount,
              paymentMethod: deposit.paymentMethod,
              relatedBalance:
                user.accountBalance[deposit.paymentMethod] + amount,
              transactionReference: deposit._id,
              status: 'completed',
              plan: plan._id,
              createdAt: nextEarningDate,
            });

            await earningTransaction.save();

            user = await User.findByIdAndUpdate(
              user._id,
              {
                $inc: { [`accountBalance.${deposit.paymentMethod}`]: +amount },
              },
              { validateBeforeSave: false, new: true }
            );

            deposit.lastEarningDate = nextEarningDate;

            await deposit.save();

            earningsCount++;

            nextEarningDate = new Date(
              nextEarningDate.getTime() + MILLISECONDS[plan.period]
            );
          } catch (err) {
            if (err.code === 11000) {
              console.error('Duplicate transaction attempted:', err);
            } else {
              console.error(err);
            }
          }
        }

        if (now >= endDate) {
          deposit.status = 'inactive';
          await deposit.save();

          if (plan.return) {
            try {
              const returnTransaction = new Transaction({
                userId: user._id,
                type: 'fund',
                amount: deposit.amount,
                paymentMethod: deposit.paymentMethod,
                relatedBalance:
                  user.accountBalance[deposit.paymentMethod] + deposit.amount,
                transactionReference: deposit._id,
                status: 'completed',
                plan: plan._id,
                createdAt: endDate,
              });

              await returnTransaction.save();

              user = await User.findByIdAndUpdate(
                user._id,
                {
                  $inc: {
                    [`accountBalance.${deposit.paymentMethod}`]: deposit.amount,
                  },
                },
                { validateBeforeSave: false, new: true }
              );
            } catch (err) {
              if (err.code === 11000) {
                console.error('Duplicate transaction attempted:', err);
              } else {
                console.error(err);
              }
            }
          }
        }
      } catch (error) {
        console.error('🚩 CronJob Error inside: 🚩 ' + error);
      }
    });

    await Promise.all(operations);
  } catch (err) {
    console.error('🚩 CronJob Error: 🚩 ' + err);
  }
};

module.exports = calculateProfits;
