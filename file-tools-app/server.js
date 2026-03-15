const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const toolsRouter = require('./routes/tools');
const authRouter = require('./routes/auth');
const { errorResponse } = require('./utils/responseHandler');
const { startCleanupScheduler, stopCleanupScheduler } = require('./config/cleanupScheduler');

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://Mikedore:Justice6799@cluster0.isui1y2.mongodb.net/file-tools-app';
mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Start the conversion worker
// require('./workers/conversionWorker');

// Start the cleanup scheduler
const cleanupJobs = startCleanupScheduler();

const app = express();
const PORT = process.env.PORT || 3001;

const uploadsDir = path.join(__dirname, 'uploads');
const conversionsDir = path.join(__dirname, 'conversions');

[uploadsDir, conversionsDir].forEach((dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS headers for frontend
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Serve frontend from repo root (index.html, style.css, script.js)
app.use(express.static(path.join(__dirname, '..')));
app.use('/uploads', express.static(uploadsDir));
app.use('/conversions', express.static(conversionsDir));

app.get('/api', (req, res) => {
  res.json({ message: 'File Tools API', version: '1.0.0' });
});

// Routes
app.use('/api/auth', authRouter);
app.use('/api/tools', toolsRouter);

app.use((err, req, res, next) => {
  console.error(err);
  return errorResponse(res, err.message || 'Internal server error.', err.statusCode || 500);
});

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  stopCleanupScheduler(cleanupJobs);
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully...');
  stopCleanupScheduler(cleanupJobs);
  process.exit(0);
});
