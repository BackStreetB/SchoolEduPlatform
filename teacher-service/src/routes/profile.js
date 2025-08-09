const express = require('express');
const multer = require('multer');
const path = require('path');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// Tạo connection pool cho auth database
const authPool = new (require('pg').Pool)({
  host: process.env.DB_HOST || 'postgres',
  port: process.env.DB_PORT || 5432,
  database: 'school_auth',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password'
});

// Tạo connection pool cho community database
const communityPool = new (require('pg').Pool)({
  host: process.env.DB_HOST || 'postgres',
  port: process.env.DB_PORT || 5432,
  database: 'school_community',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password'
});

const router = express.Router();

// Function để đồng bộ profile với auth database
const syncProfileWithAuth = async (userId, profileData) => {
  try {
    // Kiểm tra xem có profile trong auth database không
    const checkQuery = 'SELECT * FROM teacher_profiles WHERE user_id = $1';
    const checkResult = await authPool.query(checkQuery, [userId]);
    
    if (checkResult.rows.length > 0) {
      // Cập nhật profile trong auth database
      const updateQuery = `
        UPDATE teacher_profiles 
        SET 
          first_name = $1, last_name = $2, gender = $3, 
          date_of_birth = $4, phone = $5, email = $6, 
          address = $7, subject = $8, education_level = $9,
          current_class = $10, updated_at = NOW()
        WHERE user_id = $11
      `;
      
      await authPool.query(updateQuery, [
        profileData.first_name, profileData.last_name, profileData.gender,
        profileData.date_of_birth, profileData.phone, profileData.email,
        profileData.address, profileData.subject, profileData.education_level,
        profileData.current_class, userId
      ]);
      
      console.log('✅ Profile synced with auth database for user:', userId);
    } else {
      // Tạo profile mới trong auth database
      const insertQuery = `
        INSERT INTO teacher_profiles (
          user_id, first_name, last_name, gender, date_of_birth,
          phone, email, address, subject, education_level,
          current_class, is_verified
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `;
      
      await authPool.query(insertQuery, [
        userId, profileData.first_name, profileData.last_name, profileData.gender,
        profileData.date_of_birth, profileData.phone, profileData.email,
        profileData.address, profileData.subject, profileData.education_level,
        profileData.current_class, false
      ]);
      
      console.log('✅ New profile created in auth database for user:', userId);
    }
  } catch (error) {
    console.error('❌ Error syncing profile with auth database:', error);
    // Không throw error để không ảnh hưởng đến việc cập nhật profile chính
  }
};

// Function để đồng bộ profile với community database
const syncProfileWithCommunity = async (userId, profileData) => {
  try {
    // Kiểm tra xem user đã tồn tại trong community database chưa
    const checkQuery = 'SELECT * FROM users WHERE id = $1';
    const checkResult = await communityPool.query(checkQuery, [userId]);
    
    if (checkResult.rows.length > 0) {
      // Cập nhật thông tin user trong community database
      const updateQuery = `
        UPDATE users 
        SET 
          first_name = $1, 
          last_name = $2, 
          avatar_url = $3,
          updated_at = NOW()
        WHERE id = $4
      `;
      
      await communityPool.query(updateQuery, [
        profileData.first_name, 
        profileData.last_name, 
        profileData.avatar_url || null,
        userId
      ]);
      
      console.log('✅ Profile synced with community database for user:', userId);
    } else {
      // Tạo user mới trong community database
      const insertQuery = `
        INSERT INTO users (id, first_name, last_name, email, avatar_url)
        VALUES ($1, $2, $3, $4, $5)
      `;
      
      await communityPool.query(insertQuery, [
        userId,
        profileData.first_name, 
        profileData.last_name, 
        profileData.email || '',
        profileData.avatar_url || null
      ]);
      
      console.log('✅ New user created in community database for user:', userId);
    }
  } catch (error) {
    console.error('❌ Error syncing profile with community database:', error);
    // Không throw error để không ảnh hưởng đến việc cập nhật profile chính
  }
};

// Cấu hình multer cho upload avatar
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'avatar-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Chỉ cho phép upload hình ảnh!'));
    }
  }
});

// Lấy thông tin profile của user hiện tại
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const query = `
      SELECT * FROM teacher_profiles 
      WHERE user_id = $1
    `;
    
    const result = await pool.query(query, [userId]);
    
    if (result.rows.length === 0) {
      // Trả về profile trống thay vì 404
      return res.json({
        success: true,
        data: {
          user_id: userId,
          first_name: '',
          last_name: '',
          gender: '',
          date_of_birth: '',
          phone: '',
                     email: '',
          address: '',
          subject: '',
          education_level: '',
          avatar_url: '',
          current_class: ''
        }
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi lấy thông tin profile' 
    });
  }
});

// Lấy thông tin profile của user khác (public info)
router.get('/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    const query = `
      SELECT 
        id, user_id, first_name, last_name, 
        subject, education_level, avatar_url,
        current_class, is_verified,
        created_at
      FROM teacher_profiles 
      WHERE user_id = $1
    `;
    
    const result = await pool.query(query, [userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Profile not found' 
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi lấy thông tin profile' 
    });
  }
});

// Tạo hoặc cập nhật profile
router.post('/', authenticateToken, upload.single('avatar'), async (req, res) => {
  try {
    console.log('Profile update request received:', {
      userId: req.user.id,
      body: req.body,
      file: req.file
    });
    
    const userId = req.user.id;
    const {
      first_name,
      last_name,
      gender,
      date_of_birth,
      phone,
      email,
      address,
      subject,
      education_level,
      current_class
    } = req.body;
    
    // Đảm bảo email không null
    if (!email || email.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Email không được để trống'
      });
    }
    
    console.log('Email debug:', {
      emailFromBody: email,
      emailToUse: email
    });
    
    // Kiểm tra profile đã tồn tại chưa
    const checkQuery = 'SELECT * FROM teacher_profiles WHERE user_id = $1';
    const checkResult = await pool.query(checkQuery, [userId]);
    
    let avatarUrl = null;
    if (req.file) {
      avatarUrl = `http://localhost:3006/uploads/${req.file.filename}`;
    }
    
    if (checkResult.rows.length > 0) {
      // Cập nhật profile
      const updateQuery = `
        UPDATE teacher_profiles 
        SET 
          first_name = $1, last_name = $2, gender = $3, 
          date_of_birth = $4, phone = $5, email = $6, 
          address = $7, subject = $8, education_level = $9,
          current_class = $10, updated_at = NOW()
          ${avatarUrl ? ', avatar_url = $11' : ''}
        WHERE user_id = $${avatarUrl ? '12' : '11'}
        RETURNING *
      `;
      
      const params = [
        first_name, last_name, gender, date_of_birth, phone, email,
        address, subject, education_level, current_class
      ];
      
      if (avatarUrl) {
        params.push(avatarUrl, userId);
      } else {
        params.push(userId);
      }
      
      const result = await pool.query(updateQuery, params);
      
      // Đồng bộ với auth database
      await syncProfileWithAuth(userId, {
        first_name, last_name, gender, date_of_birth, phone, email,
        address, subject, education_level, current_class
      });
      
      // Đồng bộ với community database
      await syncProfileWithCommunity(userId, {
        first_name, last_name, email, avatar_url: avatarUrl
      });
      
      res.json({
        success: true,
        message: 'Cập nhật profile thành công',
        data: result.rows[0]
      });
    } else {
      // Tạo profile mới
      const insertQuery = `
        INSERT INTO teacher_profiles (
          user_id, first_name, last_name, gender, date_of_birth,
          phone, email, address, subject, education_level,
          avatar_url, current_class
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `;
      
      const result = await pool.query(insertQuery, [
        userId, first_name, last_name, gender, date_of_birth,
        phone, email, address, subject, education_level,
        avatarUrl, current_class
      ]);
      
      // Đồng bộ với auth database
      await syncProfileWithAuth(userId, {
        first_name, last_name, gender, date_of_birth, phone, email,
        address, subject, education_level, current_class
      });
      
      // Đồng bộ với community database
      await syncProfileWithCommunity(userId, {
        first_name, last_name, email, avatar_url: avatarUrl
      });
      
      res.status(201).json({
        success: true,
        message: 'Tạo profile thành công',
        data: result.rows[0]
      });
    }
  } catch (error) {
    console.error('Error creating/updating profile:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi tạo/cập nhật profile' 
    });
  }
});

module.exports = router; 