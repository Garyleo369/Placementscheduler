const mongoose = require('mongoose');

/**
 * Connect to MongoDB database using Mongoose
 */
const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/placement_scheduler';

  try {
    const conn = await mongoose.connect(uri);

    console.log(`[MongoDB] Connected successfully: ${conn.connection.host}/${conn.connection.name}`);

    // Connection event listeners
    mongoose.connection.on('error', (err) => {
      console.error(`[MongoDB] Connection error: ${err.message}`);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('[MongoDB] Disconnected from database');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('[MongoDB] Reconnected to database');
    });

    return conn;
  } catch (error) {
    console.error(`[MongoDB] Initial connection failed: ${error.message}`);
    // Optional: exit process or let the server run with DB down alert depending on deployment
    throw error;
  }
};

/**
 * Helper to get readable DB status
 */
const getDBStatus = () => {
  const stateMap = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
    99: 'uninitialized'
  };
  const readyState = mongoose.connection.readyState;
  return {
    state: stateMap[readyState] || 'unknown',
    isReady: readyState === 1,
    host: mongoose.connection.host || null,
    name: mongoose.connection.name || null
  };
};

module.exports = {
  connectDB,
  getDBStatus
};
