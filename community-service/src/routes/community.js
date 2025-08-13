const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const Post = require('../models/Post');

// Middleware để disable cache cho tất cả routes
router.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.set('Expires', '0');
  res.set('Pragma', 'no-cache');
  next();
});

// Function để xóa file media
const deleteMediaFile = (fileName) => {
  try {
    const filePath = path.join(__dirname, '../../uploads', fileName);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`✅ Đã xóa file: ${fileName}`);
      return true;
    } else {
      console.log(`⚠️  File không tồn tại: ${fileName}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Lỗi xóa file ${fileName}:`, error.message);
    return false;
  }
};

// Cấu hình multer cho upload file
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 20 * 1024 * 1024 // 20MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|mp4|avi|mov|wmv/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Chỉ cho phép upload hình ảnh hoặc video!'));
    }
  }
});

// Hàm kiểm duyệt nội dung
const moderateContent = (content) => {
  const sensitiveWords = [
    'đụ', 'địt', 'đéo', 'đcm', 'đm', 'đmẹ', 'đmá', 'đmá', 'đcm', 'đcm', 'đcm',
    'chết', 'giết', 'sát', 'máu', 'máu me', 'chết tiệt', 'chết mẹ', 'chết cha',
    'phản động', 'chống đảng', 'chống nhà nước', 'lật đổ', 'cách mạng',
    'biểu tình', 'phản kháng', 'nổi loạn', 'bạo động', 'khủng bố',
    'đánh bom', 'nổ', 'súng', 'dao', 'vũ khí', 'ma túy', 'heroin', 'cocaine',
    'mại dâm', 'gái gọi', 'gái điếm', 'trai bao', 'đĩ', 'điếm', 'gái',
    'ngu', 'ngu ngốc', 'đần', 'đần độn', 'ngu si', 'ngu xuẩn',
    'khốn', 'khốn nạn', 'đồ khốn', 'đồ khốn nạn', 'đồ chó', 'đồ chó má',
    'cặc', 'lồn', 'cu', 'buồi', 'dái', 'dick', 'pussy', 'vagina', 'penis'
  ];
  
  const contentLower = content.toLowerCase();
  const foundWords = sensitiveWords.filter(word => 
    contentLower.includes(word.toLowerCase())
  );
  
  return {
    isSensitive: foundWords.length > 0,
    foundWords: foundWords
  };
};

// Tạo bài viết mới
router.post('/', authenticateToken, upload.array('media'), async (req, res) => {
  try {
    const { content } = req.body;
    const userId = req.user.id;
    const mediaFiles = req.files || [];
    
    // Kiểm duyệt nội dung
    const moderation = moderateContent(content);
    if (moderation.isSensitive) {
      return res.status(400).json({ 
        error: 'Chủ đề mang tính nhạy cảm, xin hãy cân nhắc trước khi chia sẻ',
        foundWords: moderation.foundWords
      });
    }
    
    // Tạo bài viết
    const postQuery = `
      INSERT INTO posts (user_id, content, privacy, created_at)
      VALUES ($1, $2, 'public', NOW())
      RETURNING *
    `;
    
    const postResult = await pool.query(postQuery, [userId, content]);
    const post = postResult.rows[0];
    
    if (!post || !post.id) {
      console.error('Failed to create post:', postResult);
      return res.status(500).json({ error: 'Lỗi tạo bài viết - không thể lưu vào database' });
    }
    
    console.log('Created post:', post);
    
    // Lưu media files
    if (mediaFiles.length > 0) {
      for (const file of mediaFiles) {
        const mediaQuery = `
          INSERT INTO post_media (post_id, file_path, file_type, file_name)
          VALUES ($1, $2, $3, $4)
        `;
        
        const fileType = file.mimetype.startsWith('image/') ? 'image' : 'video';
        await pool.query(mediaQuery, [
          post.id, 
          file.path, 
          fileType, 
          file.filename
        ]);
      }
    }
    
    // Lấy bài viết với media
    const fullPostQuery = `
      SELECT 
        p.*,
        json_agg(
          json_build_object(
            'id', pm.id,
            'file_path', pm.file_path,
            'file_type', pm.file_type,
            'file_name', pm.file_name
          )
        ) as media
      FROM posts p
      LEFT JOIN post_media pm ON p.id = pm.post_id
      WHERE p.id = $1
      GROUP BY p.id
    `;
    
    const fullPostResult = await pool.query(fullPostQuery, [post.id]);
    
    // Thêm thông tin user từ request
    const postWithUser = {
      ...fullPostResult.rows[0],
      author_name: req.user.name || `User ${req.user.id}`,
      author_email: req.user.email || '',
      author_avatar: req.user.avatar_url || null
    };
    
    res.status(201).json(postWithUser);
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ error: 'Lỗi tạo bài viết' });
  }
});

// Lấy tất cả bài viết (public và của user)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    
    console.log('Current user from JWT:', req.user);
    console.log('User ID:', userId);
    console.log('User name from JWT:', req.user.name);
    
    const query = `
      SELECT 
        p.*,
        json_agg(
          json_build_object(
            'id', pm.id,
            'file_path', pm.file_path,
            'file_type', pm.file_type,
            'file_name', pm.file_name
          )
        ) as media,
        COUNT(DISTINCT r.id) as reaction_count,
        COUNT(DISTINCT c.id) as comment_count,
        ur.type as user_reaction
      FROM posts p
      LEFT JOIN post_media pm ON p.id = pm.post_id
      LEFT JOIN reactions r ON p.id = r.post_id
      LEFT JOIN comments c ON p.id = c.post_id
      LEFT JOIN reactions ur ON p.id = ur.post_id AND ur.user_id = $1
      WHERE p.privacy = 'public' OR p.user_id = $1
      GROUP BY p.id, ur.type
      ORDER BY p.created_at DESC
      LIMIT $2 OFFSET $3
    `;
    
    const result = await pool.query(query, [userId, limit, offset]);
    
    // Xử lý media files và thêm thông tin user
    console.log('Current user:', req.user);
    console.log('User ID:', userId);
    
    // Fetch comments for each post
    const postsWithComments = await Promise.all(result.rows.map(async (post) => {
      // Get author name from JWT or fallback to user ID
      let authorName = `User ${post.user_id}`;
      let authorAvatar = null;
      
      // If this is the current user's post, use their info from JWT
      if (post.user_id === userId && req.user.name) {
        authorName = req.user.name;
      } else {
        // For other users, try to get from auth database
        try {
          const { Pool } = require('pg');
          const authPool = new Pool({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 5432,
            database: 'school_auth',
            user: process.env.DB_USER || 'postgres',
            password: process.env.DB_PASSWORD || 'password'
          });
          
          const userQuery = 'SELECT first_name, last_name FROM users WHERE id = $1';
          const userResult = await authPool.query(userQuery, [post.user_id]);
          
          if (userResult.rows.length > 0) {
            const user = userResult.rows[0];
            authorName = `${user.first_name} ${user.last_name}`.trim();
          }
          
          await authPool.end();
        } catch (error) {
          console.error(`Error fetching user info for post ${post.id}:`, error);
          // Keep fallback to User ID
        }
      }
      
      console.log(`Post ${post.id}: user_id=${post.user_id}, author_name=${authorName}, user_reaction=${post.user_reaction}`);
      
      // Fetch comments for this post
      let comments = [];
      try {
        const commentsQuery = `
          SELECT c.* FROM comments c
          WHERE c.post_id = $1
          ORDER BY c.created_at ASC
        `;
        
        const commentsResult = await pool.query(commentsQuery, [post.id]);
        
        // Get author names for each comment
        comments = await Promise.all(commentsResult.rows.map(async (comment) => {
          let authorName = `User ${comment.user_id}`;
          
          // If this is the current user's comment, use their info from JWT
          if (comment.user_id === userId && req.user.name) {
            authorName = req.user.name;
          } else {
            // For other users, try to get from auth database
            try {
              const { Pool } = require('pg');
              const authPool = new Pool({
                host: process.env.DB_HOST || 'localhost',
                port: process.env.DB_PORT || 5432,
                database: 'school_auth',
                user: process.env.DB_USER || 'postgres',
                password: process.env.DB_PASSWORD || 'password'
              });
              
              const userQuery = 'SELECT first_name, last_name FROM users WHERE id = $1';
              const userResult = await authPool.query(userQuery, [comment.user_id]);
              
              if (userResult.rows.length > 0) {
                const user = userResult.rows[0];
                authorName = `${user.first_name} ${user.last_name}`.trim();
              }
              
              await authPool.end();
            } catch (error) {
              console.error(`Error fetching user info for comment ${comment.id}:`, error);
              // Keep fallback to User ID
            }
          }
          
          return {
            ...comment,
            author_name: authorName
          };
        }));
      } catch (error) {
        console.error(`Error fetching comments for post ${post.id}:`, error);
        // Fallback: get comments without user info
        try {
          const fallbackQuery = `
            SELECT * FROM comments 
            WHERE post_id = $1 
            ORDER BY created_at ASC
          `;
          const fallbackResult = await pool.query(fallbackQuery, [post.id]);
          comments = fallbackResult.rows.map(comment => ({
            ...comment,
            author_name: `User ${comment.user_id}`
          }));
        } catch (fallbackError) {
          console.error(`Fallback error fetching comments for post ${post.id}:`, fallbackError);
        }
      }
      
      return {
        ...post,
        media: post.media[0] ? post.media : [],
        author_name: authorName,
        author_avatar: authorAvatar,
        author_email: post.user_id === userId ? (req.user.email || '') : '',
        userReaction: post.user_reaction || null,
        comments: comments
      };
    }));
    
    const posts = postsWithComments;
    
    res.json(posts);
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ error: 'Lỗi lấy danh sách bài viết' });
  }
});

// Lấy bài viết theo ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    const query = `
      SELECT 
        p.*,
        u.name as author_name,
        u.email as author_email,
        json_agg(
          json_build_object(
            'id', pm.id,
            'file_path', pm.file_path,
            'file_type', pm.file_type,
            'file_name', pm.file_name
          )
        ) as media,
        COUNT(r.id) as reaction_count,
        COUNT(c.id) as comment_count
      FROM posts p
      LEFT JOIN users u ON p.user_id = u.id
      LEFT JOIN post_media pm ON p.id = pm.post_id
      LEFT JOIN reactions r ON p.id = r.post_id
      LEFT JOIN comments c ON p.id = c.post_id
      WHERE p.id = $1 AND (p.privacy = 'public' OR p.user_id = $2)
      GROUP BY p.id, u.name, u.email
    `;
    
    const result = await pool.query(query, [id, userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy bài viết' });
    }
    
    const post = result.rows[0];
    post.media = post.media[0] ? post.media : [];
    
    res.json(post);
  } catch (error) {
    console.error('Error fetching post:', error);
    res.status(500).json({ error: 'Lỗi lấy thông tin bài viết' });
  }
});

// Cập nhật bài viết
router.put('/:id', authenticateToken, upload.array('media'), async (req, res) => {
  try {
    const { id } = req.params;
    const { content, existing_media } = req.body;
    const userId = req.user.id;
    const mediaFiles = req.files || [];
    
    // Kiểm tra quyền sở hữu
    const checkQuery = 'SELECT * FROM posts WHERE id = $1 AND user_id = $2';
    const checkResult = await pool.query(checkQuery, [id, userId]);
    
    if (checkResult.rows.length === 0) {
      return res.status(403).json({ error: 'Không có quyền chỉnh sửa bài viết này' });
    }
    
    // Kiểm duyệt nội dung
    const moderation = moderateContent(content);
    if (moderation.isSensitive) {
      return res.status(400).json({ 
        error: 'Chủ đề mang tính nhạy cảm, xin hãy cân nhắc trước khi chia sẻ',
        foundWords: moderation.foundWords
      });
    }
    
    // Cập nhật nội dung bài viết
    const updateQuery = `
      UPDATE posts 
      SET content = $1, updated_at = NOW()
      WHERE id = $2 AND user_id = $3
      RETURNING *
    `;
    
    const result = await pool.query(updateQuery, [content, id, userId]);
    const post = result.rows[0];
    
    // Xử lý media cũ - xóa những media không còn trong danh sách
    if (existing_media !== undefined) {
      let existingMediaIds = [];
      
      // Kiểm tra nếu existing_media không rỗng
      if (existing_media && existing_media.trim() !== '') {
        try {
          existingMediaIds = JSON.parse(existing_media);
          console.log(`📋 Existing media IDs:`, existingMediaIds);
        } catch (parseError) {
          console.error('❌ Error parsing existing_media:', parseError);
          existingMediaIds = [];
        }
      }
      
      // Lấy tất cả media hiện tại của post
      const currentMediaQuery = 'SELECT * FROM post_media WHERE post_id = $1';
      const currentMediaResult = await pool.query(currentMediaQuery, [id]);
      const currentMedia = currentMediaResult.rows;
      
      console.log(`📋 Current media in DB:`, currentMedia);
      
      // Tìm media cần xóa (có trong DB nhưng không có trong existing_media)
      const mediaToDelete = currentMedia.filter(media => 
        !existingMediaIds.includes(media.id)
      );
      
      // Xóa files trên disk cho media bị loại bỏ
      console.log(`🗑️  Xóa ${mediaToDelete.length} media files bị loại bỏ`);
      for (const media of mediaToDelete) {
        const deleted = deleteMediaFile(media.file_name);
        if (deleted) {
          console.log(`✅ Đã xóa file: ${media.file_name}`);
        } else {
          console.log(`⚠️  Không thể xóa file: ${media.file_name}`);
        }
      }
      
      // Lưu thông tin media được giữ lại trước khi xóa
      let mediaToKeep = [];
      if (existingMediaIds.length > 0) {
        const getMediaQuery = 'SELECT * FROM post_media WHERE id = ANY($1)';
        const mediaResult = await pool.query(getMediaQuery, [existingMediaIds]);
        mediaToKeep = mediaResult.rows;
        console.log(`📋 Media được giữ lại:`, mediaToKeep);
      }
      
      // Xóa tất cả media cũ khỏi DB
      await pool.query('DELETE FROM post_media WHERE post_id = $1', [id]);
      
      // Thêm lại những media được giữ lại
      if (mediaToKeep.length > 0) {
        for (const media of mediaToKeep) {
          const reinsertQuery = `
            INSERT INTO post_media (post_id, file_path, file_type, file_name)
            VALUES ($1, $2, $3, $4)
          `;
          await pool.query(reinsertQuery, [
            id, media.file_path, media.file_type, media.file_name
          ]);
        }
        console.log(`✅ Đã giữ lại ${mediaToKeep.length} media`);
      } else {
        console.log(`🗑️  Đã xóa tất cả media của post ${id}`);
      }
    }
    
    // Lưu media files mới nếu có
    if (mediaFiles.length > 0) {
      for (const file of mediaFiles) {
        const mediaQuery = `
          INSERT INTO post_media (post_id, file_path, file_type, file_name)
          VALUES ($1, $2, $3, $4)
        `;
        
        const fileType = file.mimetype.startsWith('image/') ? 'image' : 'video';
        await pool.query(mediaQuery, [
          post.id, 
          file.path, 
          fileType, 
          file.filename
        ]);
      }
      console.log(`✅ Đã thêm ${mediaFiles.length} media mới`);
    }
    
    // Lấy bài viết với media
    const fullPostQuery = `
      SELECT 
        p.id,
        p.content,
        p.user_id,
        p.privacy,
        p.created_at,
        p.updated_at,
        COALESCE(
          json_agg(
            CASE 
              WHEN pm.id IS NOT NULL THEN
                json_build_object(
                  'id', pm.id,
                  'file_path', pm.file_path,
                  'file_type', pm.file_type,
                  'file_name', pm.file_name
                )
              ELSE NULL
            END
          ) FILTER (WHERE pm.id IS NOT NULL),
          '[]'::json
        ) as media
      FROM posts p
      LEFT JOIN post_media pm ON p.id = pm.post_id
      WHERE p.id = $1
      GROUP BY p.id, p.content, p.user_id, p.privacy, p.created_at, p.updated_at
    `;
    
    const fullPostResult = await pool.query(fullPostQuery, [post.id]);
    
    // Thêm thông tin user từ request
    const postWithUser = {
      ...fullPostResult.rows[0],
      author_name: req.user.name || `User ${req.user.id}`,
      author_email: req.user.email || '',
      author_avatar: req.user.avatar_url || null
    };
    
    res.json(postWithUser);
  } catch (error) {
    console.error('Error updating post:', error);
    res.status(500).json({ error: 'Lỗi cập nhật bài viết' });
  }
});

// Xóa bài viết
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    // Kiểm tra quyền sở hữu
    const checkQuery = 'SELECT * FROM posts WHERE id = $1 AND user_id = $2';
    const checkResult = await pool.query(checkQuery, [id, userId]);
    
    if (checkResult.rows.length === 0) {
      return res.status(403).json({ error: 'Không có quyền xóa bài viết này' });
    }
    
    // Lấy danh sách media files trước khi xóa
    const mediaQuery = 'SELECT file_name FROM post_media WHERE post_id = $1';
    const mediaResult = await pool.query(mediaQuery, [id]);
    const mediaFiles = mediaResult.rows.map(row => row.file_name);
    
    // Xóa reactions, comments, media trước
    await pool.query('DELETE FROM reactions WHERE post_id = $1', [id]);
    await pool.query('DELETE FROM comments WHERE post_id = $1', [id]);
    await pool.query('DELETE FROM post_media WHERE post_id = $1', [id]);
    
    // Xóa bài viết
    await pool.query('DELETE FROM posts WHERE id = $1 AND user_id = $2', [id, userId]);
    
    // Xóa files trên disk
    console.log(`🗑️  Xóa ${mediaFiles.length} media files cho post ${id}`);
    mediaFiles.forEach(fileName => {
      deleteMediaFile(fileName);
    });
    
    res.json({ message: 'Đã xóa bài viết thành công' });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({ error: 'Lỗi xóa bài viết' });
  }
});

// Thêm reaction (like, love, haha, wow, sad, angry)
router.post('/:id/reactions', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { type = 'like' } = req.body;
    const userId = req.user.id;
    
    // Kiểm tra bài viết tồn tại
    const postQuery = 'SELECT * FROM posts WHERE id = $1';
    const postResult = await pool.query(postQuery, [id]);
    
    if (postResult.rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy bài viết' });
    }
    
    // Xóa reaction cũ nếu có
    await pool.query('DELETE FROM reactions WHERE post_id = $1 AND user_id = $2', [id, userId]);
    
    // Thêm reaction mới
    const reactionQuery = `
      INSERT INTO reactions (post_id, user_id, type, created_at)
      VALUES ($1, $2, $3, NOW())
      RETURNING *
    `;
    
    const result = await pool.query(reactionQuery, [id, userId, type]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error adding reaction:', error);
    res.status(500).json({ error: 'Lỗi thêm reaction' });
  }
});

// Xóa reaction
router.delete('/:id/reactions', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    await pool.query('DELETE FROM reactions WHERE post_id = $1 AND user_id = $2', [id, userId]);
    res.json({ message: 'Đã xóa reaction' });
  } catch (error) {
    console.error('Error removing reaction:', error);
    res.status(500).json({ error: 'Lỗi xóa reaction' });
  }
});

// Thêm comment
router.post('/:id/comments', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const userId = req.user.id;
    
    // Kiểm tra bài viết tồn tại
    const postQuery = 'SELECT * FROM posts WHERE id = $1';
    const postResult = await pool.query(postQuery, [id]);
    
    if (postResult.rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy bài viết' });
    }
    
    const commentQuery = `
      INSERT INTO comments (post_id, user_id, content, created_at)
      VALUES ($1, $2, $3, NOW())
      RETURNING *
    `;
    
    const result = await pool.query(commentQuery, [id, userId, content]);
    
    // Lấy thông tin user của comment từ teacher_profiles
    let authorName = `User ${userId}`;
    let authorEmail = '';
    
    try {
      // Try to get from teacher_profiles first
      const teacherQuery = 'SELECT first_name, last_name FROM teacher_profiles WHERE user_id = $1';
      const teacherResult = await pool.query(teacherQuery, [userId]);
      
      if (teacherResult.rows.length > 0) {
        const teacher = teacherResult.rows[0];
        authorName = `${teacher.first_name} ${teacher.last_name}`.trim();
      } else {
        // Fallback to users table
        const userQuery = 'SELECT first_name, last_name, email FROM users WHERE id = $1';
        const userResult = await pool.query(userQuery, [userId]);
        
        if (userResult.rows.length > 0) {
          const user = userResult.rows[0];
          authorName = user.first_name && user.last_name ? 
            `${user.first_name} ${user.last_name}`.trim() : 
            `User ${userId}`;
          authorEmail = user.email || '';
        }
      }
    } catch (error) {
      console.error('Error fetching user info for comment:', error);
      // Fallback to JWT user data
      authorName = req.user.name || `User ${userId}`;
      authorEmail = req.user.email || '';
    }
    
    const comment = {
      ...result.rows[0],
      author_name: authorName,
      author_email: authorEmail
    };
    
    res.status(201).json(comment);
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ error: 'Lỗi thêm comment' });
  }
});

// Lấy comments của bài viết
router.get('/:id/comments', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    
    let result;
    try {
      const query = `
        SELECT c.* FROM comments c
        WHERE c.post_id = $1
        ORDER BY c.created_at ASC
        LIMIT $2 OFFSET $3
      `;
      
      result = await pool.query(query, [id, limit, offset]);
      
      // Get author names from teacher_profiles for each comment
      const processedRows = await Promise.all(result.rows.map(async (comment) => {
        let authorName = `User ${comment.user_id}`;
        
        try {
          // Try to get from teacher_profiles first
          const teacherQuery = 'SELECT first_name, last_name FROM teacher_profiles WHERE user_id = $1';
          const teacherResult = await pool.query(teacherQuery, [comment.user_id]);
          
          if (teacherResult.rows.length > 0) {
            const teacher = teacherResult.rows[0];
            authorName = `${teacher.first_name} ${teacher.last_name}`.trim();
          } else {
            // Fallback to users table
            const userQuery = 'SELECT first_name, last_name FROM users WHERE id = $1';
            const userResult = await pool.query(userQuery, [comment.user_id]);
            
            if (userResult.rows.length > 0) {
              const user = userResult.rows[0];
              authorName = user.first_name && user.last_name ? 
                `${user.first_name} ${user.last_name}`.trim() : 
                `User ${comment.user_id}`;
            }
          }
        } catch (error) {
          console.error(`Error fetching user info for comment ${comment.id}:`, error);
        }
        
        return {
          ...comment,
          author_name: authorName
        };
      }));
      
      res.json(processedRows);
    } catch (error) {
      console.error('Error fetching comments with user info:', error);
      // Fallback: get comments without user info
      const fallbackQuery = `
        SELECT 
          c.*,
          'User ' || c.user_id as author_name,
          '' as author_email
        FROM comments c
        WHERE c.post_id = $1
        ORDER BY c.created_at ASC
        LIMIT $2 OFFSET $3
      `;
      
      result = await pool.query(fallbackQuery, [id, limit, offset]);
      res.json(result.rows);
    }
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ error: 'Lỗi lấy danh sách comments' });
  }
});

// Cập nhật comment
router.put('/comments/:commentId', authenticateToken, async (req, res) => {
  try {
    const { commentId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;
    
    // Kiểm tra quyền sở hữu
    const checkQuery = 'SELECT * FROM comments WHERE id = $1 AND user_id = $2';
    const checkResult = await pool.query(checkQuery, [commentId, userId]);
    
    if (checkResult.rows.length === 0) {
      return res.status(403).json({ error: 'Không có quyền chỉnh sửa comment này' });
    }
    
    // Kiểm duyệt nội dung
    const moderation = moderateContent(content);
    if (moderation.isSensitive) {
      return res.status(400).json({ 
        error: 'Nội dung chứa từ ngữ không phù hợp',
        foundWords: moderation.foundWords
      });
    }
    
    // Cập nhật comment
    const updateQuery = `
      UPDATE comments 
      SET content = $1, updated_at = NOW()
      WHERE id = $2 AND user_id = $3
      RETURNING *
    `;
    
    const result = await pool.query(updateQuery, [content, commentId, userId]);
    
    // Lấy thông tin user của comment
    let authorName = `User ${userId}`;
    
    try {
      // Try to get from teacher_profiles first
      const teacherQuery = 'SELECT first_name, last_name FROM teacher_profiles WHERE user_id = $1';
      const teacherResult = await pool.query(teacherQuery, [userId]);
      
      if (teacherResult.rows.length > 0) {
        const teacher = teacherResult.rows[0];
        authorName = `${teacher.first_name} ${teacher.last_name}`.trim();
      } else {
        // Fallback to users table
        const userQuery = 'SELECT first_name, last_name FROM users WHERE id = $1';
        const userResult = await pool.query(userQuery, [userId]);
        
        if (userResult.rows.length > 0) {
          const user = userResult.rows[0];
          authorName = user.first_name && user.last_name ? 
            `${user.first_name} ${user.last_name}`.trim() : 
            `User ${userId}`;
        }
      }
    } catch (error) {
      console.error('Error fetching user info for comment:', error);
      authorName = req.user.name || `User ${userId}`;
    }
    
    const updatedComment = {
      ...result.rows[0],
      author_name: authorName
    };
    
    res.json(updatedComment);
  } catch (error) {
    console.error('Error updating comment:', error);
    res.status(500).json({ error: 'Lỗi cập nhật comment' });
  }
});

// Xóa comment
router.delete('/comments/:commentId', authenticateToken, async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user.id;
    
    // Kiểm tra quyền sở hữu
    const checkQuery = 'SELECT * FROM comments WHERE id = $1 AND user_id = $2';
    const checkResult = await pool.query(checkQuery, [commentId, userId]);
    
    if (checkResult.rows.length === 0) {
      return res.status(403).json({ error: 'Không có quyền xóa comment này' });
    }
    
    await pool.query('DELETE FROM comments WHERE id = $1 AND user_id = $2', [commentId, userId]);
    
    res.json({ message: 'Đã xóa comment thành công' });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ error: 'Lỗi xóa comment' });
  }
});

// Test endpoint để kiểm tra JWT token
router.get('/test-auth', authenticateToken, (req, res) => {
  res.json({
    message: 'Auth test successful',
    user: req.user
  });
});

// Lấy chi tiết reactions của bài viết
router.get('/:id/reactions', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Lấy thống kê reactions
    const statsQuery = `
      SELECT 
        type,
        COUNT(*) as count
      FROM reactions 
      WHERE post_id = $1 
      GROUP BY type
    `;
    
    const statsResult = await pool.query(statsQuery, [id]);
    const stats = {};
    statsResult.rows.forEach(row => {
      stats[row.type] = parseInt(row.count);
    });
    
    // Lấy danh sách user reactions với thông tin user
    const reactionsQuery = `
      SELECT 
        r.*,
        u.first_name,
        u.last_name,
        tp.avatar_url
      FROM reactions r
      LEFT JOIN users u ON r.user_id = u.id
      LEFT JOIN teacher_profiles tp ON r.user_id = tp.user_id
      WHERE r.post_id = $1
      ORDER BY r.created_at DESC
    `;
    
    const reactionsResult = await pool.query(reactionsQuery, [id]);
    
    const reactions = reactionsResult.rows.map(reaction => ({
      id: reaction.id,
      type: reaction.type,
      created_at: reaction.created_at,
      user_id: reaction.user_id,
      user_name: reaction.first_name && reaction.last_name ? 
        `${reaction.first_name} ${reaction.last_name}`.trim() : 
        `User ${reaction.user_id}`,
      user_avatar: reaction.avatar_url
    }));
    
    res.json({
      reactions: reactions,
      stats: stats
    });
  } catch (error) {
    console.error('Error fetching reaction details:', error);
    res.status(500).json({ error: 'Lỗi lấy chi tiết reactions' });
  }
});

// Cập nhật comment
router.put('/comments/:commentId', authenticateToken, async (req, res) => {
  try {
    const { commentId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;
    
    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Nội dung comment không được để trống' });
    }
    
    // Kiểm tra comment tồn tại và thuộc về user
    const checkQuery = 'SELECT * FROM comments WHERE id = $1 AND user_id = $2';
    const checkResult = await pool.query(checkQuery, [commentId, userId]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy comment hoặc không có quyền chỉnh sửa' });
    }
    
    // Cập nhật comment
    const updateQuery = `
      UPDATE comments 
      SET content = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND user_id = $3
      RETURNING *
    `;
    
    const result = await pool.query(updateQuery, [content.trim(), commentId, userId]);
    
    // Lấy thông tin author
    let authorName = `User ${userId}`;
    let authorEmail = '';
    
    try {
      // Try to get from teacher_profiles first
      const teacherQuery = 'SELECT first_name, last_name FROM teacher_profiles WHERE user_id = $1';
      const teacherResult = await pool.query(teacherQuery, [userId]);
      
      if (teacherResult.rows.length > 0) {
        const teacher = teacherResult.rows[0];
        authorName = `${teacher.first_name} ${teacher.last_name}`.trim();
      } else {
        // Fallback to users table
        const userQuery = 'SELECT first_name, last_name, email FROM users WHERE id = $1';
        const userResult = await pool.query(userQuery, [userId]);
        
        if (userResult.rows.length > 0) {
          const user = userResult.rows[0];
          authorName = user.first_name && user.last_name ? 
            `${user.first_name} ${user.last_name}`.trim() : 
            `User ${userId}`;
          authorEmail = user.email || '';
        }
      }
    } catch (error) {
      console.error('Error fetching user info for updated comment:', error);
      authorName = req.user.name || `User ${userId}`;
      authorEmail = req.user.email || '';
    }
    
    const updatedComment = {
      ...result.rows[0],
      author_name: authorName,
      author_email: authorEmail
    };
    
    res.json(updatedComment);
  } catch (error) {
    console.error('Error updating comment:', error);
    res.status(500).json({ error: 'Lỗi cập nhật comment' });
  }
});

// Xóa comment
router.delete('/comments/:commentId', authenticateToken, async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user.id;
    
    // Kiểm tra comment tồn tại và thuộc về user
    const checkQuery = 'SELECT * FROM comments WHERE id = $1 AND user_id = $2';
    const checkResult = await pool.query(checkQuery, [commentId, userId]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy comment hoặc không có quyền xóa' });
    }
    
    // Xóa comment
    const deleteQuery = 'DELETE FROM comments WHERE id = $1 AND user_id = $2 RETURNING *';
    const result = await pool.query(deleteQuery, [commentId, userId]);
    
    res.json({ 
      message: 'Đã xóa comment thành công',
      deletedComment: result.rows[0]
    });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ error: 'Lỗi xóa comment' });
  }
});

// Serve uploaded files - moved to index.js for public access

module.exports = router; 