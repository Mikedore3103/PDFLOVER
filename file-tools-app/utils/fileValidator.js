const path = require('path');

const ALLOWED_EXTENSIONS = new Set([
  '.pdf',
  '.jpg',
  '.jpeg',
  '.png',
  '.doc',
  '.docx',
  '.ppt',
  '.pptx',
  '.xls',
  '.xlsx'
]);

const TOOL_RULES = {
  'pdf-to-jpg': { minFiles: 1, maxFiles: 10, extensions: ['.pdf'] },
  'jpg-to-pdf': { minFiles: 1, maxFiles: 100, extensions: ['.jpg', '.jpeg', '.png'] },
  'merge-pdf': { minFiles: 2, maxFiles: 50, extensions: ['.pdf'] },
  'split-pdf': { minFiles: 1, maxFiles: 1, extensions: ['.pdf'] },
  'compress-pdf': { minFiles: 1, maxFiles: 1, extensions: ['.pdf'] }
};

function createError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function getToolRules(toolName) {
  return TOOL_RULES[toolName];
}

function validateFiles(toolName, files) {
  if (!toolName) {
    throw createError('Missing tool name.');
  }

  if (!files || files.length === 0) {
    throw createError('Missing files. Please upload at least one file.');
  }

  const rules = getToolRules(toolName);
  if (!rules) {
    throw createError(`Unsupported tool: ${toolName}`, 400);
  }

  if (files.length < rules.minFiles || files.length > rules.maxFiles) {
    throw createError(
      `Invalid number of files for ${toolName}. Expected ${rules.minFiles}-${rules.maxFiles} file(s).`
    );
  }

  for (const file of files) {
    const extension = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(extension)) {
      throw createError(`Unsupported file type: ${extension || 'unknown'}`);
    }
    if (!rules.extensions.includes(extension)) {
      throw createError(`Invalid file type for ${toolName}. Allowed: ${rules.extensions.join(', ')}`);
    }
  }
}

module.exports = {
  validateFiles,
  getToolRules
};
