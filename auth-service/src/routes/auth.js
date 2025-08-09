const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth'); // Added import for authenticateToken

const router = express.Router();
const crypto = require('crypto');
const nodemailer = require('nodemailer');

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

    // Send welcome/verification email (basic welcome for now)
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: process.env.SMTP_SECURE === 'true',
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      });
      const fromName = process.env.SMTP_FROM_NAME || 'TVD School Platform';
      const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER;
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      await transporter.sendMail({
        from: `${fromName} <${fromEmail}>`,
        to: email,
        subject: 'Chào mừng đến với TVD School Platform',
        html: `
          <div style="font-family:Arial,sans-serif;line-height:1.6">
            <h2>Xin chào ${first_name} ${last_name}</h2>
            <p>Bạn đã đăng ký tài khoản thành công.</p>
            <p>Nhấn vào nút dưới để đăng nhập:</p>
            <p><a href="${frontendUrl}" style="display:inline-block;background:#16a34a;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">Đăng nhập</a></p>
          </div>
        `,
      });
    } catch (mailError) {
      console.error('Send welcome email error:', mailError.message);
    }

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

// Forgot Password - send reset link
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email là bắt buộc' });
    }

    // Find user
    const result = await pool.query('SELECT id, email, first_name, last_name FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      // Avoid user enumeration
      return res.json({ success: true, message: 'Nếu email tồn tại, link đặt lại mật khẩu đã được gửi' });
    }

    const user = result.rows[0];

    // Generate secure reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

    // Store reset token in database
    await pool.query(
      'INSERT INTO password_resets (user_id, token, expires_at, created_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP)',
      [user.id, resetToken, expiresAt]
    );

    // Send email with reset link
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const fromName = process.env.SMTP_FROM_NAME || 'TVD School Platform';
    const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;

    await transporter.sendMail({
      from: `${fromName} <${fromEmail}>`,
      to: user.email,
      subject: 'Đặt lại mật khẩu - TVD School Platform',
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;max-width:600px;margin:0 auto">
          <div style="background:#f8f9fa;padding:20px;border-radius:8px;margin-bottom:20px">
            <h2 style="color:#333;margin:0">TVD School Platform</h2>
          </div>
          
          <h3 style="color:#333">Xin chào ${user.first_name || ''} ${user.last_name || ''}</h3>
          
          <p>Bạn vừa yêu cầu đặt lại mật khẩu cho tài khoản của mình.</p>
          
          <p>Nhấn vào nút bên dưới để đặt lại mật khẩu:</p>
          
          <div style="text-align:center;margin:30px 0">
            <a href="${resetLink}" style="display:inline-block;background:#007bff;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600">
              Đặt lại mật khẩu
            </a>
          </div>
          
          <p><strong>Lưu ý quan trọng:</strong></p>
          <ul>
            <li>Link này chỉ có hiệu lực trong <strong>60 phút</strong></li>
            <li>Link chỉ có thể sử dụng <strong>1 lần</strong></li>
            <li>Nếu bạn không yêu cầu, hãy bỏ qua email này</li>
          </ul>
          
          <p>Nếu nút không hoạt động, copy link này vào trình duyệt:</p>
          <p style="word-break:break-all;background:#f8f9fa;padding:10px;border-radius:4px;font-size:12px">
            ${resetLink}
          </p>
          
          <hr style="margin:30px 0;border:none;border-top:1px solid #eee">
          <p style="color:#666;font-size:12px">
            Email này được gửi tự động. Vui lòng không trả lời email này.
          </p>
        </div>
      `,
    });

    res.json({ success: true, message: 'Nếu email tồn tại, link đặt lại mật khẩu đã được gửi' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

// Reset Password - confirm token and set new password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ success: false, message: 'Thiếu token hoặc mật khẩu mới' });
    }

    const resetResult = await pool.query(
      'SELECT * FROM password_resets WHERE token = $1 AND used = false',
      [token]
    );

    if (resetResult.rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Token không hợp lệ' });
    }

    const reset = resetResult.rows[0];
    if (new Date(reset.expires_at) < new Date()) {
      return res.status(400).json({ success: false, message: 'Token đã hết hạn' });
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    await pool.query('UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [passwordHash, reset.user_id]);
    await pool.query('UPDATE password_resets SET used = true WHERE id = $1', [reset.id]);

    res.json({ success: true, message: 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

// Get current user info
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    
    const userResult = await pool.query(
      'SELECT id, email, first_name, last_name, role, created_at FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Người dùng không tồn tại' 
      });
    }

    const user = userResult.rows[0];
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Get user info error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi server' 
    });
  }
});

// Change Password - authenticated user changes their own password
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id || req.user.userId;
    
    console.log('Change password - User ID from JWT:', userId);
    console.log('Change password - User object:', req.user);

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Mật khẩu hiện tại và mật khẩu mới là bắt buộc' });
    }

    if (newPassword.length < 4) {
      return res.status(400).json({ success: false, message: 'Mật khẩu mới phải có ít nhất 4 ký tự' });
    }

    // Get current user password - check both users and teacher_profiles tables
    let userResult = await pool.query('SELECT password_hash FROM users WHERE id = $1', [userId]);
    
    if (userResult.rows.length === 0) {
      // Check if user exists in teacher_profiles
      const teacherResult = await pool.query('SELECT user_id FROM teacher_profiles WHERE user_id = $1', [userId]);
      if (teacherResult.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Người dùng không tồn tại' });
      }
      // If user exists in teacher_profiles but not in users, create a default password
      const defaultPassword = '123456';
      const defaultHash = await bcrypt.hash(defaultPassword, 10);
      await pool.query('INSERT INTO users (id, email, password_hash, first_name, last_name, role, created_at) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)', 
        [userId, 'user' + userId + '@school.com', defaultHash, 'User', 'Default', 'student']);
      
      // Get the newly created user
      userResult = await pool.query('SELECT password_hash FROM users WHERE id = $1', [userId]);
    }

    // Verify current password
    const isValidCurrentPassword = await bcrypt.compare(currentPassword, userResult.rows[0].password_hash);
    if (!isValidCurrentPassword) {
      return res.status(400).json({ success: false, message: 'Mật khẩu hiện tại không đúng' });
    }

    // Hash new password
    const saltRounds = 10;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await pool.query('UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [newPasswordHash, userId]);

    res.json({ success: true, message: 'Đổi mật khẩu thành công' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

module.exports = router; 