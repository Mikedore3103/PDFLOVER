const path = require('path');
const fs = require('fs');
const { PDFDocument } = require('pdf-lib');

const conversionsDir = path.join(__dirname, '..', 'conversions');

async function mergePdf(files) {
  const mergedPdf = await PDFDocument.create();

  for (const file of files) {
    const fileBuffer = await fs.promises.readFile(file.path);
    const pdf = await PDFDocument.load(fileBuffer);
    const pageIndices = pdf.getPageIndices();
    const copiedPages = await mergedPdf.copyPages(pdf, pageIndices);
    copiedPages.forEach((page) => mergedPdf.addPage(page));
  }

  const mergedBytes = await mergedPdf.save();
  const outputName = `merged-${Date.now()}.pdf`;
  const outputPath = path.join(conversionsDir, outputName);
  await fs.promises.writeFile(outputPath, mergedBytes);

  return `/conversions/${outputName}`;
}

module.exports = mergePdf;
