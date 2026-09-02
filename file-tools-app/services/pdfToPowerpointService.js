const path = require('path');
const fs = require('fs').promises;
const pptxgen = require('pptxgenjs');
const { renderPdfPages, removeRenderedPages } = require('./renderPdfPages');

const conversionsDir = path.join(__dirname, '..', 'conversions');

async function pdfToPowerpoint(files) {
  const pages = await renderPdfPages(files[0]);
  const presentation = new pptxgen();
  const slideWidth = 13.333;
  const slideHeight = slideWidth * pages[0].height / pages[0].width;
  presentation.defineLayout({ name: 'PDF_PAGE', width: slideWidth, height: slideHeight });
  presentation.layout = 'PDF_PAGE';
  presentation.author = 'File Tools';
  presentation.subject = 'PDF conversion';

  try {
    pages.forEach(page => {
      const slide = presentation.addSlide();
      slide.addImage({ path: page.path, x: 0, y: 0, w: slideWidth, h: slideHeight });
    });

    const outputName = `${path.basename(files[0].originalname, path.extname(files[0].originalname))}-${Date.now()}.pptx`;
    const outputPath = path.join(conversionsDir, outputName);
    await presentation.writeFile({ fileName: outputPath });
    return `/conversions/${outputName}`;
  } finally {
    await removeRenderedPages(pages);
  }
}

module.exports = pdfToPowerpoint;
