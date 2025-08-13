const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3007;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'Online Class Service',
    timestamp: new Date().toISOString(),
    port: PORT
  });
});

// Routes
app.use('/api/online-class', require('./routes/online-class'));

// Serve static files (Zoom SDK, etc.)
app.use('/static', express.static(path.join(__dirname, '../public')));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`🚀 Online Class Service running on port ${PORT}`);
  console.log(`📚 Service: Lớp học trực tuyến`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
});
