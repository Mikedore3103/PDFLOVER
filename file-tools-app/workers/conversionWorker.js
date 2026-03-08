const { Worker } = require('bullmq');
const Redis = require('ioredis');
const fs = require('fs').promises;

// Import all service modules
const pdfToJpgService = require('../services/pdfToJpgService');
const jpgToPdfService = require('../services/jpgToPdfService');
const mergePdfService = require('../services/mergePdfService');
const splitPdfService = require('../services/splitPdfService');
const compressPdfService = require('../services/compressPdfService');

// Map tool names to their respective service functions
const toolServices = {
  'pdf-to-jpg': pdfToJpgService,
  'jpg-to-pdf': jpgToPdfService,
  'merge-pdf': mergePdfService,
  'split-pdf': splitPdfService,
  'compress-pdf': compressPdfService,
};

// Cleanup uploaded files after processing
async function cleanupUploadedFiles(files) {
  await Promise.all(
    (files || []).map(async (file) => {
      try {
        await fs.unlink(file.path);
        console.log(`Cleaned up uploaded file: ${file.path}`);
      } catch (err) {
        if (err.code !== 'ENOENT') {
          console.error(`Failed to cleanup uploaded file: ${file.path}`, err);
        }
      }
    })
  );
}

// Initialize Redis connection for worker
const redisConnection = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
  lazyConnect: true,
});

// Create worker to process file conversion jobs
const conversionWorker = new Worker(
  'file-processing',
  async (job) => {
    const { tool, files } = job.data;

    console.log(`Processing job ${job.id} for tool: ${tool}`);

    // Validate job data
    if (!tool || !files || !Array.isArray(files) || files.length === 0) {
      throw new Error('Invalid job data: missing tool or files');
    }

    // Get the appropriate service function
    const service = toolServices[tool];
    if (!service) {
      throw new Error(`Unsupported tool: ${tool}`);
    }

    try {
      // Execute the service with the provided files
      const output = await service(files);

      console.log(`Job ${job.id} completed successfully for tool: ${tool}`);

      // Clean up uploaded files after successful processing
      await cleanupUploadedFiles(files);

      // Return the output paths for status checking
      return {
        tool,
        output,
        completedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error(`Job ${job.id} failed for tool ${tool}:`, error);

      // Clean up uploaded files even on failure
      await cleanupUploadedFiles(files);

      throw error; // Re-throw to mark job as failed
    }
  },
  {
    connection: redisConnection,
    concurrency: 2, // Process up to 2 jobs simultaneously
    limiter: {
      max: 10, // Maximum 10 jobs per duration
      duration: 1000, // Per 1 second
    },
  }
);

// Event handlers for worker lifecycle
conversionWorker.on('completed', (job) => {
  console.log(`Job ${job.id} has been completed`);
});

conversionWorker.on('failed', (job, err) => {
  console.error(`Job ${job.id} has failed with error: ${err.message}`);
});

conversionWorker.on('stalled', (jobId) => {
  console.warn(`Job ${jobId} has stalled`);
});

// Handle Redis connection events
redisConnection.on('connect', () => {
  console.log('Worker connected to Redis');
});

redisConnection.on('error', (err) => {
  console.error('Worker Redis connection error:', err);
});

redisConnection.on('ready', () => {
  console.log('Worker Redis connection is ready');
});

// Graceful shutdown handling
process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, closing worker...');
  await conversionWorker.close();
  await redisConnection.quit();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Received SIGINT, closing worker...');
  await conversionWorker.close();
  await redisConnection.quit();
  process.exit(0);
});

console.log('File conversion worker started and listening for jobs...');

module.exports = conversionWorker;