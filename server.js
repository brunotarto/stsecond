require('dotenv').config({ path: './config.env' });

const mongoose = require('mongoose');

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.log(error);
  console.error('🚩 Uncaught Exception: ', error.name, error.message);
  process.exit(1);
});

// Replace placeholders in the database connection string
const DB = process.env.DATABASE.replace('<PASSWORD>', process.env.PASSWORD)
  .replace('<USER_NAME>', process.env.USER_NAME)
  .replace('<DATABASE_LOCATION>', process.env.DATABASE_LOCATION);

// Function to connect to the database
async function connectToDatabase() {
  try {
    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    };
    await mongoose.connect(DB, options);
    console.log('DB Connected');
  } catch (error) {
    throw error;
  }
}

// Connect to the database
connectToDatabase();

// Import the app module
const app = require('./app');
// module.exports = app;
// Start the server
const server = app.listen(process.env.PORT, () => {
  console.log(`App running on port ${process.env.PORT}`);
});

// cron job to calculate profits
require('./cronJob');

// Handle unhandled promise rejections
process.on('unhandledRejection', (error) => {
  console.log(error);
  console.error('🚩 Unhandled Rejection: ', error.name, error.message);
  server.close(() => {
    process.exit(1);
  });
});
