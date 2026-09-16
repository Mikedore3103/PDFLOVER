const path = require('path');
const fs = require('fs').promises;
const { Document, Packer, Paragraph, TextRun } = require('docx');
const { extractPdfPages } = require('./pdfTextExtractor');

const conversionsDir = path.join(__dirname, '..', 'conversions');

async function pdfToWord(files) {
  const pages = await extractPdfPages(files[0]);
  const children = [];
  for (let index = 0; index < pages.length; index += 1) {
    const lines = pages[index].split('\n');
    lines.forEach((line, lineIndex) => {
      children.push(new Paragraph({
        pageBreakBefore: index > 0 && lineIndex === 0,
        children: line ? [new TextRun({ text: line, font: 'Arial' })] : []
      }));
    });
  }

  const document = new Document({ sections: [{ children }] });
  const outputName = `${path.basename(files[0].originalname, path.extname(files[0].originalname))}-${Date.now()}.docx`;
  const outputPath = path.join(conversionsDir, outputName);
  await fs.writeFile(outputPath, await Packer.toBuffer(document));
  return `/conversions/${outputName}`;
}

module.exports = pdfToWord;
