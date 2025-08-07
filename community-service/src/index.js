const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const { initDatabase } = require('./config/database');
const communityRoutes = require('./routes/community');
const { authenticateToken } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3004;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
const uploadPath = process.env.UPLOAD_PATH || './uploads';
app.use('/uploads', express.static(path.join(__dirname, '..', uploadPath), {
  setHeaders: (res, path) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range');
    
    // MIME types
    if (path.endsWith('.mp4')) {
      res.setHeader('Content-Type', 'video/mp4');
    } else if (path.endsWith('.jpg') || path.endsWith('.jpeg')) {
      res.setHeader('Content-Type', 'image/jpeg');
    } else if (path.endsWith('.png')) {
      res.setHeader('Content-Type', 'image/png');
    }
    
    // Cache headers
    res.setHeader('Cache-Control', 'public, max-age=31536000');
  }
}));

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    service: 'community-service',
    timestamp: new Date().toISOString()
  });
});

// Test route for media files
app.get('/test-media/:filename', (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(__dirname, '..', uploadPath, filename);
  
  console.log('Testing media file:', filename);
  console.log('File path:', filePath);
  
  if (require('fs').existsSync(filePath)) {
    console.log('File exists!');
    res.json({ 
      exists: true, 
      filename: filename,
      path: filePath,
      size: require('fs').statSync(filePath).size
    });
  } else {
    console.log('File does not exist!');
    res.json({ 
      exists: false, 
      filename: filename,
      path: filePath
    });
  }
});

// Routes
app.use('/api/community', authenticateToken, communityRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    timestamp: new Date().toISOString()
  });
});

async function startServer() {
  try {
    // Initialize database
    await initDatabase();
    console.log('✅ Database connected successfully');

    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 Community Service running on port ${PORT}`);
      console.log(`📁 Upload path: ${uploadPath}`);
      console.log(`📏 Max file size: 20971520 bytes (20MB)`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

startServer(); 