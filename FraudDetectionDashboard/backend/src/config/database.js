const mongoose = require('mongoose');

let isConnected = false;
let wasConnected = false;

// Setup mongoose connection event listeners
mongoose.connection.on('connected', () => {
  isConnected = true;
  wasConnected = true;
  console.log('[Database] MongoDB connected successfully — persistence mode ACTIVE');
});

mongoose.connection.on('error', (err) => {
  isConnected = false;
  if (wasConnected) {
    console.error('[Database] MongoDB connection error:', err.message);
  }
});

mongoose.connection.on('disconnected', () => {
  isConnected = false;
  if (wasConnected) {
    console.warn('[Database] MongoDB disconnected — switching to in-memory caching fallback');
  }
});

/**
 * Connect to MongoDB with timeout, family resolution, and non-blocking in-memory fallback
 */
async function connectDB(customUri = null) {
  const uri = customUri || process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/fraud_detection';
  
  const options = {
    serverSelectionTimeoutMS: 2000, // Fail fast if no MongoDB server is present locally
    connectTimeoutMS: 2000,
  };

  // If pointing to localhost, prioritize IPv4 (127.0.0.1) on Windows loopback
  // to avoid dual-stack delay and noisy ECONNREFUSED ::1:27017 errors
  if (uri.includes('localhost')) {
    options.family = 4;
  }

  try {
    console.log(`[Database] Attempting connection to MongoDB at: ${uri.replace(/\/\/.*@/, '//***:***@')}`);
    await mongoose.connect(uri, options);
    isConnected = true;
    wasConnected = true;
    console.log('[Database] MongoDB connection established. Database: fraud_detection');
    return true;
  } catch (err) {
    isConnected = false;
    console.warn(`[Database] MongoDB not reachable at ${uri.replace(/\/\/.*@/, '//***:***@')} (${err.message}).`);
    console.warn('[Database] In-memory caching fallback is ACTIVE. Application is running normally.');
    return false;
  }
}

/**
 * Check if MongoDB is connected and ready
 */
function isDatabaseConnected() {
  return isConnected && mongoose.connection.readyState === 1;
}

/**
 * Disconnect cleanly from MongoDB
 */
async function disconnectDB() {
  if (mongoose.connection.readyState !== 0) {
    try {
      await mongoose.disconnect();
      isConnected = false;
      console.log('[Database] MongoDB disconnected cleanly');
    } catch (err) {
      console.error('[Database] Error during MongoDB disconnection:', err.message);
    }
  }
}

module.exports = {
  connectDB,
  isDatabaseConnected,
  disconnectDB,
};
