const { Queue } = require('bullmq');
const Redis = require('ioredis');

// Initialize Redis connection
// In production, configure with proper Redis URL and options
const redisConnection = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
  lazyConnect: true,
});

// Create BullMQ queue for file processing
const conversionQueue = new Queue('file-processing', {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: 50, // Keep last 50 completed jobs
    removeOnFail: 100,    // Keep last 100 failed jobs
    attempts: 3,          // Retry failed jobs up to 3 times
    backoff: {
      type: 'exponential',
      delay: 2000,        // Initial delay of 2 seconds
    },
  },
});

// Handle Redis connection events
redisConnection.on('connect', () => {
  console.log('Connected to Redis for queue operations');
});

redisConnection.on('error', (err) => {
  console.error('Redis connection error:', err);
});

redisConnection.on('ready', () => {
  console.log('Redis connection is ready');
});

module.exports = conversionQueue;