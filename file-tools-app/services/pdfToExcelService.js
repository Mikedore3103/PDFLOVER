const path = require('path');
const fs = require('fs').promises;
const pdfParse = require('pdf-parse');
const XLSX = require('xlsx');

const conversionsDir = path.join(__dirname, '..', 'conversions');

function lineToCells(line) {
  const cells = line.includes('\t') ? line.split('\t') : line.split(/\s{2,}/);
  return cells.map(cell => cell.trim()).filter(Boolean);
}

async function pdfToExcel(files) {
  const input = await fs.readFile(files[0].path);
  const parsed = await pdfParse(input);
  const rows = parsed.text
    .split(/\r?\n/)
    .map(lineToCells)
    .filter(row => row.length > 0);

  if (rows.length === 0) {
    rows.push(['No selectable text found. This PDF may require OCR.']);
  }

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, worksheet, 'PDF text');
  const outputName = `${path.basename(files[0].originalname, path.extname(files[0].originalname))}-${Date.now()}.xlsx`;
  const outputPath = path.join(conversionsDir, outputName);
  XLSX.writeFile(workbook, outputPath);
  return `/conversions/${outputName}`;
}

module.exports = pdfToExcel;
