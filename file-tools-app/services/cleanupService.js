const fs = require('fs').promises;
const path = require('path');

/**
 * Cleanup service for managing temporary file storage
 * Handles automatic deletion of expired files and storage limit enforcement
 */

// Configuration constants
const UPLOAD_MAX_AGE_HOURS = 1; // 1 hour
const CONVERSION_MAX_AGE_HOURS = 24; // 24 hours
const SAFE_DELETION_BUFFER_MINUTES = 5; // Don't delete files modified in last 5 minutes
const UPLOAD_STORAGE_LIMIT_GB = 2; // 2GB limit for uploads folder

/**
 * Get file statistics including size and modification time
 * @param {string} filePath - Path to the file
 * @returns {Promise<{size: number, mtime: Date}>}
 */
async function getFileStats(filePath) {
  try {
    const stats = await fs.stat(filePath);
    return {
      size: stats.size,
      mtime: stats.mtime,
    };
  } catch (error) {
    console.warn(`Failed to get stats for ${filePath}:`, error.message);
    return null;
  }
}

/**
 * Check if a file is old enough to be safely deleted
 * @param {Date} fileMtime - File modification time
 * @param {number} maxAgeHours - Maximum age in hours
 * @returns {boolean}
 */
function isFileExpired(fileMtime, maxAgeHours) {
  const now = new Date();
  const maxAgeMs = maxAgeHours * 60 * 60 * 1000;
  const safeBufferMs = SAFE_DELETION_BUFFER_MINUTES * 60 * 1000;

  // Don't delete files that were modified very recently (might be in use)
  if (now.getTime() - fileMtime.getTime() < safeBufferMs) {
    return false;
  }

  return now.getTime() - fileMtime.getTime() > maxAgeMs;
}

/**
 * Delete a single file safely
 * @param {string} filePath - Path to the file to delete
 * @returns {Promise<boolean>} - True if deleted, false otherwise
 */
async function deleteFile(filePath) {
  try {
    await fs.unlink(filePath);
    console.log(`[Cleanup] Deleted expired file: ${path.basename(filePath)}`);
    return true;
  } catch (error) {
    console.error(`[Cleanup] Failed to delete ${filePath}:`, error.message);
    return false;
  }
}

/**
 * Clean a folder by deleting files older than specified age
 * @param {string} folderPath - Path to the folder to clean
 * @param {number} maxAgeHours - Maximum age in hours
 * @returns {Promise<{deletedCount: number, totalSizeFreed: number}>}
 */
async function cleanFolderByAge(folderPath, maxAgeHours) {
  let deletedCount = 0;
  let totalSizeFreed = 0;

  try {
    const files = await fs.readdir(folderPath);

    for (const file of files) {
      const filePath = path.join(folderPath, file);
      const stats = await getFileStats(filePath);

      if (!stats) continue;

      if (isFileExpired(stats.mtime, maxAgeHours)) {
        const deleted = await deleteFile(filePath);
        if (deleted) {
          deletedCount++;
          totalSizeFreed += stats.size;
        }
      }
    }
  } catch (error) {
    console.error(`[Cleanup] Error cleaning folder ${folderPath}:`, error.message);
  }

  if (deletedCount > 0) {
    console.log(`[Cleanup] Removed ${deletedCount} old files from ${path.basename(folderPath)} folder, freed ${formatBytes(totalSizeFreed)}`);
  }

  return { deletedCount, totalSizeFreed };
}

/**
 * Get total size of all files in a folder
 * @param {string} folderPath - Path to the folder
 * @returns {Promise<number>} - Total size in bytes
 */
async function getFolderSize(folderPath) {
  let totalSize = 0;

  try {
    const files = await fs.readdir(folderPath);

    for (const file of files) {
      const filePath = path.join(folderPath, file);
      const stats = await getFileStats(filePath);

      if (stats) {
        totalSize += stats.size;
      }
    }
  } catch (error) {
    console.error(`[Cleanup] Error calculating folder size for ${folderPath}:`, error.message);
  }

  return totalSize;
}

/**
 * Clean folder by enforcing storage limit (delete oldest files first)
 * @param {string} folderPath - Path to the folder
 * @param {number} maxSizeGB - Maximum size in GB
 * @returns {Promise<{deletedCount: number, totalSizeFreed: number}>}
 */
async function cleanFolderBySize(folderPath, maxSizeGB) {
  const maxSizeBytes = maxSizeGB * 1024 * 1024 * 1024; // Convert GB to bytes
  let deletedCount = 0;
  let totalSizeFreed = 0;

  try {
    const currentSize = await getFolderSize(folderPath);

    if (currentSize <= maxSizeBytes) {
      return { deletedCount: 0, totalSizeFreed: 0 };
    }

    // Get all files with their stats
    const files = await fs.readdir(folderPath);
    const fileStats = [];

    for (const file of files) {
      const filePath = path.join(folderPath, file);
      const stats = await getFileStats(filePath);

      if (stats) {
        fileStats.push({
          path: filePath,
          size: stats.size,
          mtime: stats.mtime,
        });
      }
    }

    // Sort by modification time (oldest first)
    fileStats.sort((a, b) => a.mtime - b.mtime);

    // Delete oldest files until under limit
    let targetSize = currentSize;

    for (const file of fileStats) {
      if (targetSize <= maxSizeBytes) break;

      // Don't delete very recent files
      if (!isFileExpired(file.mtime, 0)) continue;

      const deleted = await deleteFile(file.path);
      if (deleted) {
        deletedCount++;
        totalSizeFreed += file.size;
        targetSize -= file.size;
      }
    }

    if (deletedCount > 0) {
      console.log(`[Cleanup] Storage limit exceeded, removed ${deletedCount} oldest files from ${path.basename(folderPath)}, freed ${formatBytes(totalSizeFreed)}`);
    }
  } catch (error) {
    console.error(`[Cleanup] Error cleaning folder by size ${folderPath}:`, error.message);
  }

  return { deletedCount, totalSizeFreed };
}

/**
 * Format bytes into human readable format
 * @param {number} bytes - Size in bytes
 * @returns {string}
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Main cleanup function for uploads folder
 * @param {string} uploadsPath - Path to uploads folder
 * @returns {Promise<void>}
 */
async function cleanupUploads(uploadsPath) {
  console.log('[Cleanup] Starting uploads folder cleanup...');

  // Clean by age (1 hour)
  const ageResult = await cleanFolderByAge(uploadsPath, UPLOAD_MAX_AGE_HOURS);

  // Clean by size if needed (2GB limit)
  const sizeResult = await cleanFolderBySize(uploadsPath, UPLOAD_STORAGE_LIMIT_GB);

  const totalDeleted = ageResult.deletedCount + sizeResult.deletedCount;
  const totalFreed = ageResult.totalSizeFreed + sizeResult.totalSizeFreed;

  if (totalDeleted > 0) {
    console.log(`[Cleanup] Uploads cleanup complete: ${totalDeleted} files removed, ${formatBytes(totalFreed)} freed`);
  } else {
    console.log('[Cleanup] Uploads folder is clean');
  }
}

/**
 * Main cleanup function for conversions folder
 * @param {string} conversionsPath - Path to conversions folder
 * @returns {Promise<void>}
 */
async function cleanupConversions(conversionsPath) {
  console.log('[Cleanup] Starting conversions folder cleanup...');

  // Clean by age (24 hours)
  const result = await cleanFolderByAge(conversionsPath, CONVERSION_MAX_AGE_HOURS);

  if (result.deletedCount > 0) {
    console.log(`[Cleanup] Conversions cleanup complete: ${result.deletedCount} files removed, ${formatBytes(result.totalSizeFreed)} freed`);
  } else {
    console.log('[Cleanup] Conversions folder is clean');
  }
}

module.exports = {
  cleanupUploads,
  cleanupConversions,
  cleanFolderByAge,
  cleanFolderBySize,
  getFolderSize,
  formatBytes,
};