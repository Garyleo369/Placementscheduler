require('dotenv').config();
const app = require('./app');
const { connectDB } = require('./config/db');

const PORT = process.env.PORT || 5000;

let server;

const startServer = async () => {
  try {
    // Attempt database connection
    try {
      await connectDB();
    } catch (dbError) {
      console.warn('[Server] Warning: Started without immediate MongoDB connection. Retrying will occur when MongoDB is reachable.');
    }

    server = app.listen(PORT, () => {
      console.log(`[Server] Placement Scheduler backend running on port ${PORT} (${process.env.NODE_ENV || 'development'} mode)`);
      console.log(`[Server] Health check available at: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error(`[Server] Fatal error during startup: ${error.message}`);
    process.exit(1);
  }
};

// Graceful Shutdown
const handleShutdown = (signal) => {
  console.log(`\n[Server] Received ${signal}. Initiating graceful shutdown...`);
  if (server) {
    server.close(() => {
      console.log('[Server] HTTP server closed.');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
};

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

startServer();
