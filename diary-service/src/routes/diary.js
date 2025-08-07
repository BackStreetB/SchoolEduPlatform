const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// Tạo nhật ký mới
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { title, content } = req.body;
    const userId = req.user.id;
    const today = new Date().toISOString().split('T')[0];
    
    // Kiểm tra xem đã có nhật ký cho ngày hôm nay chưa
    const existingDiary = await pool.query(
      'SELECT * FROM diary_entries WHERE user_id = $1 AND date = $2',
      [userId, today]
    );
    
    if (existingDiary.rows.length > 0) {
      return res.status(400).json({ 
        error: 'Đã có nhật ký cho ngày hôm nay. Mỗi ngày chỉ được viết một nhật ký.' 
      });
    }
    
    const query = `
      INSERT INTO diary_entries (user_id, title, content, date, created_at)
      VALUES ($1, $2, $3, $4, NOW())
      RETURNING *
    `;
    
    const result = await pool.query(query, [
      userId, title, content, today
    ]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating diary entry:', error);
    res.status(500).json({ error: 'Lỗi tạo nhật ký' });
  }
});

// Lấy tất cả nhật ký của user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const query = `
      SELECT * FROM diary_entries 
      WHERE user_id = $1 
      ORDER BY date DESC
    `;
    
    const result = await pool.query(query, [userId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching diary entries:', error);
    res.status(500).json({ error: 'Lỗi lấy danh sách nhật ký' });
  }
});

// Lấy nhật ký theo ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    const query = 'SELECT * FROM diary_entries WHERE id = $1 AND user_id = $2';
    const result = await pool.query(query, [id, userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy nhật ký' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching diary entry:', error);
    res.status(500).json({ error: 'Lỗi lấy thông tin nhật ký' });
  }
});

// Cập nhật nhật ký (chỉ cho phép trong ngày)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content } = req.body;
    const userId = req.user.id;
    
    // Lấy thông tin nhật ký
    const diaryQuery = 'SELECT * FROM diary_entries WHERE id = $1 AND user_id = $2';
    const diaryResult = await pool.query(diaryQuery, [id, userId]);
    
    if (diaryResult.rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy nhật ký' });
    }
    
    const diary = diaryResult.rows[0];
    const today = new Date().toISOString().split('T')[0];
    
    // Kiểm tra xem nhật ký có phải của hôm nay không
    if (diary.date !== today) {
      return res.status(403).json({ 
        error: 'Không thể chỉnh sửa nhật ký của ngày khác. Nhật ký chỉ có thể chỉnh sửa trong ngày.' 
      });
    }
    
    const updateQuery = `
      UPDATE diary_entries 
      SET title = $1, content = $2, updated_at = NOW()
      WHERE id = $5 AND user_id = $6
      RETURNING *
    `;
    
    const result = await pool.query(updateQuery, [
      title, content, id, userId
    ]);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating diary entry:', error);
    res.status(500).json({ error: 'Lỗi cập nhật nhật ký' });
  }
});

// Xóa nhật ký (chỉ cho phép trong ngày)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    // Lấy thông tin nhật ký
    const diaryQuery = 'SELECT * FROM diary_entries WHERE id = $1 AND user_id = $2';
    const diaryResult = await pool.query(diaryQuery, [id, userId]);
    
    if (diaryResult.rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy nhật ký' });
    }
    
    const diary = diaryResult.rows[0];
    const today = new Date().toISOString().split('T')[0];
    
    // Kiểm tra xem nhật ký có phải của hôm nay không
    if (diary.date !== today) {
      return res.status(403).json({ 
        error: 'Không thể xóa nhật ký của ngày khác. Nhật ký chỉ có thể xóa trong ngày.' 
      });
    }
    
    const deleteQuery = 'DELETE FROM diary_entries WHERE id = $1 AND user_id = $2';
    await pool.query(deleteQuery, [id, userId]);
    
    res.json({ message: 'Đã xóa nhật ký thành công' });
  } catch (error) {
    console.error('Error deleting diary entry:', error);
    res.status(500).json({ error: 'Lỗi xóa nhật ký' });
  }
});

// Lấy nhật ký của hôm nay
router.get('/today/current', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const today = new Date().toISOString().split('T')[0];
    
    const query = 'SELECT * FROM diary_entries WHERE user_id = $1 AND date = $2';
    const result = await pool.query(query, [userId, today]);
    
    res.json(result.rows[0] || null);
  } catch (error) {
    console.error('Error fetching today diary entry:', error);
    res.status(500).json({ error: 'Lỗi lấy nhật ký hôm nay' });
  }
});

module.exports = router; 