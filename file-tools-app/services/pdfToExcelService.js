const path = require('path');
const ExcelJS = require('exceljs');
const { extractPdfPages } = require('./pdfTextExtractor');

const conversionsDir = path.join(__dirname, '..', 'conversions');

async function pdfToExcel(files) {
  const pages = await extractPdfPages(files[0]);
  const workbook = new ExcelJS.Workbook();
  pages.forEach((page, index) => {
    const worksheet = workbook.addWorksheet(`Page ${index + 1}`);
    page.split('\n').forEach(line => {
      const cells = line.trim() ? line.trim().split(/\t+|\s{2,}/) : [];
      worksheet.addRow(cells);
    });
    worksheet.columns.forEach(column => { column.width = 18; });
  });
  const outputName = `${path.basename(files[0].originalname, path.extname(files[0].originalname))}-${Date.now()}.xlsx`;
  const outputPath = path.join(conversionsDir, outputName);
  await workbook.xlsx.writeFile(outputPath);
  return `/conversions/${outputName}`;
}

module.exports = pdfToExcel;
