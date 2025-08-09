const { pool } = require('../config/database');

class Post {
  static async create(userId, postData) {
    const { title, content, category_id, image_url } = postData;
    
    try {
      const query = `
        INSERT INTO posts (user_id, title, content, category_id, image_url)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;
      
      const values = [userId, title, content, category_id, image_url];
      const result = await pool.query(query, values);
      
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  static async findById(id) {
    try {
      const query = `
        SELECT p.*, c.name as category_name, c.color as category_color,
               u.first_name, u.last_name, u.avatar_url as user_avatar
        FROM posts p
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN users u ON p.user_id = u.id
        WHERE p.id = $1
      `;
      const result = await pool.query(query, [id]);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  static async update(id, userId, updateData) {
    try {
      const { title, content, category_id, image_url } = updateData;
      const query = `
        UPDATE posts 
        SET title = $1, content = $2, category_id = $3, image_url = $4, updated_at = CURRENT_TIMESTAMP
        WHERE id = $5 AND user_id = $6
        RETURNING *
      `;
      
      const values = [title, content, category_id, image_url, id, userId];
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  static async delete(id, userId) {
    try {
      const query = 'DELETE FROM posts WHERE id = $1 AND user_id = $2 RETURNING *';
      const result = await pool.query(query, [id, userId]);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  static async getAll(limit = 20, offset = 0, category_id = null, search = null) {
    try {
      let query = `
        SELECT p.*, c.name as category_name, c.color as category_color,
               u.first_name, u.last_name, u.avatar_url as user_avatar
        FROM posts p
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN users u ON p.user_id = u.id
        WHERE 1=1
      `;
      let values = [];
      let paramCount = 0;

      if (category_id) {
        paramCount++;
        query += ` AND p.category_id = $${paramCount}`;
        values.push(category_id);
      }

      if (search) {
        paramCount++;
        query += ` AND (p.title ILIKE $${paramCount} OR p.content ILIKE $${paramCount})`;
        values.push(`%${search}%`);
      }

      query += ` ORDER BY p.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
      values.push(limit, offset);

      const result = await pool.query(query, values);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  static async getByUserId(userId, limit = 20, offset = 0) {
    try {
      const query = `
        SELECT p.*, c.name as category_name, c.color as category_color
        FROM posts p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.user_id = $1
        ORDER BY p.created_at DESC
        LIMIT $2 OFFSET $3
      `;
      
      const result = await pool.query(query, [userId, limit, offset]);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  static async incrementLikes(id) {
    try {
      const query = 'UPDATE posts SET likes_count = likes_count + 1 WHERE id = $1 RETURNING likes_count';
      const result = await pool.query(query, [id]);
      return result.rows[0].likes_count;
    } catch (error) {
      throw error;
    }
  }

  static async decrementLikes(id) {
    try {
      const query = 'UPDATE posts SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = $1 RETURNING likes_count';
      const result = await pool.query(query, [id]);
      return result.rows[0].likes_count;
    } catch (error) {
      throw error;
    }
  }

  static async incrementComments(id) {
    try {
      const query = 'UPDATE posts SET comments_count = comments_count + 1 WHERE id = $1 RETURNING comments_count';
      const result = await pool.query(query, [id]);
      return result.rows[0].comments_count;
    } catch (error) {
      throw error;
    }
  }

  static async decrementComments(id) {
    try {
      const query = 'UPDATE posts SET comments_count = GREATEST(comments_count - 1, 0) WHERE id = $1 RETURNING comments_count';
      const result = await pool.query(query, [id]);
      return result.rows[0].comments_count;
    } catch (error) {
      throw error;
    }
  }

  static async getStats() {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_posts,
          COUNT(DISTINCT user_id) as active_users,
          AVG(likes_count) as avg_likes,
          AVG(comments_count) as avg_comments
        FROM posts 
        WHERE is_published = true
      `;
      
      const result = await pool.query(query);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }
}

module.exports = Post; 