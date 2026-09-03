const multer = require('multer');
const path = require('path');
// const conversionQueue = require('../queues/conversionQueue');
const { validateFiles } = require('../utils/fileValidator');
const { successResponse, errorResponse } = require('../utils/responseHandler');
const fs = require('fs').promises;

// Import services
const pdfToJpgService = require('../services/pdfToJpgService');
const jpgToPdfService = require('../services/jpgToPdfService');
const mergePdfService = require('../services/mergePdfService');
const splitPdfService = require('../services/splitPdfService');
const compressPdfService = require('../services/compressPdfService');
const pdfToWordService = require('../services/pdfToWordService');
const pdfToExcelService = require('../services/pdfToExcelService');
const pdfToPowerpointService = require('../services/pdfToPowerpointService');
const { unlockPdfService, protectPdfService } = require('../services/qpdfService');
const { randomUUID } = require('crypto');

const jobs = new Map();
const conversionsDir = path.join(__dirname, '..', 'conversions');

const toolServices = {
  'pdf-to-jpg': pdfToJpgService,
  'jpg-to-pdf': jpgToPdfService,
  'merge-pdf': mergePdfService,
  'split-pdf': splitPdfService,
  'compress-pdf': compressPdfService,
  'pdf-to-word': pdfToWordService,
  'pdf-to-excel': pdfToExcelService,
  'pdf-to-powerpoint': pdfToPowerpointService,
  'unlock-pdf': unlockPdfService,
  'protect-pdf': protectPdfService,
};

function resolveToolName(req, overrideTool) {
  return overrideTool || req.body?.tool || req.params?.tool || '';
}

async function processToolRequest(req, res, overrideTool) {
  const files = req.files || [];
  try {
    const tool = resolveToolName(req, overrideTool);

    // Validate files (basic validation - size and type limits are handled by middleware)
    validateFiles(tool, files);

    // Get the service
    const service = toolServices[tool];
    if (!service) {
      if (req.releaseConversion) await req.releaseConversion();
      return errorResponse(res, `Unsupported tool: ${tool}`, 400);
    }

    const jobId = randomUUID();
    jobs.set(jobId, { status: 'waiting', tool, createdAt: Date.now() });

    // Keep conversion work out of the upload request. The client can poll this job.
    const options = { password: req.body?.password || '' };
    processJob(jobId, service, files, options, req.releaseConversion).catch((error) => {
      console.error(`Job ${jobId} failed:`, error);
    });

    return successResponse(res, {
      message: 'Upload received. Processing started.',
      jobId,
      userType: req.userType,
      limits: req.userLimits,
    }, 202);
  } catch (err) {
    if (req.releaseConversion) await req.releaseConversion();
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

async function processJob(jobId, service, files, options, releaseConversion) {
  const job = jobs.get(jobId);
  if (!job) return;

  job.status = 'active';
  try {
    job.output = await service(files, options);
    job.status = 'completed';
    job.completedAt = new Date().toISOString();
  } catch (error) {
    if (releaseConversion) await releaseConversion();
    job.status = 'failed';
    job.error = error.message;
  } finally {
    await Promise.all(files.map(async (file) => {
      try {
        await fs.unlink(file.path);
      } catch (error) {
        if (error.code !== 'ENOENT') {
          console.error(`Failed to cleanup: ${file.path}`, error);
        }
      }
    }));

    setTimeout(() => jobs.delete(jobId), 60 * 60 * 1000).unref();
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

async function pdfToWord(req, res) {
  return processToolRequest(req, res, 'pdf-to-word');
}

async function pdfToExcel(req, res) {
  return processToolRequest(req, res, 'pdf-to-excel');
}

async function pdfToPowerpoint(req, res) {
  return processToolRequest(req, res, 'pdf-to-powerpoint');
}

async function unlockPdf(req, res) {
  return processToolRequest(req, res, 'unlock-pdf');
}

async function protectPdf(req, res) {
  return processToolRequest(req, res, 'protect-pdf');
}

async function getJobStatus(req, res) {
  try {
    const { id } = req.params;

    if (!id) {
      return errorResponse(res, 'Job ID is required', 400);
    }

    const job = jobs.get(id);

    if (!job) {
      return errorResponse(res, 'Job not found', 404);
    }

    let response = {
      jobId: id,
      status: job.status,
    };

    if (job.status === 'completed') {
      response.output = job.output;
      response.tool = job.tool;
      response.completedAt = job.completedAt;
    } else if (job.status === 'failed') {
      response.error = job.error;
    }

    return successResponse(res, response);
  } catch (err) {
    return errorResponse(res, err.message || 'Failed to get job status', 500);
  }
}

function downloadFile(req, res) {
  const filename = path.basename(req.params.filename || '');
  if (!filename || filename !== req.params.filename) {
    return errorResponse(res, 'Invalid download filename.', 400);
  }

  const filePath = path.join(conversionsDir, filename);
  return res.download(filePath, filename, (error) => {
    if (error && !res.headersSent) {
      return errorResponse(res, error.code === 'ENOENT' ? 'File not found.' : 'Download failed.', error.code === 'ENOENT' ? 404 : 500);
    }
  });
}

module.exports = {
  uploadTool,
  pdfToJpg,
  jpgToPdf,
  mergePdf,
  splitPdf,
  compressPdf,
  pdfToWord,
  pdfToExcel,
  pdfToPowerpoint,
  unlockPdf,
  protectPdf,
  getJobStatus,
  downloadFile
};
