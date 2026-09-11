const mongoose = require('mongoose');

let isConnected = false;

// Setup mongoose connection event listeners
mongoose.connection.on('connected', () => {
  isConnected = true;
  console.log('[Database] MongoDB connected successfully');
});

mongoose.connection.on('error', (err) => {
  isConnected = false;
  console.error('[Database] MongoDB connection error:', err.message);
});

mongoose.connection.on('disconnected', () => {
  isConnected = false;
  console.warn('[Database] MongoDB disconnected');
});

/**
 * Connect to MongoDB with timeout and non-blocking failure recovery
 */
async function connectDB(customUri = null) {
  const uri = customUri || process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/fraud_detection';
  try {
    console.log(`[Database] Attempting connection to MongoDB at: ${uri.replace(/\/\/.*@/, '//***:***@')}`);
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 2500, // Fail fast if no MongoDB server is present locally
    });
    isConnected = true;
    return true;
  } catch (err) {
    isConnected = false;
    console.warn(`[Database] MongoDB not available (${err.message}). Application running with in-memory caching fallback.`);
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
