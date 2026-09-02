const path = require('path');
const fs = require('fs').promises;
const { Document, Packer, Paragraph, ImageRun } = require('docx');
const { renderPdfPages, removeRenderedPages } = require('./renderPdfPages');

const conversionsDir = path.join(__dirname, '..', 'conversions');

async function pdfToWord(files) {
  const pages = await renderPdfPages(files[0]);
  try {
    const children = [];
        for (let index = 0; index < pages.length; index += 1) {
          const page = pages[index];
          children.push(new Paragraph({
        children: [new ImageRun({
              data: await fs.readFile(page.path),
              transformation: { width: 816, height: Math.round(816 * page.height / page.width) }
        })],
        pageBreakBefore: index > 0
      }));
    }

    const document = new Document({
      sections: [{
        properties: { page: { margin: { top: 0, right: 0, bottom: 0, left: 0 } } },
        children
      }]
    });
    const outputName = `${path.basename(files[0].originalname, path.extname(files[0].originalname))}-${Date.now()}.docx`;
    const outputPath = path.join(conversionsDir, outputName);
    await fs.writeFile(outputPath, await Packer.toBuffer(document));
    return `/conversions/${outputName}`;
  } finally {
    await removeRenderedPages(pages);
  }
}

module.exports = pdfToWord;
