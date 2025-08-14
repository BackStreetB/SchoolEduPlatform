const { Pool } = require('pg');
require('dotenv').config();

const authPool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'postgres',
  database: 'school_auth', // Connect to auth database
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
});

// Test connection
authPool.connect()
  .then(() => {
    console.log('Connected to PostgreSQL auth database');
  })
  .catch(err => {
    console.error('Connection error to auth database', err.stack);
  });

module.exports = authPool;
