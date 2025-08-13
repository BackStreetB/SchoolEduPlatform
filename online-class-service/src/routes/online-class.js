const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');

// Lấy danh sách lớp học trực tuyến
router.get('/', authenticateToken, async (req, res) => {
  try {
    // Mock data - sau này sẽ lấy từ database
    const onlineClasses = [
      {
        id: 1,
        title: 'Lớp Toán 10A - Chương 1: Mệnh đề và Tập hợp',
        teacher: 'Nguyễn Văn A',
        subject: 'Toán',
        grade: '10A',
        schedule: 'Thứ 2, 4, 6 - 19:00-20:30',
        zoom_meeting_id: '123456789',
        zoom_password: '123456',
        status: 'active',
        next_class: '2025-08-14 19:00:00'
      },
      {
        id: 2,
        title: 'Lớp Văn 11B - Văn học dân gian',
        teacher: 'Trần Thị B',
        subject: 'Văn',
        grade: '11B',
        schedule: 'Thứ 3, 5, 7 - 20:00-21:30',
        zoom_meeting_id: '987654321',
        zoom_password: '654321',
        status: 'active',
        next_class: '2025-08-15 20:00:00'
      }
    ];
    
    res.json(onlineClasses);
  } catch (error) {
    console.error('Error fetching online classes:', error);
    res.status(500).json({ error: 'Lỗi lấy danh sách lớp học' });
  }
});

// Tạo lớp học mới
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { title, subject, grade, schedule, zoom_meeting_id, zoom_password } = req.body;
    const teacher_id = req.user.id;
    
    // Validate required fields
    if (!title || !subject || !grade || !schedule) {
      return res.status(400).json({ error: 'Thiếu thông tin bắt buộc' });
    }
    
    // Mock response - sau này sẽ lưu vào database
    const newClass = {
      id: Date.now(),
      title,
      subject,
      grade,
      schedule,
      zoom_meeting_id: zoom_meeting_id || `ZOOM_${Date.now()}`,
      zoom_password: zoom_password || '123456',
      teacher_id,
      teacher: req.user.name || `${req.user.first_name} ${req.user.last_name}`,
      status: 'active',
      created_at: new Date().toISOString()
    };
    
    res.status(201).json(newClass);
  } catch (error) {
    console.error('Error creating online class:', error);
    res.status(500).json({ error: 'Lỗi tạo lớp học' });
  }
});

// Lấy thông tin lớp học theo ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Mock data - sau này sẽ lấy từ database
    const onlineClass = {
      id: parseInt(id),
      title: 'Lớp Toán 10A - Chương 1: Mệnh đề và Tập hợp',
      teacher: 'Nguyễn Văn A',
      subject: 'Toán',
      grade: '10A',
      schedule: 'Thứ 2, 4, 6 - 19:00-20:30',
      zoom_meeting_id: '123456789',
      zoom_password: '123456',
      status: 'active',
      next_class: '2025-08-14 19:00:00',
      description: 'Học về mệnh đề logic và tập hợp cơ bản',
      materials: [
        { name: 'Slide bài giảng Chương 1', url: '/materials/slide-ch1.pdf' },
        { name: 'Bài tập về nhà', url: '/materials/homework-ch1.pdf' }
      ],
      recordings: [
        { name: 'Buổi 1 - Mệnh đề', url: '/recordings/buoi1-menhde.mp4', duration: '90:00' },
        { name: 'Buổi 2 - Tập hợp', url: '/recordings/buoi2-taphop.mp4', duration: '85:30' }
      ]
    };
    
    res.json(onlineClass);
  } catch (error) {
    console.error('Error fetching online class:', error);
    res.status(500).json({ error: 'Lỗi lấy thông tin lớp học' });
  }
});

// Cập nhật lớp học
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, subject, grade, schedule, zoom_meeting_id, zoom_password, status } = req.body;
    
    // Mock response - sau này sẽ update database
    const updatedClass = {
      id: parseInt(id),
      title: title || 'Lớp Toán 10A - Chương 1: Mệnh đề và Tập hợp',
      subject: subject || 'Toán',
      grade: grade || '10A',
      schedule: schedule || 'Thứ 2, 4, 6 - 19:00-20:30',
      zoom_meeting_id: zoom_meeting_id || '123456789',
      zoom_password: zoom_password || '123456',
      status: status || 'active',
      updated_at: new Date().toISOString()
    };
    
    res.json(updatedClass);
  } catch (error) {
    console.error('Error updating online class:', error);
    res.status(500).json({ error: 'Lỗi cập nhật lớp học' });
  }
});

// Xóa lớp học
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Mock response - sau này sẽ xóa từ database
    res.json({ message: `Đã xóa lớp học ID ${id} thành công` });
  } catch (error) {
    console.error('Error deleting online class:', error);
    res.status(500).json({ error: 'Lỗi xóa lớp học' });
  }
});

// Tham gia lớp học (Zoom)
router.post('/:id/join', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { zoom_meeting_id, zoom_password } = req.body;
    
    // Mock response - sau này sẽ tạo Zoom meeting
    const joinInfo = {
      meeting_id: zoom_meeting_id || '123456789',
      password: zoom_password || '123456',
      join_url: `https://zoom.us/j/${zoom_meeting_id || '123456789'}?pwd=${zoom_password || '123456'}`,
      sdk_key: process.env.ZOOM_SDK_KEY || 'your_zoom_sdk_key',
      signature: 'generated_signature_here',
      timestamp: Date.now()
    };
    
    res.json(joinInfo);
  } catch (error) {
    console.error('Error joining online class:', error);
    res.status(500).json({ error: 'Lỗi tham gia lớp học' });
  }
});

// Lấy danh sách học sinh trong lớp
router.get('/:id/students', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Mock data - sau này sẽ lấy từ database
    const students = [
      { id: 1, name: 'Nguyễn Văn C', email: 'c@school.com', attendance: 'present' },
      { id: 2, name: 'Trần Thị D', email: 'd@school.com', attendance: 'absent' },
      { id: 3, name: 'Lê Văn E', email: 'e@school.com', attendance: 'late' }
    ];
    
    res.json(students);
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ error: 'Lỗi lấy danh sách học sinh' });
  }
});

module.exports = router;
