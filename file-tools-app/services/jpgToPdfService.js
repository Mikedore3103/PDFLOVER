const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');

const conversionsDir = path.join(__dirname, '..', 'conversions');

async function jpgToPdf(files) {
  const outputName = `images-to-pdf-${Date.now()}.pdf`;
  const outputPath = path.join(conversionsDir, outputName);

  await new Promise((resolve, reject) => {
    const doc = new PDFDocument({ autoFirstPage: false });
    const stream = fs.createWriteStream(outputPath);

    stream.on('finish', resolve);
    stream.on('error', reject);
    doc.on('error', reject);
    doc.pipe(stream);

    for (const file of files) {
      const image = doc.openImage(file.path);
      doc.addPage({ size: [image.width, image.height] });
      doc.image(file.path, 0, 0, { width: image.width, height: image.height });
    }

    doc.end();
  });

  return `/conversions/${outputName}`;
}

module.exports = jpgToPdf;
