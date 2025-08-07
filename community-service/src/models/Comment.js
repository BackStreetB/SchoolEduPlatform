const { pool } = require('../config/database');

class Comment {
  static async create(userId, commentData) {
    const { post_id, content, parent_id } = commentData;
    
    try {
      const query = `
        INSERT INTO comments (post_id, user_id, content, parent_id)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `;
      
      const values = [post_id, userId, content, parent_id];
      const result = await pool.query(query, values);
      
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  static async findById(id) {
    try {
      const query = `
        SELECT c.*, u.first_name, u.last_name, u.avatar_url as user_avatar
        FROM comments c
        LEFT JOIN users u ON c.user_id = u.id
        WHERE c.id = $1
      `;
      const result = await pool.query(query, [id]);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  static async update(id, userId, content) {
    try {
      const query = `
        UPDATE comments 
        SET content = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2 AND user_id = $3
        RETURNING *
      `;
      
      const result = await pool.query(query, [content, id, userId]);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  static async delete(id, userId) {
    try {
      const query = 'DELETE FROM comments WHERE id = $1 AND user_id = $2 RETURNING *';
      const result = await pool.query(query, [id, userId]);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  static async getByPostId(postId, limit = 50, offset = 0) {
    try {
      const query = `
        SELECT c.*, u.first_name, u.last_name, u.avatar_url as user_avatar
        FROM comments c
        LEFT JOIN users u ON c.user_id = u.id
        WHERE c.post_id = $1
        ORDER BY c.created_at ASC
        LIMIT $2 OFFSET $3
      `;
      
      const result = await pool.query(query, [postId, limit, offset]);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  static async getReplies(commentId, limit = 20, offset = 0) {
    try {
      const query = `
        SELECT c.*, u.first_name, u.last_name, u.avatar_url as user_avatar
        FROM comments c
        LEFT JOIN users u ON c.user_id = u.id
        WHERE c.parent_id = $1
        ORDER BY c.created_at ASC
        LIMIT $2 OFFSET $3
      `;
      
      const result = await pool.query(query, [commentId, limit, offset]);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  static async incrementLikes(id) {
    try {
      const query = 'UPDATE comments SET likes_count = likes_count + 1 WHERE id = $1 RETURNING likes_count';
      const result = await pool.query(query, [id]);
      return result.rows[0].likes_count;
    } catch (error) {
      throw error;
    }
  }

  static async decrementLikes(id) {
    try {
      const query = 'UPDATE comments SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = $1 RETURNING likes_count';
      const result = await pool.query(query, [id]);
      return result.rows[0].likes_count;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = Comment; 