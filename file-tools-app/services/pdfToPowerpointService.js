const path = require('path');
const fs = require('fs').promises;
const pptxgen = require('pptxgenjs');
const pdfToJpgService = require('./pdfToJpgService');

const conversionsDir = path.join(__dirname, '..', 'conversions');

async function pdfToPowerpoint(files) {
  const imageUrls = await pdfToJpgService(files);
  const presentation = new pptxgen();
  presentation.layout = 'LAYOUT_WIDE';
  presentation.author = 'File Tools';
  presentation.subject = 'PDF conversion';

  imageUrls.forEach(imageUrl => {
    const slide = presentation.addSlide();
    const imagePath = path.join(__dirname, '..', imageUrl.replace(/^\//, ''));
    slide.addImage({ path: imagePath, x: 0, y: 0, w: 13.333, h: 7.5 });
  });

  const outputName = `${path.basename(files[0].originalname, path.extname(files[0].originalname))}-${Date.now()}.pptx`;
  const outputPath = path.join(conversionsDir, outputName);
  await presentation.writeFile({ fileName: outputPath });
  await Promise.all(imageUrls.map(imageUrl => fs.unlink(path.join(__dirname, '..', imageUrl.replace(/^\//, ''))).catch(() => {})));
  return `/conversions/${outputName}`;
}

module.exports = pdfToPowerpoint;
