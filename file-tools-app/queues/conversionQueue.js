const { Queue } = require('bullmq');
const Redis = require('ioredis');
const { RedisMemoryServer } = require('redis-memory-server');

const redisUrl = process.env.REDIS_URL;
let redisServer = null;

if (!redisUrl) {
  // Start in-memory Redis server for development
  redisServer = new RedisMemoryServer();
  redisServer.start().then(() => {
    console.log('In-memory Redis server started');
  }).catch(err => {
    console.error('Failed to start in-memory Redis:', err);
  });
}

// Get Redis connection details
const redisHost = process.env.REDIS_HOST || 'localhost';
const redisPort = process.env.REDIS_PORT || (redisServer ? await redisServer.getPort() : 6379);
const redisPassword = process.env.REDIS_PASSWORD || undefined;

// Initialize Redis connection
const redisConnection = redisUrl
  ? new Redis(redisUrl)
  : new Redis({
      host: redisHost,
      port: redisPort,
      password: redisPassword,
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
