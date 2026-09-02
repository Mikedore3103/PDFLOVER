const path = require('path');
const fs = require('fs').promises;
const ExcelJS = require('exceljs');
const { renderPdfPages, removeRenderedPages } = require('./renderPdfPages');

const conversionsDir = path.join(__dirname, '..', 'conversions');

async function pdfToExcel(files) {
  const pages = await renderPdfPages(files[0]);
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('PDF pages');
    let topRow = 0;
    for (const page of pages) {
      const imageHeight = Math.round(816 * page.height / page.width);
      const imageId = workbook.addImage({ buffer: await fs.readFile(page.path), extension: 'png' });
      worksheet.addImage(imageId, {
        tl: { col: 0, row: topRow },
        ext: { width: 816, height: imageHeight }
      });
      topRow += Math.ceil(imageHeight / 15) + 2;
      while (worksheet.rowCount < topRow) {
        worksheet.addRow([]);
      }
    }
    const outputName = `${path.basename(files[0].originalname, path.extname(files[0].originalname))}-${Date.now()}.xlsx`;
    const outputPath = path.join(conversionsDir, outputName);
    await workbook.xlsx.writeFile(outputPath);
    return `/conversions/${outputName}`;
  } finally {
    await removeRenderedPages(pages);
  }
}

module.exports = pdfToExcel;
