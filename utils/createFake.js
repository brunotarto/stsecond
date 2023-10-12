const axios = require('axios');
const Proof = require('./../models/proofModel');

const BASE_URL_ETH = 'https://eth-blockbook.nownodes.io/api';
const BASE_URL_BNB = 'https://bsc-blockbook.nownodes.io/api';
const BASE_URL_BTC = 'https://btcbook.nownodes.io/api';
const API_KEY = '9f129781-4eac-4bfa-8240-0ec6f57d7640';
const DEFAULT_HEADERS = {
  'api-key': API_KEY,
  'Content-Type': 'application/json',
};

const MINIMUM = 10;
const MAXIMUM = 4000;

const MINIMUM_TRON = +(MINIMUM / 0.1).toFixed(2);
const MAXIMUM_TRON = +(MAXIMUM / 0.1).toFixed(2);

const MINIMUM_ETH = +(MINIMUM / 2000).toFixed(3);
const MAXIMUM_ETH = +(MAXIMUM / 2000).toFixed(3);

const MINIMUM_BNB = +(MINIMUM / 300).toFixed(3);
const MAXIMUM_BNB = +(MAXIMUM / 300).toFixed(3);

const MINIMUM_BTC = +(MINIMUM / 20000).toFixed(5);
const MAXIMUM_BTC = +(MAXIMUM / 20000).toFixed(5);

const COUNT_BTC = Math.floor(Math.random() * 1) + 1;
const COUNT_ETH = Math.floor(Math.random() * 2) + 1;
const COUNT_BNB = Math.floor(Math.random() * 2) + 1;
const COUNT_TRX = Math.floor(Math.random() * 3) + 1;

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    let j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function chance(probability) {
  return Math.random() < probability / 100;
}

const domains = [
  { name: 'gmail.com', weight: 60 },
  { name: 'yahoo.com', weight: 7 },
  { name: 'yahoo.co.uk', weight: 7 },
  { name: 'yahoo.com.sg', weight: 7 },
  { name: 'hotmail.com', weight: 10 },
  { name: 'aol.com', weight: 5 },
  { name: 'yandex.ru', weight: 5 },
  { name: 'yandex.com', weight: 5 },
  { name: 'outlook.com', weight: 5 },
];

// This function selects a domain with weighted probabilities
function selectWeightedDomain() {
  let totalWeight = domains.reduce((prev, cur) => prev + cur.weight, 0);
  let randomNum = Math.random() * totalWeight;
  for (let i = 0; i < domains.length; i++) {
    if (randomNum < domains[i].weight) {
      return domains[i].name;
    }
    randomNum -= domains[i].weight;
  }
}

function generateEmail() {
  const name =
    String.fromCharCode(97 + Math.random() * 26) +
    String.fromCharCode(97 + Math.random() * 26);
  const domain = selectWeightedDomain();
  return `${name[0]}***${name[1]}@${domain}`;
}

function filterTransactionsByTokenSymbolAndValueETH(
  response,
  tokenSymbols,
  count,
  power
) {
  const transactions = response.txs;
  const filteredTransactions = [];
  let flag_native = false;
  for (let transaction of shuffleArray(transactions)) {
    if (!flag_native && !transaction.tokenTransfers) {
      if (
        BigInt(transaction.value) >= BigInt(MINIMUM_ETH * 10 ** 16) &&
        BigInt(transaction.value) <= BigInt(MAXIMUM_ETH * 10 ** 16)
      ) {
        filteredTransactions.push({
          txid: transaction.txid,
          network: 'ETH',
          token: 'ETH',
          amount: transaction.value / 10 ** 16,
        });
        flag_native = true;
      }
    }

    if (transaction.tokenTransfers) {
      for (let tokenTransfer of transaction.tokenTransfers) {
        // Check if the token symbol matches and its value is greater than or equal to the minimum value
        if (
          tokenSymbols.includes(tokenTransfer.symbol) &&
          BigInt(tokenTransfer.value) >= BigInt(MINIMUM * power) &&
          BigInt(tokenTransfer.value) <= BigInt(MAXIMUM * power)
        ) {
          filteredTransactions.push({
            txid: transaction.txid,
            network: 'ETH',
            token: tokenTransfer.symbol,
            amount: tokenTransfer.value / power,
          });
          break; // Break the loop if a matching token transfer is found
        }
      }
    }
    if (filteredTransactions.length === count) {
      break;
    }
  }

  return filteredTransactions;
}

function filterTransactionsByTokenSymbolAndValueBNB(
  response,
  tokenSymbols,
  count,
  power
) {
  const transactions = response.txs;
  const filteredTransactions = [];
  let flag_native = false;
  for (let transaction of shuffleArray(transactions)) {
    if (!flag_native && !transaction.tokenTransfers) {
      if (
        BigInt(transaction.value) >= BigInt(MINIMUM_BNB * power) &&
        BigInt(transaction.value) <= BigInt(MAXIMUM_BNB * power)
      ) {
        filteredTransactions.push({
          txid: transaction.txid,
          network: 'BNB',
          token: 'BNB',
          amount: transaction.value / power,
        });
        flag_native = true;
      }
    }
    if (transaction.tokenTransfers) {
      for (let tokenTransfer of transaction.tokenTransfers) {
        // Check if the token symbol matches and its value is greater than or equal to the minimum value
        if (
          tokenSymbols.includes(tokenTransfer.symbol) &&
          BigInt(tokenTransfer.value) >= BigInt(MINIMUM * power) &&
          BigInt(tokenTransfer.value) <= BigInt(MAXIMUM * power)
        ) {
          filteredTransactions.push({
            txid: transaction.txid,
            network: 'BNB',
            token: tokenTransfer.symbol,
            amount: tokenTransfer.value / power,
          });
          break; // Break the loop if a matching token transfer is found
        }
      }
    }
    if (filteredTransactions.length === count) {
      break;
    }
  }

  return filteredTransactions;
}

function filterTransactionsByTokenSymbolAndValueBTC(response, count, power) {
  const transactions = response.txs;
  const filteredTransactions = [];
  for (let transaction of shuffleArray(transactions)) {
    for (let out of transaction.vout) {
      if (
        BigInt(out.value) >= BigInt(MINIMUM_BTC * power) &&
        BigInt(out.value) <= BigInt(MAXIMUM_BTC * power) &&
        +out.addresses.length === 1 &&
        +out.addresses[0][0] === 1
      ) {
        filteredTransactions.push({
          txid: transaction.txid,
          network: 'BTC',
          token: 'BTC',
          amount: out.value / power,
        });
        break;
      }

      if (filteredTransactions.length === count) {
        break;
      }
    }
    if (filteredTransactions.length === count) {
      break;
    }
  }

  return filteredTransactions;
}

function filterTransactionsTRON(transactions, contractAddress, count) {
  let filteredTransactions = [];
  let flag_native = false;
  for (let transaction of shuffleArray(transactions)) {
    if (
      !flag_native &&
      !transaction.raw_data.contract[0].parameter.value.contract_address &&
      !transaction.raw_data.contract[0].parameter.value.asset_name
    ) {
      let decimalAmount =
        transaction.raw_data.contract[0].parameter.value.amount / 10 ** 6;

      if (decimalAmount >= MINIMUM_TRON && decimalAmount <= MAXIMUM_TRON) {
        filteredTransactions.push({
          txid: transaction.txID,
          network: 'TRX',
          token: 'TRX',
          amount: decimalAmount,
        });
        flag_native = true;
        if (filteredTransactions.length === count) {
          break;
        }
      }
    }
    if (
      transaction.raw_data.contract[0].parameter.value.contract_address ===
      contractAddress
    ) {
      let hexAmount =
        transaction.raw_data.contract[0].parameter.value.data.slice(-64);
      let decimalAmount = parseInt(hexAmount, 16) / 10 ** 6;

      if (decimalAmount >= MINIMUM && decimalAmount <= MAXIMUM) {
        filteredTransactions.push({
          txid: transaction.txID,
          network: 'TRX',
          token: 'USDT',
          amount: decimalAmount,
        });

        if (filteredTransactions.length === count) {
          break;
        }
      }
    }
  }

  return filteredTransactions;
}

async function fetchBlockAndTransactionsBTC() {
  try {
    const blockResponse = await axios({
      method: 'get',
      maxBodyLength: Infinity,
      url: BASE_URL_BTC,
      headers: DEFAULT_HEADERS,
    });

    const lastHash = blockResponse.data.backend.bestBlockHash;

    const transactionResponse = await axios({
      method: 'get',
      maxBodyLength: Infinity,
      url: `${BASE_URL_BTC}/v2/block/${lastHash}`,
      headers: DEFAULT_HEADERS,
    });

    return filterTransactionsByTokenSymbolAndValueBTC(
      transactionResponse.data,
      COUNT_BTC,
      10 ** 8
    );
  } catch (error) {
    console.log(error);
  }
}

async function fetchBlockAndTransactionsETH() {
  try {
    const blockResponse = await axios({
      method: 'get',
      maxBodyLength: Infinity,
      url: BASE_URL_ETH,
      headers: DEFAULT_HEADERS,
    });

    const lastHash = blockResponse.data.backend.bestBlockHash;

    const transactionResponse = await axios({
      method: 'get',
      maxBodyLength: Infinity,
      url: `${BASE_URL_ETH}/v2/block/${lastHash}`,
      headers: DEFAULT_HEADERS,
    });

    return filterTransactionsByTokenSymbolAndValueETH(
      transactionResponse.data,
      ['USDC', 'BUSD', 'USDT'],
      COUNT_ETH,
      10 ** 6
    );
  } catch (error) {
    console.log(error);
  }
}

async function fetchBlockAndTransactionsBNB() {
  try {
    const blockResponse = await axios({
      method: 'get',
      maxBodyLength: Infinity,
      url: BASE_URL_BNB,
      headers: DEFAULT_HEADERS,
    });

    const lastHash = blockResponse.data.backend.bestBlockHash;

    const transactionResponse = await axios({
      method: 'get',
      maxBodyLength: Infinity,
      url: `${BASE_URL_BNB}/v2/block/${lastHash}`,
      headers: DEFAULT_HEADERS,
    });

    return filterTransactionsByTokenSymbolAndValueBNB(
      transactionResponse.data,
      ['USDC', 'BUSD', 'USDT'],
      COUNT_BNB,
      10 ** 18
    );
  } catch (error) {
    console.log(error);
  }
}

async function fetchBlockAndTransactionsTRON() {
  try {
    const transactionResponse = await axios({
      method: 'get',
      url: 'https://api.trongrid.io/walletsolidity/getnowblock',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return filterTransactionsTRON(
      transactionResponse.data.transactions,
      '41a614f803b6fd780986a42c78ec9c7f77e6ded13c',
      COUNT_TRX
    );
  } catch (error) {
    console.log(error);
  }
}
async function fetchAllTransactions() {
  let tron = [];
  let eth = [];
  let bnb = [];
  let btc = [];

  if (chance(9)) tron = await fetchBlockAndTransactionsTRON();
  if (chance(5)) eth = await fetchBlockAndTransactionsETH();
  if (chance(5)) bnb = await fetchBlockAndTransactionsBNB();
  if (chance(2)) btc = await fetchBlockAndTransactionsBTC();

  let result = [...tron, ...eth, ...bnb, ...btc];
  result.forEach((transaction) => {
    transaction.type = chance(30) ? 'withdrawal' : 'deposit';
    let date = new Date();
    date.setSeconds(date.getSeconds() - Math.floor(Math.random() * 1001));
    transaction.createdAt = date;
    transaction.email = generateEmail();
    // Create new proof
    const proof = new Proof(transaction);

    // Save proof to the database
    proof.save();
  });
}

module.exports = fetchAllTransactions;
