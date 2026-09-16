const path = require('path');
const { renderPdfPages } = require('./renderPdfPages');

async function pdfToJpg(file) {
  const pages = await renderPdfPages(file, 'jpg');
  return pages.map(page => `/conversions/${path.basename(page.path)}`);
}

async function pdfToJpgService(files) {
  const output = [];
  for (const file of files) {
    const converted = await pdfToJpg(file);
    output.push(...converted);
  }
  return output;
}

module.exports = pdfToJpgService;
