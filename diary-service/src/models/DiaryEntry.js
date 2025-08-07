const { pool } = require('../config/database');

class DiaryEntry {
  static async create(userId, entryData) {
    const { title, content, mood, tags, is_private } = entryData;
    
    try {
      const query = `
        INSERT INTO diary_entries (user_id, title, content, mood, tags, is_private)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;
      
      const values = [userId, title, content, mood, tags || [], is_private !== false];
      const result = await pool.query(query, values);
      
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  static async findById(id, userId) {
    try {
      const query = 'SELECT * FROM diary_entries WHERE id = $1 AND user_id = $2';
      const result = await pool.query(query, [id, userId]);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  static async update(id, userId, updateData) {
    try {
      const { title, content, mood, tags, is_private } = updateData;
      const query = `
        UPDATE diary_entries 
        SET title = $1, content = $2, mood = $3, tags = $4, is_private = $5, updated_at = CURRENT_TIMESTAMP
        WHERE id = $6 AND user_id = $7
        RETURNING *
      `;
      
      const values = [title, content, mood, tags || [], is_private !== false, id, userId];
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  static async delete(id, userId) {
    try {
      const query = 'DELETE FROM diary_entries WHERE id = $1 AND user_id = $2 RETURNING *';
      const result = await pool.query(query, [id, userId]);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  static async getByUserId(userId, limit = 20, offset = 0, search = null, tags = null) {
    try {
      let query = 'SELECT * FROM diary_entries WHERE user_id = $1';
      let values = [userId];
      let paramCount = 1;

      // Add search filter
      if (search) {
        paramCount++;
        query += ` AND (title ILIKE $${paramCount} OR content ILIKE $${paramCount})`;
        values.push(`%${search}%`);
      }

      // Add tags filter
      if (tags && tags.length > 0) {
        paramCount++;
        query += ` AND tags && $${paramCount}`;
        values.push(tags);
      }

      query += ` ORDER BY created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
      values.push(limit, offset);

      const result = await pool.query(query, values);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  static async getByDateRange(userId, startDate, endDate) {
    try {
      const query = `
        SELECT * FROM diary_entries 
        WHERE user_id = $1 AND DATE(created_at) BETWEEN $2 AND $3
        ORDER BY created_at DESC
      `;
      
      const result = await pool.query(query, [userId, startDate, endDate]);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  static async getStats(userId) {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_entries,
          AVG(mood) as avg_mood,
          COUNT(CASE WHEN mood >= 4 THEN 1 END) as good_mood_entries,
          COUNT(CASE WHEN mood <= 2 THEN 1 END) as bad_mood_entries,
          COUNT(DISTINCT DATE(created_at)) as active_days
        FROM diary_entries 
        WHERE user_id = $1
      `;
      
      const result = await pool.query(query, [userId]);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  static async getRecentEntries(userId, limit = 5) {
    try {
      const query = `
        SELECT * FROM diary_entries 
        WHERE user_id = $1 
        ORDER BY created_at DESC 
        LIMIT $2
      `;
      
      const result = await pool.query(query, [userId, limit]);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  static async searchEntries(userId, searchTerm, limit = 20, offset = 0) {
    try {
      const query = `
        SELECT * FROM diary_entries 
        WHERE user_id = $1 AND (
          title ILIKE $2 OR 
          content ILIKE $2 OR 
          tags::text ILIKE $2
        )
        ORDER BY created_at DESC 
        LIMIT $3 OFFSET $4
      `;
      
      const result = await pool.query(query, [userId, `%${searchTerm}%`, limit, offset]);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  static async getEntriesByMood(userId, mood, limit = 20, offset = 0) {
    try {
      const query = `
        SELECT * FROM diary_entries 
        WHERE user_id = $1 AND mood = $2
        ORDER BY created_at DESC 
        LIMIT $3 OFFSET $4
      `;
      
      const result = await pool.query(query, [userId, mood, limit, offset]);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = DiaryEntry; 