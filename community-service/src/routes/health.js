const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// Health check endpoint
router.get('/health', async (req, res) => {
  try {
    // Check database connection
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    
    res.status(200).json({
      status: 'healthy',
      service: 'community-service',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      database: 'connected'
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      service: 'community-service',
      timestamp: new Date().toISOString(),
      error: error.message,
      database: 'disconnected'
    });
  }
});

// Readiness probe
router.get('/ready', async (req, res) => {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    
    res.status(200).json({
      status: 'ready',
      service: 'community-service'
    });
  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      service: 'community-service',
      error: error.message
    });
  }
});

module.exports = router; 