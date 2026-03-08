const path = require('path');
const fs = require('fs');
const { fromPath } = require('pdf2pic');

const conversionsDir = path.join(__dirname, '..', 'conversions');
if (!fs.existsSync(conversionsDir)) {
  fs.mkdirSync(conversionsDir, { recursive: true });
}

function sanitizeName(name) {
  return name.replace(/[^a-zA-Z0-9-_]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'file';
}

async function removeFileIfExists(filePath) {
  try {
    await fs.promises.unlink(filePath);
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.error(`Failed to remove temporary file: ${filePath}`, err);
    }
  }
}

async function pdfToJpg(file) {
  const extension = path.extname(file.originalname).toLowerCase();
  if (extension !== '.pdf') {
    const err = new Error('Invalid file type. Please upload a PDF file.');
    err.statusCode = 400;
    throw err;
  }

  const safeBaseName = sanitizeName(path.basename(file.originalname, extension));
  const uniqueBaseName = `${safeBaseName}-${Date.now()}`;

  const converter = fromPath(file.path, {
    density: 150,
    format: 'jpg',
    saveFilename: `${uniqueBaseName}-page`,
    savePath: conversionsDir
  });

  const converted = await converter.bulk(-1, { responseType: 'image' });
  const pages = Array.isArray(converted) ? converted : [converted];

  if (!pages.length) {
    const err = new Error('Conversion failed. No JPG pages were generated.');
    err.statusCode = 500;
    throw err;
  }

  const output = [];
  for (let index = 0; index < pages.length; index += 1) {
    const page = pages[index];
    const pageNumber = page.page || index + 1;
    const sourcePath = page.path || path.join(conversionsDir, page.name);
    const outputName = `${safeBaseName}-page-${pageNumber}.jpg`;
    const outputPath = path.join(conversionsDir, outputName);

    if (sourcePath && sourcePath !== outputPath) {
      await removeFileIfExists(outputPath);
      await fs.promises.rename(sourcePath, outputPath);
    }

    output.push(`/conversions/${outputName}`);
  }

  return output;
}

async function pdfToJpgService(files) {
  const output = [];
  for (const file of files) {
    const converted = await pdfToJpg(file);
    output.push(...converted);
  }
  return output;
}

module.exports = pdfToJpgService;
