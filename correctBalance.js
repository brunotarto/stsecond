const User = require('./models/userModel');

const findNegativeBalances = async () => {
  try {
    const users = await User.find({
      $or: [
        { 'accountBalance.BTC': { $lt: 0 } },
        { 'accountBalance.ETH': { $lt: 0 } },
        { 'accountBalance.BNB': { $lt: 0 } },
        { 'accountBalance.TRX': { $lt: 0 } },
        { 'accountBalance.USD': { $lt: 0 } },
      ],
    });

    console.log(`Found ${users.length} user(s) with negative balance`);

    if (users.length > 0) {
      users.forEach((user) => console.log(`User ID: ${user._id}`));
    }
  } catch (error) {
    console.error(`Error occurred: ${error}`);
  }
};

module.exports = findNegativeBalances;
