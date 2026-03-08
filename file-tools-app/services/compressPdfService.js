const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { PDFDocument } = require('pdf-lib');

const conversionsDir = path.join(__dirname, '..', 'conversions');
const ghostscriptBins = ['gswin64c', 'gswin32c', 'gs'];

function runGhostscript(bin, inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    const args = [
      '-sDEVICE=pdfwrite',
      '-dCompatibilityLevel=1.4',
      '-dPDFSETTINGS=/ebook',
      '-dNOPAUSE',
      '-dQUIET',
      '-dBATCH',
      `-sOutputFile=${outputPath}`,
      inputPath
    ];

    const child = spawn(bin, args, { stdio: 'ignore' });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve(true);
      else reject(new Error(`Ghostscript failed with exit code ${code}`));
    });
  });
}

async function compressWithGhostscript(inputPath, outputPath) {
  for (const bin of ghostscriptBins) {
    try {
      await runGhostscript(bin, inputPath, outputPath);
      return true;
    } catch (err) {
      if (err.code === 'ENOENT') {
        continue;
      }
      throw err;
    }
  }
  return false;
}

async function compressWithPdfLib(inputPath, outputPath) {
  const buffer = await fs.promises.readFile(inputPath);
  const pdfDoc = await PDFDocument.load(buffer);
  const optimized = await pdfDoc.save({ useObjectStreams: true, updateMetadata: false });
  await fs.promises.writeFile(outputPath, optimized);
}

async function compressPdf(file) {
  const outputName = `compressed-${Date.now()}.pdf`;
  const outputPath = path.join(conversionsDir, outputName);

  const compressedWithGs = await compressWithGhostscript(file.path, outputPath);
  if (!compressedWithGs) {
    await compressWithPdfLib(file.path, outputPath);
  }

  return `/conversions/${outputName}`;
}

async function compressPdfService(files) {
  return compressPdf(files[0]);
}

module.exports = compressPdfService;
