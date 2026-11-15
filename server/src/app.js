const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const healthRoutes = require('./routes/healthRoutes');
const dataRoutes = require('./routes/dataRoutes');
const scheduleRoutes = require('./routes/scheduleRoutes');
const replanRoutes = require('./routes/replanRoutes');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const app = express();

// Enable Cross-Origin Resource Sharing
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true
  })
);

// HTTP request logger
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to Placement Scheduler API',
    healthCheck: '/api/health'
  });
});

// API Routes
app.use('/api', healthRoutes);
app.use('/api/data', dataRoutes);
app.use('/api/schedule', scheduleRoutes);
app.use('/api/replan', replanRoutes);

// Catch 404s
app.use(notFoundHandler);

// Centralized error handler
app.use(errorHandler);

module.exports = app;
