const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);
const conversionsDir = path.join(__dirname, '..', 'conversions');

async function runQpdf(args) {
  try {
    await execFileAsync('qpdf', args);
  } catch (error) {
    if (error.code === 'ENOENT') {
      const dependencyError = new Error('This PDF security tool is temporarily unavailable because qpdf is not installed on the server.');
      dependencyError.statusCode = 503;
      throw dependencyError;
    }

    const message = error.stderr?.trim() || 'qpdf could not process this PDF.';
    const processingError = new Error(message);
    processingError.statusCode = 400;
    throw processingError;
  }
}

async function validatePdf(filePath, password = '') {
  const passwordArg = password ? [`--password=${password}`] : [];
  await runQpdf([...passwordArg, '--check', filePath]);
}

function getOutputPath(file, prefix) {
  const baseName = path.basename(file.originalname, path.extname(file.originalname));
  return path.join(conversionsDir, `${prefix}-${Date.now()}-${baseName}.pdf`);
}

async function unlockPdfService(files, options = {}) {
  if (!options.password) {
    const error = new Error('Enter the PDF password to unlock this file.');
    error.statusCode = 400;
    throw error;
  }

  const outputPath = getOutputPath(files[0], 'unlocked');
  await runQpdf([`--password=${options.password}`, '--decrypt', files[0].path, outputPath]);
  await validatePdf(outputPath);
  return `/conversions/${path.basename(outputPath)}`;
}

async function protectPdfService(files, options = {}) {
  if (!options.password) {
    const error = new Error('Enter a password to protect this PDF.');
    error.statusCode = 400;
    throw error;
  }

  const outputPath = getOutputPath(files[0], 'protected');
  await runQpdf(['--encrypt', options.password, options.password, '256', '--', files[0].path, outputPath]);
  await validatePdf(outputPath, options.password);
  return `/conversions/${path.basename(outputPath)}`;
}

module.exports = { unlockPdfService, protectPdfService, validatePdf };
