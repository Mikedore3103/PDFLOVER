const path = require('path');
const fs = require('fs').promises;
const { execFile } = require('child_process');
const { promisify } = require('util');
const { fromPath } = require('pdf2pic');

const execFileAsync = promisify(execFile);

const conversionsDir = path.join(__dirname, '..', 'conversions');

function sanitizeName(name) {
  return name.replace(/[^a-zA-Z0-9-_]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'file';
}

async function renderPdfPages(file) {
  const extension = path.extname(file.originalname).toLowerCase();
  if (extension !== '.pdf') {
    const error = new Error('Invalid file type. Please upload a PDF file.');
    error.statusCode = 400;
    throw error;
  }

  try {
    await execFileAsync('gm', ['version']);
  } catch (error) {
    const dependencyError = new Error(
      'PDF rendering is temporarily unavailable because GraphicsMagick is not installed on the server.'
    );
    dependencyError.statusCode = 503;
    throw dependencyError;
  }

  const baseName = `${sanitizeName(path.basename(file.originalname, extension))}-${Date.now()}`;
  const converter = fromPath(file.path, {
    density: 150,
    format: 'png',
    saveFilename: `${baseName}-page`,
    savePath: conversionsDir
  });
  const pages = await converter.bulk(-1, { responseType: 'image' });
  const renderedPages = Array.isArray(pages) ? pages : [pages];

  if (!renderedPages.length || !renderedPages[0].path) {
    const error = new Error('Conversion failed. No PDF pages were rendered.');
    error.statusCode = 500;
    throw error;
  }

  return renderedPages.map((page, index) => ({
    path: page.path,
    width: page.width || 1275,
    height: page.height || 1650,
    page: page.page || index + 1
  }));
}

async function removeRenderedPages(pages) {
  await Promise.all((pages || []).map(page => fs.unlink(page.path).catch(() => {})));
}

module.exports = { renderPdfPages, removeRenderedPages };
