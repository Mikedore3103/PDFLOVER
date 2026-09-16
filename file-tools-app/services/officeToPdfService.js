const path = require('path');
const os = require('os');
const fs = require('fs').promises;
const { execFile } = require('child_process');
const { promisify } = require('util');
const { pathToFileURL } = require('url');
const { validatePdf } = require('./qpdfService');

const execFileAsync = promisify(execFile);
const conversionsDir = path.join(__dirname, '..', 'conversions');

async function officeToPdf(files, options = {}) {
  const file = files[0];
  const sourceBase = path.basename(file.path, path.extname(file.path));
  const intermediatePath = path.join(conversionsDir, `${sourceBase}.pdf`);
  const outputName = `${options.prefix || 'office'}-to-pdf-${Date.now()}.pdf`;
  const outputPath = path.join(conversionsDir, outputName);
  const profileDir = await fs.mkdtemp(path.join(os.tmpdir(), 'file-tools-libreoffice-'));

  try {
    try {
      const args = [
        `-env:UserInstallation=${pathToFileURL(profileDir).href}`,
        '--headless', '--convert-to', 'pdf', '--outdir', conversionsDir, file.path
      ];
      // Debian/Ubuntu images normally provide `soffice`; some images expose
      // only `libreoffice`. Try both without changing the conversion flow.
      try {
        await execFileAsync('soffice', args);
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
        await execFileAsync('libreoffice', args);
      }
    } catch (error) {
      const conversionError = new Error(
        error.code === 'ENOENT'
          ? 'Office-to-PDF conversion is temporarily unavailable because LibreOffice is not installed on the server.'
          : error.stderr?.trim() || 'LibreOffice could not convert this document.'
      );
      conversionError.statusCode = error.code === 'ENOENT' ? 503 : 400;
      throw conversionError;
    }
    await fs.rename(intermediatePath, outputPath);
    await validatePdf(outputPath);
    return `/conversions/${outputName}`;
  } catch (error) {
    await fs.unlink(intermediatePath).catch(() => {});
    await fs.unlink(outputPath).catch(() => {});
    throw error;
  } finally {
    await fs.rm(profileDir, { recursive: true, force: true }).catch(() => {});
  }
}

module.exports = officeToPdf;
