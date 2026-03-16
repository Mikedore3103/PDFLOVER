const path = require('path');
const fs = require('fs');
const archiver = require('archiver');
const { PDFDocument } = require('pdf-lib');

const conversionsDir = path.join(__dirname, '..', 'conversions');

function sanitizeName(name) {
  return name.replace(/[^a-zA-Z0-9-_]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'file';
}

async function splitPdf(file) {
  const inputBuffer = await fs.promises.readFile(file.path);
  const sourcePdf = await PDFDocument.load(inputBuffer);
  const pageCount = sourcePdf.getPageCount();
  const baseName = sanitizeName(path.basename(file.originalname, path.extname(file.originalname)));
  const outputs = [];
  const outputFiles = [];

  for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
    const targetPdf = await PDFDocument.create();
    const [copiedPage] = await targetPdf.copyPages(sourcePdf, [pageIndex]);
    targetPdf.addPage(copiedPage);

    const outputBytes = await targetPdf.save();
    const outputName = `${baseName}-page-${pageIndex + 1}.pdf`;
    const outputPath = path.join(conversionsDir, outputName);
    await fs.promises.writeFile(outputPath, outputBytes);
    outputs.push(`/conversions/${outputName}`);
    outputFiles.push({ path: outputPath, name: outputName });
  }

  if (pageCount > 1) {
    const zipName = `${baseName}-pages-${Date.now()}.zip`;
    const zipPath = path.join(conversionsDir, zipName);

    await new Promise((resolve, reject) => {
      const outputStream = fs.createWriteStream(zipPath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      outputStream.on('close', resolve);
      archive.on('error', reject);

      archive.pipe(outputStream);
      outputFiles.forEach(fileEntry => {
        archive.file(fileEntry.path, { name: fileEntry.name });
      });
      archive.finalize();
    });

    return `/conversions/${zipName}`;
  }

  return outputs;
}

async function splitPdfService(files) {
  return splitPdf(files[0]);
}

module.exports = splitPdfService;
