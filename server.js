require('dotenv').config({ path: './config.env' });

const mongoose = require('mongoose');
const http = require('http');
const socketIo = require('socket.io');
const stockPriceController = require('./controllers/stockPriceController');
const positionController = require('./controllers/positionController');

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

// Define an asynchronous function to start the server
async function startServer() {
  try {
    // Connect to the database
    await connectToDatabase();

    // Import the app module
    const app = require('./app');

    // Create an HTTP server
    const server = http.createServer(app);

    // Setup socket.io
    const io = socketIo(server, {
      cors: {
        origin: '*', // be more restrictive in production
        methods: ['GET', 'POST'],
      },
    });

    // After initializing Socket.io, call functions
    stockPriceController.sendStockUpdates(io);
    positionController.sendOpenPositions(io);

    // Listen to the server on your specified port
    const PORT = process.env.PORT || 3000;
    server.listen(PORT, () => {
      console.log(`App running on port ${PORT}`);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (error) => {
      console.log(error);
      console.error('🚩 Unhandled Rejection: ', error.name, error.message);
      server.close(() => {
        process.exit(1);
      });
    });
  } catch (error) {
    console.error('Failed to start the server: ', error);
    process.exit(1);
  }
}

// Start the server
startServer();
