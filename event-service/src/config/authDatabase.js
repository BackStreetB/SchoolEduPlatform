const { Pool } = require('pg');
require('dotenv').config();

const authPool = new Pool({
  user: process.env.POSTGRES_USER,
  host: process.env.POSTGRES_HOST,
  database: 'school_auth', // Connect to auth database
  password: process.env.POSTGRES_PASSWORD,
  port: process.env.POSTGRES_PORT,
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
