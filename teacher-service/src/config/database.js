const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'school_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
});

const initializeDatabase = async () => {
  try {
    // Test connection
    await pool.query('SELECT NOW()');
    console.log('Connected to PostgreSQL database');

    // Drop existing table if exists and recreate
    await pool.query('DROP TABLE IF EXISTS teacher_profiles CASCADE');

    // Create teacher_profiles table
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS teacher_profiles (
        id SERIAL PRIMARY KEY,
        user_id INTEGER UNIQUE NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        gender VARCHAR(10),
        date_of_birth DATE,
        phone VARCHAR(20),
        email VARCHAR(255) UNIQUE NOT NULL,
        address TEXT,
        subject VARCHAR(100),
        education_level VARCHAR(100),
        avatar_url VARCHAR(500),
        current_class VARCHAR(100),
        is_verified BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `;

    await pool.query(createTableQuery);
    console.log('Teacher database tables initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
};

module.exports = { pool, initializeDatabase }; 