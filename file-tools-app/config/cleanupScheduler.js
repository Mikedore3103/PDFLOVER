const cron = require('node-cron');
const path = require('path');
const cleanupService = require('../services/cleanupService');

/**
 * Cleanup scheduler configuration
 * Manages automatic cleanup of temporary files using cron jobs
 */

// Define folder paths
const uploadsPath = path.join(__dirname, '..', 'uploads');
const conversionsPath = path.join(__dirname, '..', 'conversions');

/**
 * Initialize and start the cleanup scheduler
 * Sets up cron jobs for periodic cleanup tasks
 */
function startCleanupScheduler() {
  console.log('[Scheduler] Initializing cleanup scheduler...');

  // Clean uploads folder every 30 minutes
  // Cron pattern: */30 * * * * (every 30 minutes)
  const uploadsJob = cron.schedule('*/30 * * * *', async () => {
    try {
      console.log('[Scheduler] Running scheduled uploads cleanup...');
      await cleanupService.cleanupUploads(uploadsPath);
    } catch (error) {
      console.error('[Scheduler] Error in uploads cleanup job:', error);
    }
  }, {
    scheduled: false, // Don't start immediately
  });

  // Clean conversions folder every 6 hours
  // Cron pattern: 0 */6 * * * (every 6 hours at minute 0)
  const conversionsJob = cron.schedule('0 */6 * * *', async () => {
    try {
      console.log('[Scheduler] Running scheduled conversions cleanup...');
      await cleanupService.cleanupConversions(conversionsPath);
    } catch (error) {
      console.error('[Scheduler] Error in conversions cleanup job:', error);
    }
  }, {
    scheduled: false, // Don't start immediately
  });

  // Start the cron jobs
  uploadsJob.start();
  conversionsJob.start();

  console.log('[Scheduler] Cleanup scheduler started successfully');
  console.log('[Scheduler] Uploads cleanup: every 30 minutes');
  console.log('[Scheduler] Conversions cleanup: every 6 hours');

  // Store job references for potential management
  const jobs = {
    uploads: uploadsJob,
    conversions: conversionsJob,
  };

  return jobs;
}

/**
 * Stop the cleanup scheduler
 * @param {Object} jobs - Job references returned by startCleanupScheduler
 */
function stopCleanupScheduler(jobs) {
  if (jobs) {
    if (jobs.uploads) {
      jobs.uploads.stop();
      console.log('[Scheduler] Stopped uploads cleanup job');
    }
    if (jobs.conversions) {
      jobs.conversions.stop();
      console.log('[Scheduler] Stopped conversions cleanup job');
    }
  }
  console.log('[Scheduler] Cleanup scheduler stopped');
}

/**
 * Run manual cleanup (useful for testing or immediate cleanup)
 * @returns {Promise<void>}
 */
async function runManualCleanup() {
  console.log('[Scheduler] Running manual cleanup...');

  try {
    await cleanupService.cleanupUploads(uploadsPath);
    await cleanupService.cleanupConversions(conversionsPath);
    console.log('[Scheduler] Manual cleanup completed');
  } catch (error) {
    console.error('[Scheduler] Error in manual cleanup:', error);
    throw error;
  }
}

module.exports = {
  startCleanupScheduler,
  stopCleanupScheduler,
  runManualCleanup,
};