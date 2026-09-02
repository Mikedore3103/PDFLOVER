const path = require('path');
const fs = require('fs').promises;
const { execFile } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

const conversionsDir = path.join(__dirname, '..', 'conversions');

function sanitizeName(name) {
  return name.replace(/[^a-zA-Z0-9-_]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'file';
}

async function getPngSize(filePath) {
  const header = await fs.open(filePath, 'r');
  try {
    const buffer = Buffer.alloc(24);
    await header.read(buffer, 0, 24, 0);
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  } finally {
    await header.close();
  }
}

async function renderPdfPages(file, format = 'png') {
  const extension = path.extname(file.originalname).toLowerCase();
  if (extension !== '.pdf') {
    const error = new Error('Invalid file type. Please upload a PDF file.');
    error.statusCode = 400;
    throw error;
  }

  const baseName = `${sanitizeName(path.basename(file.originalname, extension))}-${Date.now()}`;
  const outputPrefix = path.join(conversionsDir, `${baseName}-page`);
  const outputFlag = format === 'jpg' ? '-jpeg' : '-png';

  try {
    await execFileAsync('pdftoppm', ['-r', '150', outputFlag, file.path, outputPrefix]);
  } catch (error) {
    const dependencyError = new Error(
      error.code === 'ENOENT'
        ? 'PDF rendering is temporarily unavailable because Poppler is not installed on the server.'
        : error.stderr?.trim() || 'Could not render this PDF.'
    );
    dependencyError.statusCode = error.code === 'ENOENT' ? 503 : 400;
    throw dependencyError;
  }

  const extensionName = format === 'jpg' ? '.jpg' : '.png';
  const files = (await fs.readdir(conversionsDir))
    .filter(name => name.startsWith(`${baseName}-page-`) && name.endsWith(extensionName))
    .sort((left, right) => Number(left.match(/-(\d+)\.[^.]+$/)?.[1]) - Number(right.match(/-(\d+)\.[^.]+$/)?.[1]));
  const renderedPages = await Promise.all(files.map(async (name, index) => {
    const pagePath = path.join(conversionsDir, name);
    const size = format === 'png' ? await getPngSize(pagePath) : { width: 1275, height: 1650 };
    return { path: pagePath, ...size, page: index + 1 };
  }));

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
