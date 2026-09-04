const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const toolsRouter = require('./routes/tools');
const authRouter = require('./routes/auth');
const plansRouter = require('./routes/plans');
const billingRouter = require('./routes/billing');
const adminRouter = require('./routes/admin');
const { initializePlans } = require('./services/planService');
const { errorResponse } = require('./utils/responseHandler');
const { startCleanupScheduler, stopCleanupScheduler } = require('./config/cleanupScheduler');

if (!process.env.MONGODB_URI || !process.env.JWT_SECRET) {
  throw new Error('MONGODB_URI and JWT_SECRET must be configured.');
}

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI;
mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log('Connected to MongoDB');
    await initializePlans();
    console.log('Subscription plans initialized');
  })
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
app.use(express.json({
  verify: (req, res, buffer) => {
    req.rawBody = buffer.toString('utf8');
  }
}));
app.use(express.urlencoded({ extended: true }));

// CORS headers for a separately hosted frontend. Requests without an Origin
// header (server-to-server calls and same-origin navigation) need no CORS
// headers. Set FRONTEND_ORIGIN to one or more comma-separated HTTPS origins
// in Render, for example: https://your-site.github.io,https://yourdomain.com
app.use((req, res, next) => {
  const requestOrigin = req.headers.origin;
  const allowedOrigins = (process.env.FRONTEND_ORIGIN || '')
    .split(',')
    .map(origin => origin.trim().replace(/\/$/, ''))
    .filter(Boolean);
  const normalizedOrigin = requestOrigin?.replace(/\/$/, '');
  const isAllowedOrigin = normalizedOrigin && allowedOrigins.includes(normalizedOrigin);

  if (isAllowedOrigin) {
    res.header('Access-Control-Allow-Origin', normalizedOrigin);
    res.header('Vary', 'Origin');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  }
  if (req.method === 'OPTIONS') {
    if (requestOrigin && !isAllowedOrigin) return res.sendStatus(403);
    res.sendStatus(204);
  } else {
    next();
  }
});

// Serve frontend from repo root (index.html, style.css, script.js)
app.use(express.static(path.join(__dirname, '..')));

app.get('/api', (req, res) => {
  res.json({ message: 'File Tools API', version: '1.0.0' });
});

// Routes
app.use('/api/auth', authRouter);
app.use('/api/plans', plansRouter);
app.use('/api/billing', billingRouter);
app.use('/api/admin', adminRouter);
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
