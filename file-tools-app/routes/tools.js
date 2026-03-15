const express = require('express');
const upload = require('../config/multerConfig');
const toolController = require('../controllers/toolController');
const { usageLimiter } = require('../middleware/usageLimiter');
const { guestLimiter } = require('../middleware/guestLimiter');

const router = express.Router();

// Apply usage limiters to all tool routes
// Order matters: usageLimiter (registered users) first, then guestLimiter (fallback)
const toolMiddleware = [usageLimiter, guestLimiter];

// Generic tool upload endpoint used by frontend with `tool` in multipart form data.
router.post('/upload', upload.array('files'), toolMiddleware, toolController.uploadTool);

// Tool-specific endpoints for direct integrations.
router.post('/pdf-to-jpg', upload.array('files'), toolMiddleware, toolController.pdfToJpg);
router.post('/jpg-to-pdf', upload.array('files'), toolMiddleware, toolController.jpgToPdf);
router.post('/merge-pdf', upload.array('files'), toolMiddleware, toolController.mergePdf);
router.post('/split-pdf', upload.array('files'), toolMiddleware, toolController.splitPdf);
router.post('/compress-pdf', upload.array('files'), toolMiddleware, toolController.compressPdf);

// Job status endpoint (no auth required for checking status)
// router.get('/job-status/:id', toolController.getJobStatus);

module.exports = router;
