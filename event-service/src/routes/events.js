const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// Helper function để lấy user name từ auth database
async function getUserName(userId) {
  try {
    const authPool = require('../config/authDatabase');
    const query = 'SELECT first_name, last_name FROM users WHERE id = $1';
    const result = await authPool.query(query, [userId]);
    
    if (result.rows.length > 0) {
      const user = result.rows[0];
      return `${user.first_name || ''} ${user.last_name || ''}`.trim() || `User ${userId}`;
    }
    return `User ${userId}`;
  } catch (error) {
    console.log('Error fetching user name:', error);
    return `User ${userId}`;
  }
}

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
    const result = await pool.query(query, [parseInt(id), userId]);
    
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

// Lấy tất cả sự kiện công khai 
router.get('/public/all', authenticateToken, async (req, res) => {
  try {
    const query = `
      SELECT e.*,
             ep.user_id as participant_user_id,
             ep.user_name as participant_name,
             ep.joined_at
      FROM events e
      LEFT JOIN event_participants ep ON e.id = ep.event_id
      ORDER BY e.start_date DESC, e.start_time ASC
    `;
    
    const result = await pool.query(query);
    
    // Nhóm sự kiện theo event_id
    const eventsMap = new Map();
    for (const row of result.rows) {
      if (!eventsMap.has(row.id)) {
        const creatorName = await getUserName(row.user_id);
        eventsMap.set(row.id, {
          ...row,
          creator_name: creatorName,
          participants: []
        });
      }
      
      if (row.participant_user_id) {
        eventsMap.get(row.id).participants.push({
          user_id: row.participant_user_id,
          user_name: row.participant_name,
          joined_at: row.joined_at
        });
      }
    }
    
    res.json(Array.from(eventsMap.values()));
  } catch (error) {
    console.error('Error fetching public events:', error);
    res.status(500).json({ error: 'Lỗi lấy danh sách sự kiện công khai' });
  }
});

// Lấy sự kiện mà user đã tham gia (cho calendar)
router.get('/joined', async (req, res) => {
  try {
    console.log('GET /joined called - bypassing auth for testing');
    
    // Tạm thời trả về array rỗng để test routing
    res.json([]);
  } catch (error) {
    console.error('Error fetching joined events:', error);
    res.status(500).json({ error: 'Lỗi lấy danh sách sự kiện đã tham gia' });
  }
});

// Tham gia sự kiện
router.post('/:id/join', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userName = req.user.name || `${req.user.first_name || ''} ${req.user.last_name || ''}`.trim() || `User ${userId}`;
    
    // Kiểm tra sự kiện có tồn tại không
    const eventQuery = 'SELECT * FROM events WHERE id = $1';
    const eventResult = await pool.query(eventQuery, [id]);
    
    if (eventResult.rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy sự kiện' });
    }
    
    // Kiểm tra đã tham gia chưa
    const participantQuery = 'SELECT * FROM event_participants WHERE event_id = $1 AND user_id = $2';
    const participantResult = await pool.query(participantQuery, [id, userId]);
    
    if (participantResult.rows.length > 0) {
      return res.status(400).json({ error: 'Bạn đã tham gia sự kiện này rồi' });
    }
    
    // Thêm vào danh sách tham gia
    const joinQuery = `
      INSERT INTO event_participants (event_id, user_id, user_name, joined_at)
      VALUES ($1, $2, $3, NOW())
      RETURNING *
    `;
    
    await pool.query(joinQuery, [id, userId, userName]);
    
    res.json({ message: 'Đã tham gia sự kiện thành công' });
  } catch (error) {
    console.error('Error joining event:', error);
    res.status(500).json({ error: 'Lỗi tham gia sự kiện' });
  }
});

// Rời khỏi sự kiện
router.delete('/:id/leave', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    // Kiểm tra đã tham gia chưa
    const participantQuery = 'SELECT * FROM event_participants WHERE event_id = $1 AND user_id = $2';
    const participantResult = await pool.query(participantQuery, [id, userId]);
    
    if (participantResult.rows.length === 0) {
      return res.status(400).json({ error: 'Bạn chưa tham gia sự kiện này' });
    }
    
    // Xóa khỏi danh sách tham gia
    const leaveQuery = 'DELETE FROM event_participants WHERE event_id = $1 AND user_id = $2';
    await pool.query(leaveQuery, [id, userId]);
    
    res.json({ message: 'Đã rời khỏi sự kiện thành công' });
  } catch (error) {
    console.error('Error leaving event:', error);
    res.status(500).json({ error: 'Lỗi rời khỏi sự kiện' });
  }
});

// Lấy danh sách người tham gia sự kiện
router.get('/:id/participants', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = 'SELECT * FROM event_participants WHERE event_id = $1 ORDER BY joined_at ASC';
    const result = await pool.query(query, [id]);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching event participants:', error);
    res.status(500).json({ error: 'Lỗi lấy danh sách người tham gia' });
  }
});

module.exports = router; 