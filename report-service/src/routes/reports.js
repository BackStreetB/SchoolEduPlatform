const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// Tạo báo cáo mới
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { 
      title, 
      content, 
      type, 
      subject, 
      grade, 
      semester, 
      academic_year,
      attachments 
    } = req.body;
    const userId = req.user.id;
    
    const query = `
      INSERT INTO reports (
        user_id, title, content, type, subject, grade, semester, 
        academic_year, attachments, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      RETURNING *
    `;
    
    const result = await pool.query(query, [
      userId, title, content, type, subject, grade, semester, 
      academic_year, JSON.stringify(attachments || [])
    ]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating report:', error);
    res.status(500).json({ error: 'Lỗi tạo báo cáo' });
  }
});

// Lấy tất cả báo cáo của user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { type, subject, semester, academic_year, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT * FROM reports 
      WHERE user_id = $1
    `;
    let params = [userId];
    let paramIndex = 2;
    
    // Thêm filters
    if (type) {
      query += ` AND type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }
    
    if (subject) {
      query += ` AND subject = $${paramIndex}`;
      params.push(subject);
      paramIndex++;
    }
    
    if (semester) {
      query += ` AND semester = $${paramIndex}`;
      params.push(semester);
      paramIndex++;
    }
    
    if (academic_year) {
      query += ` AND academic_year = $${paramIndex}`;
      params.push(academic_year);
      paramIndex++;
    }
    
    query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);
    
    const result = await pool.query(query, params);
    
    // Parse attachments JSON
    const reports = result.rows.map(report => ({
      ...report,
      attachments: report.attachments ? JSON.parse(report.attachments) : []
    }));
    
    res.json(reports);
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ error: 'Lỗi lấy danh sách báo cáo' });
  }
});

// Lấy báo cáo theo ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    const query = 'SELECT * FROM reports WHERE id = $1 AND user_id = $2';
    const result = await pool.query(query, [id, userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy báo cáo' });
    }
    
    const report = result.rows[0];
    report.attachments = report.attachments ? JSON.parse(report.attachments) : [];
    
    res.json(report);
  } catch (error) {
    console.error('Error fetching report:', error);
    res.status(500).json({ error: 'Lỗi lấy thông tin báo cáo' });
  }
});

// Cập nhật báo cáo
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      title, 
      content, 
      type, 
      subject, 
      grade, 
      semester, 
      academic_year,
      attachments 
    } = req.body;
    const userId = req.user.id;
    
    // Kiểm tra quyền sở hữu
    const checkQuery = 'SELECT * FROM reports WHERE id = $1 AND user_id = $2';
    const checkResult = await pool.query(checkQuery, [id, userId]);
    
    if (checkResult.rows.length === 0) {
      return res.status(403).json({ error: 'Không có quyền chỉnh sửa báo cáo này' });
    }
    
    const updateQuery = `
      UPDATE reports 
      SET title = $1, content = $2, type = $3, subject = $4, grade = $5, 
          semester = $6, academic_year = $7, attachments = $8, updated_at = NOW()
      WHERE id = $9 AND user_id = $10
      RETURNING *
    `;
    
    const result = await pool.query(updateQuery, [
      title, content, type, subject, grade, semester, 
      academic_year, JSON.stringify(attachments || []), id, userId
    ]);
    
    const report = result.rows[0];
    report.attachments = report.attachments ? JSON.parse(report.attachments) : [];
    
    res.json(report);
  } catch (error) {
    console.error('Error updating report:', error);
    res.status(500).json({ error: 'Lỗi cập nhật báo cáo' });
  }
});

// Xóa báo cáo
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    // Kiểm tra quyền sở hữu
    const checkQuery = 'SELECT * FROM reports WHERE id = $1 AND user_id = $2';
    const checkResult = await pool.query(checkQuery, [id, userId]);
    
    if (checkResult.rows.length === 0) {
      return res.status(403).json({ error: 'Không có quyền xóa báo cáo này' });
    }
    
    await pool.query('DELETE FROM reports WHERE id = $1 AND user_id = $2', [id, userId]);
    res.json({ message: 'Đã xóa báo cáo thành công' });
  } catch (error) {
    console.error('Error deleting report:', error);
    res.status(500).json({ error: 'Lỗi xóa báo cáo' });
  }
});

// Thống kê báo cáo
router.get('/stats/summary', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Tổng số báo cáo
    const totalQuery = 'SELECT COUNT(*) as total FROM reports WHERE user_id = $1';
    const totalResult = await pool.query(totalQuery, [userId]);
    
    // Báo cáo theo loại
    const typeQuery = `
      SELECT type, COUNT(*) as count 
      FROM reports 
      WHERE user_id = $1 
      GROUP BY type
    `;
    const typeResult = await pool.query(typeQuery, [userId]);
    
    // Báo cáo theo môn học
    const subjectQuery = `
      SELECT subject, COUNT(*) as count 
      FROM reports 
      WHERE user_id = $1 
      GROUP BY subject
    `;
    const subjectResult = await pool.query(subjectQuery, [userId]);
    
    // Báo cáo theo học kỳ
    const semesterQuery = `
      SELECT semester, COUNT(*) as count 
      FROM reports 
      WHERE user_id = $1 
      GROUP BY semester
    `;
    const semesterResult = await pool.query(semesterQuery, [userId]);
    
    // Báo cáo gần đây (7 ngày qua)
    const recentQuery = `
      SELECT COUNT(*) as count 
      FROM reports 
      WHERE user_id = $1 
      AND created_at >= NOW() - INTERVAL '7 days'
    `;
    const recentResult = await pool.query(recentQuery, [userId]);
    
    res.json({
      total: parseInt(totalResult.rows[0].total),
      byType: typeResult.rows,
      bySubject: subjectResult.rows,
      bySemester: semesterResult.rows,
      recent: parseInt(recentResult.rows[0].count)
    });
  } catch (error) {
    console.error('Error fetching report stats:', error);
    res.status(500).json({ error: 'Lỗi lấy thống kê báo cáo' });
  }
});

// Tìm kiếm báo cáo
router.get('/search', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { q, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    
    if (!q) {
      return res.status(400).json({ error: 'Từ khóa tìm kiếm không được để trống' });
    }
    
    const query = `
      SELECT * FROM reports 
      WHERE user_id = $1 
      AND (title ILIKE $2 OR content ILIKE $2 OR subject ILIKE $2)
      ORDER BY created_at DESC 
      LIMIT $3 OFFSET $4
    `;
    
    const searchTerm = `%${q}%`;
    const result = await pool.query(query, [userId, searchTerm, limit, offset]);
    
    // Parse attachments JSON
    const reports = result.rows.map(report => ({
      ...report,
      attachments: report.attachments ? JSON.parse(report.attachments) : []
    }));
    
    res.json(reports);
  } catch (error) {
    console.error('Error searching reports:', error);
    res.status(500).json({ error: 'Lỗi tìm kiếm báo cáo' });
  }
});

// Xuất báo cáo PDF (placeholder)
router.get('/:id/export', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    // Kiểm tra báo cáo tồn tại
    const query = 'SELECT * FROM reports WHERE id = $1 AND user_id = $2';
    const result = await pool.query(query, [id, userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy báo cáo' });
    }
    
    // TODO: Implement PDF generation
    res.json({ 
      message: 'Tính năng xuất PDF đang được phát triển',
      report: result.rows[0]
    });
  } catch (error) {
    console.error('Error exporting report:', error);
    res.status(500).json({ error: 'Lỗi xuất báo cáo' });
  }
});

module.exports = router; 