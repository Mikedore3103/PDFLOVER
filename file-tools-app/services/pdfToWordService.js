const path = require('path');
const fs = require('fs').promises;
const pdfParse = require('pdf-parse');
const { Document, Packer, Paragraph, TextRun } = require('docx');

const conversionsDir = path.join(__dirname, '..', 'conversions');

async function pdfToWord(files) {
  const input = await fs.readFile(files[0].path);
  const parsed = await pdfParse(input);
  const paragraphs = parsed.text
    .split(/\f|\r?\n{2,}/)
    .map(text => text.trim())
    .filter(Boolean)
    .map(text => new Paragraph({ children: [new TextRun(text)] }));

  const document = new Document({ sections: [{ children: paragraphs }] });
  const outputName = `${path.basename(files[0].originalname, path.extname(files[0].originalname))}-${Date.now()}.docx`;
  const outputPath = path.join(conversionsDir, outputName);
  await fs.writeFile(outputPath, await Packer.toBuffer(document));
  return `/conversions/${outputName}`;
}

module.exports = pdfToWord;
