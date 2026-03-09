const multer = require('multer');
const conversionQueue = require('../queues/conversionQueue');
const { validateFiles } = require('../utils/fileValidator');
const { successResponse, errorResponse } = require('../utils/responseHandler');

function resolveToolName(req, overrideTool) {
  return overrideTool || req.body?.tool || req.params?.tool || '';
}

async function processToolRequest(req, res, overrideTool) {
  const files = req.files || [];
  try {
    const tool = resolveToolName(req, overrideTool);

    // Validate files (basic validation - size and type limits are handled by middleware)
    validateFiles(tool, files);

    // Prepare job data with file paths and user info
    const jobData = {
      tool,
      files: files.map(file => ({
        path: file.path,
        originalname: file.originalname,
      })),
      userType: req.userType || 'guest',
      userId: req.user ? req.user._id : null,
      userPlan: req.user ? req.user.plan : null
    };

    // Add job to queue
    const job = await conversionQueue.add('convert', jobData);

    // Prepare response with user context
    const response = {
      jobId: job.id,
      message: 'File processing started. Check status with job ID.',
      userType: req.userType,
    };

    // Add user info for registered users
    if (req.user) {
      response.user = {
        plan: req.user.plan,
        dailyUsageCount: req.user.dailyUsageCount,
        limits: req.userLimits
      };
    } else {
      response.limits = req.userLimits;
    }

    return successResponse(res, response);
  } catch (err) {
    // Note: File cleanup will be handled by the worker after processing
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        // This should be handled by middleware, but fallback here
        const maxSize = req.userLimits ? req.userLimits.maxFileSize / (1024 * 1024) : 10;
        return errorResponse(res, `File too large. Maximum allowed size is ${maxSize}MB per file.`, 400);
      }
      return errorResponse(res, err.message, 400);
    }

    return errorResponse(res, err.message || 'Job submission failed.', err.statusCode || 500);
  }
}

async function uploadTool(req, res) {
  return processToolRequest(req, res);
}

async function pdfToJpg(req, res) {
  return processToolRequest(req, res, 'pdf-to-jpg');
}

async function jpgToPdf(req, res) {
  return processToolRequest(req, res, 'jpg-to-pdf');
}

async function mergePdf(req, res) {
  return processToolRequest(req, res, 'merge-pdf');
}

async function splitPdf(req, res) {
  return processToolRequest(req, res, 'split-pdf');
}

async function compressPdf(req, res) {
  return processToolRequest(req, res, 'compress-pdf');
}

async function getJobStatus(req, res) {
  try {
    const { id } = req.params;

    if (!id) {
      return errorResponse(res, 'Job ID is required', 400);
    }

    // Get job from queue
    const job = await conversionQueue.getJob(id);

    if (!job) {
      return errorResponse(res, 'Job not found', 404);
    }

    const state = await job.getState();

    let response = {
      jobId: id,
      status: state,
    };

    if (state === 'completed') {
      const result = job.returnvalue;
      response.output = result.output;
      response.tool = result.tool;
      response.completedAt = result.completedAt;
    } else if (state === 'failed') {
      response.error = job.failedReason;
    }

    return successResponse(res, response);
  } catch (err) {
    return errorResponse(res, err.message || 'Failed to get job status', 500);
  }
}

module.exports = {
  uploadTool,
  pdfToJpg,
  jpgToPdf,
  mergePdf,
  splitPdf,
  compressPdf,
  getJobStatus
};
