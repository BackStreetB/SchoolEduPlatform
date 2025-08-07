const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// Tạo sự kiện mới
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { title, description, start_date, end_date, start_time, end_time, type, color } = req.body;
    const userId = req.user.id;
    
    // Kiểm tra ngày bắt đầu không được trong quá khứ
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDate = new Date(start_date);
    startDate.setHours(0, 0, 0, 0);
    
    if (startDate < today) {
      return res.status(400).json({ 
        error: 'Không thể tạo sự kiện cho ngày trong quá khứ' 
      });
    }
    
    // Kiểm tra ngày kết thúc không được trước ngày bắt đầu
    const endDate = new Date(end_date);
    endDate.setHours(0, 0, 0, 0);
    
    if (endDate < startDate) {
      return res.status(400).json({ 
        error: 'Ngày kết thúc không được trước ngày bắt đầu' 
      });
    }
    
    const query = `
      INSERT INTO events (user_id, title, description, start_date, end_date, start_time, end_time, type, color, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      RETURNING *
    `;
    
    const result = await pool.query(query, [
      userId, title, description, start_date, end_date, start_time, end_time, type, color || 'blue'
    ]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ error: 'Lỗi tạo sự kiện' });
  }
});

// Lấy tất cả sự kiện của user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const query = `
      SELECT * FROM events 
      WHERE user_id = $1 
      ORDER BY start_date DESC, start_time ASC
    `;
    
    const result = await pool.query(query, [userId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Lỗi lấy danh sách sự kiện' });
  }
});

// Lấy sự kiện theo ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    const query = 'SELECT * FROM events WHERE id = $1 AND user_id = $2';
    const result = await pool.query(query, [id, userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy sự kiện' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching event:', error);
    res.status(500).json({ error: 'Lỗi lấy thông tin sự kiện' });
  }
});

// Cập nhật sự kiện
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, start_date, end_date, start_time, end_time, type, color } = req.body;
    const userId = req.user.id;
    
    // Lấy thông tin sự kiện
    const eventQuery = 'SELECT * FROM events WHERE id = $1 AND user_id = $2';
    const eventResult = await pool.query(eventQuery, [id, userId]);
    
    if (eventResult.rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy sự kiện' });
    }
    
    // Kiểm tra ngày bắt đầu không được trong quá khứ
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDate = new Date(start_date);
    startDate.setHours(0, 0, 0, 0);
    
    if (startDate < today) {
      return res.status(400).json({ 
        error: 'Không thể tạo sự kiện cho ngày trong quá khứ' 
      });
    }
    
    // Kiểm tra ngày kết thúc không được trước ngày bắt đầu
    const endDate = new Date(end_date);
    endDate.setHours(0, 0, 0, 0);
    
    if (endDate < startDate) {
      return res.status(400).json({ 
        error: 'Ngày kết thúc không được trước ngày bắt đầu' 
      });
    }
    
    const updateQuery = `
      UPDATE events 
      SET title = $1, description = $2, start_date = $3, end_date = $4, start_time = $5, end_time = $6, type = $7, color = $8, updated_at = NOW()
      WHERE id = $9 AND user_id = $10
      RETURNING *
    `;
    
    const result = await pool.query(updateQuery, [
      title, description, start_date, end_date, start_time, end_time, type, color || 'blue', id, userId
    ]);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ error: 'Lỗi cập nhật sự kiện' });
  }
});

// Xóa sự kiện
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    // Lấy thông tin sự kiện
    const eventQuery = 'SELECT * FROM events WHERE id = $1 AND user_id = $2';
    const eventResult = await pool.query(eventQuery, [id, userId]);
    
    if (eventResult.rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy sự kiện' });
    }
    
    const deleteQuery = 'DELETE FROM events WHERE id = $1 AND user_id = $2';
    await pool.query(deleteQuery, [id, userId]);
    
    res.json({ message: 'Đã xóa sự kiện thành công' });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ error: 'Lỗi xóa sự kiện' });
  }
});

// Lấy sự kiện của hôm nay
router.get('/today/current', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const today = new Date().toISOString().split('T')[0];
    
    const query = 'SELECT * FROM events WHERE user_id = $1 AND start_date <= $2 AND end_date >= $2';
    const result = await pool.query(query, [userId, today]);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching today event:', error);
    res.status(500).json({ error: 'Lỗi lấy sự kiện hôm nay' });
  }
});

module.exports = router; 