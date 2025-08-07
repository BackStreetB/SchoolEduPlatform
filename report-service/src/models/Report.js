const { pool } = require('../config/database');

class Report {
  static async create(userId, reportData) {
    const { date, achievements, challenges, goals, mood, notes } = reportData;
    
    try {
      const query = `
        INSERT INTO reports (user_id, date, achievements, challenges, goals, mood, notes)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;
      
      const values = [userId, date, achievements, challenges, goals, mood, notes];
      const result = await pool.query(query, values);
      
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  static async findByUserAndDate(userId, date) {
    try {
      const query = 'SELECT * FROM reports WHERE user_id = $1 AND date = $2';
      const result = await pool.query(query, [userId, date]);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  static async update(userId, date, updateData) {
    try {
      const { achievements, challenges, goals, mood, notes } = updateData;
      const query = `
        UPDATE reports 
        SET achievements = $1, challenges = $2, goals = $3, mood = $4, notes = $5, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $6 AND date = $7
        RETURNING *
      `;
      
      const values = [achievements, challenges, goals, mood, notes, userId, date];
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  static async getByUserId(userId, limit = 30, offset = 0) {
    try {
      const query = `
        SELECT * FROM reports 
        WHERE user_id = $1 
        ORDER BY date DESC 
        LIMIT $2 OFFSET $3
      `;
      
      const result = await pool.query(query, [userId, limit, offset]);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  static async getByDateRange(userId, startDate, endDate) {
    try {
      const query = `
        SELECT * FROM reports 
        WHERE user_id = $1 AND date BETWEEN $2 AND $3
        ORDER BY date DESC
      `;
      
      const result = await pool.query(query, [userId, startDate, endDate]);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  static async delete(userId, date) {
    try {
      const query = 'DELETE FROM reports WHERE user_id = $1 AND date = $2 RETURNING *';
      const result = await pool.query(query, [userId, date]);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  static async getStats(userId, days = 30) {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_reports,
          AVG(mood) as avg_mood,
          COUNT(CASE WHEN mood >= 4 THEN 1 END) as good_days,
          COUNT(CASE WHEN mood <= 2 THEN 1 END) as bad_days
        FROM reports 
        WHERE user_id = $1 AND date >= CURRENT_DATE - INTERVAL '${days} days'
      `;
      
      const result = await pool.query(query, [userId]);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }
}

module.exports = Report; 