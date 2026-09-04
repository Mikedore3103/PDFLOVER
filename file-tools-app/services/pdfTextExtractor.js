const { execFile } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

// Poppler retains the reading order and whitespace of text-based PDFs. It
// cannot recover text from a scanned/image-only PDF without an OCR engine.
async function extractPdfPages(file) {
  try {
    const { stdout } = await execFileAsync('pdftotext', ['-layout', file.path, '-']);
    const pages = stdout.split('\f').map(page => page.replace(/\r/g, '')).filter((page, index, all) => page.trim() || index < all.length - 1);
    if (!pages.length || !pages.some(page => page.trim())) {
      const error = new Error('No selectable text was found. Please use an OCR-enabled PDF before converting it to an editable Office document.');
      error.statusCode = 422;
      throw error;
    }
    return pages;
  } catch (error) {
    if (error.code === 'ENOENT') {
      const dependencyError = new Error('Editable PDF conversion is temporarily unavailable because Poppler is not installed on the server.');
      dependencyError.statusCode = 503;
      throw dependencyError;
    }
    if (error.statusCode) throw error;
    const conversionError = new Error(error.stderr?.trim() || 'Could not extract editable text from this PDF.');
    conversionError.statusCode = 400;
    throw conversionError;
  }
}

module.exports = { extractPdfPages };
