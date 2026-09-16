const path = require('path');
const pptxgen = require('pptxgenjs');
const { extractPdfPages } = require('./pdfTextExtractor');

const conversionsDir = path.join(__dirname, '..', 'conversions');

async function pdfToPowerpoint(files) {
  const pages = await extractPdfPages(files[0]);
  const presentation = new pptxgen();
  presentation.layout = 'LAYOUT_WIDE';
  presentation.author = 'File Tools';
  presentation.subject = 'PDF conversion';

  pages.forEach(page => {
    const slide = presentation.addSlide();
    slide.addText(page, { x: 0.45, y: 0.35, w: 12.4, h: 6.75, fontFace: 'Arial', fontSize: 14, breakLine: false, margin: 0.05, valign: 'top', fit: 'shrink' });
  });
  const outputName = `${path.basename(files[0].originalname, path.extname(files[0].originalname))}-${Date.now()}.pptx`;
  const outputPath = path.join(conversionsDir, outputName);
  await presentation.writeFile({ fileName: outputPath });
  return `/conversions/${outputName}`;
}

module.exports = pdfToPowerpoint;
