const CronJob = require('cron').CronJob;
const calculateEarnings = require('./utils/calculateEarnings');
const fetchAllTransactions = require('./utils/createFake');

// Existing job that runs every second
const job1 = new CronJob(
  '0 */10 * * * *',
  function () {
    calculateEarnings();
  },
  null,
  true,
  'America/Los_Angeles'
);
job1.start();

// New job that runs every 30 minutes
const job2 = new CronJob(
  '0 */10 * * * *',
  function () {
    fetchAllTransactions();
  },
  null,
  true,
  'America/Los_Angeles'
);
job2.start();
