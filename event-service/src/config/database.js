const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'postgres',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'school_events',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password'
});

// Test database connection
pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

const initDatabase = async () => {
  try {
    // Tạo bảng events
    const createEventsTable = `
      CREATE TABLE IF NOT EXISTS events (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        start_time TIME,
        end_time TIME,
        type VARCHAR(50) DEFAULT 'daily',
        color VARCHAR(20) DEFAULT 'blue',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `;

    await pool.query(createEventsTable);
    console.log('Events table initialized successfully');
    
    // Thêm cột color nếu chưa tồn tại
    try {
      await pool.query('ALTER TABLE events ADD COLUMN IF NOT EXISTS color VARCHAR(20) DEFAULT \'blue\'');
      console.log('Color column added successfully');
    } catch (error) {
      console.log('Color column already exists or error adding:', error.message);
    }

    // Tạo bảng event_participants
    const createEventParticipantsTable = `
      CREATE TABLE IF NOT EXISTS event_participants (
        id SERIAL PRIMARY KEY,
        event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL,
        user_name VARCHAR(255) NOT NULL,
        joined_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(event_id, user_id)
      );
    `;

    await pool.query(createEventParticipantsTable);
    console.log('Event participants table initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
};

module.exports = { pool, initDatabase }; 