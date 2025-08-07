const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth'); // Added import for authenticateToken

const router = express.Router();

// Register endpoint
router.post('/register', async (req, res) => {
  try {
    const { first_name, last_name, email, password } = req.body;

    // Validate input
    if (!email || !password || !first_name || !last_name) {
      return res.status(400).json({
        success: false,
        message: 'Tất cả các trường là bắt buộc'
      });
    }

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Email đã tồn tại'
      });
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const newUser = await pool.query(
      'INSERT INTO users (email, password_hash, first_name, last_name, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, first_name, last_name, role',
      [email, passwordHash, first_name, last_name, 'student']
    );

    // Generate tokens
    const accessToken = jwt.sign(
      { 
        userId: newUser.rows[0].id, 
        email: newUser.rows[0].email,
        name: `${newUser.rows[0].first_name} ${newUser.rows[0].last_name}`.trim(),
        first_name: newUser.rows[0].first_name,
        last_name: newUser.rows[0].last_name
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
    );

    const refreshToken = jwt.sign(
      { userId: newUser.rows[0].id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
    );

    res.status(201).json({
      success: true,
      message: 'Đăng ký thành công',
      data: {
        user: {
          id: newUser.rows[0].id,
          email: newUser.rows[0].email,
          first_name: newUser.rows[0].first_name,
          last_name: newUser.rows[0].last_name,
          role: newUser.rows[0].role
        },
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server'
    });
  }
});

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email và mật khẩu là bắt buộc'
      });
    }

    // Find user
    const user = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (user.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Email hoặc mật khẩu không đúng'
      });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.rows[0].password_hash);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Email hoặc mật khẩu không đúng'
      });
    }

    // Get updated user info from teacher_profiles if available
    let userInfo = {
      id: user.rows[0].id,
      email: user.rows[0].email,
      first_name: user.rows[0].first_name,
      last_name: user.rows[0].last_name,
      role: user.rows[0].role
    };

    try {
      const teacherQuery = 'SELECT first_name, last_name FROM teacher_profiles WHERE user_id = $1';
      const teacherResult = await pool.query(teacherQuery, [user.rows[0].id]);
      
      if (teacherResult.rows.length > 0) {
        const teacher = teacherResult.rows[0];
        userInfo.first_name = teacher.first_name;
        userInfo.last_name = teacher.last_name;
      }
    } catch (error) {
      console.error('Error fetching teacher profile:', error);
      // Use user info from users table if teacher profile query fails
    }

    // Generate tokens
    const accessToken = jwt.sign(
      { 
        userId: userInfo.id, 
        email: userInfo.email,
        name: `${userInfo.first_name} ${userInfo.last_name}`.trim(),
        first_name: userInfo.first_name,
        last_name: userInfo.last_name
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
    );

    const refreshToken = jwt.sign(
      { userId: userInfo.id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
    );

    res.json({
      success: true,
      message: 'Đăng nhập thành công',
      data: {
        user: userInfo,
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server'
    });
  }
});

// Profile endpoint
router.get('/profile', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Token không hợp lệ'
      });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // First try to get from teacher_profiles (most up-to-date)
    const teacherQuery = 'SELECT user_id as id, first_name, last_name, email FROM teacher_profiles WHERE user_id = $1';
    const teacherResult = await pool.query(teacherQuery, [decoded.userId]);
    
    let userData;
    if (teacherResult.rows.length > 0) {
      const teacher = teacherResult.rows[0];
      userData = {
        id: teacher.id,
        email: teacher.email,
        first_name: teacher.first_name,
        last_name: teacher.last_name,
        role: 'student' // Default role
      };
    } else {
      // Fallback to users table if no teacher profile
      const user = await pool.query(
        'SELECT id, email, first_name, last_name, role, created_at FROM users WHERE id = $1',
        [decoded.userId]
      );

      if (user.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Người dùng không tồn tại'
        });
      }
      userData = user.rows[0];
    }

    res.json({
      success: true,
      data: userData
    });
  } catch (error) {
    console.error('Profile error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Token không hợp lệ'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Lỗi server'
    });
  }
});

// Test endpoint để kiểm tra JWT token
router.get('/test-token', authenticateToken, (req, res) => {
  res.json({
    success: true,
    message: 'Token test successful',
    user: req.user,
    tokenInfo: {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      first_name: req.user.first_name,
      last_name: req.user.last_name
    }
  });
});

module.exports = router; 