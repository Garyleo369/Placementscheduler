const express = require('express');
const { getDBStatus } = require('../config/db');

const router = express.Router();

/**
 * @route   GET /api/health
 * @desc    Get service health status, server uptime, and database connection state
 * @access  Public
 */
router.get('/health', (req, res) => {
  const dbStatus = getDBStatus();

  const isHealthy = dbStatus.isReady;

  const healthData = {
    status: isHealthy ? 'OK' : 'DEGRADED',
    service: 'Placement Scheduler Backend',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || 'development',
    database: {
      status: dbStatus.state,
      host: dbStatus.host,
      databaseName: dbStatus.name
    }
  };

  return res.status(isHealthy ? 200 : 503).json(healthData);
});

module.exports = router;
