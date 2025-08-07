const { pool } = require('../config/database');

class Like {
  static async create(userId, likeData) {
    const { post_id, comment_id } = likeData;
    
    try {
      const query = `
        INSERT INTO likes (user_id, post_id, comment_id)
        VALUES ($1, $2, $3)
        RETURNING *
      `;
      
      const values = [userId, post_id, comment_id];
      const result = await pool.query(query, values);
      
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  static async delete(userId, likeData) {
    const { post_id, comment_id } = likeData;
    
    try {
      const query = `
        DELETE FROM likes 
        WHERE user_id = $1 AND post_id = $2 AND comment_id = $3
        RETURNING *
      `;
      
      const values = [userId, post_id, comment_id];
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  static async exists(userId, likeData) {
    const { post_id, comment_id } = likeData;
    
    try {
      const query = `
        SELECT * FROM likes 
        WHERE user_id = $1 AND post_id = $2 AND comment_id = $3
      `;
      
      const values = [userId, post_id, comment_id];
      const result = await pool.query(query, values);
      return result.rows.length > 0;
    } catch (error) {
      throw error;
    }
  }

  static async getByPostId(postId) {
    try {
      const query = `
        SELECT l.*, u.first_name, u.last_name, u.avatar_url as user_avatar
        FROM likes l
        LEFT JOIN users u ON l.user_id = u.id
        WHERE l.post_id = $1
        ORDER BY l.created_at DESC
      `;
      
      const result = await pool.query(query, [postId]);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  static async getByCommentId(commentId) {
    try {
      const query = `
        SELECT l.*, u.first_name, u.last_name, u.avatar_url as user_avatar
        FROM likes l
        LEFT JOIN users u ON l.user_id = u.id
        WHERE l.comment_id = $1
        ORDER BY l.created_at DESC
      `;
      
      const result = await pool.query(query, [commentId]);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  static async getByUserId(userId, limit = 20, offset = 0) {
    try {
      const query = `
        SELECT l.*, p.title as post_title, c.content as comment_content
        FROM likes l
        LEFT JOIN posts p ON l.post_id = p.id
        LEFT JOIN comments c ON l.comment_id = c.id
        WHERE l.user_id = $1
        ORDER BY l.created_at DESC
        LIMIT $2 OFFSET $3
      `;
      
      const result = await pool.query(query, [userId, limit, offset]);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = Like; 