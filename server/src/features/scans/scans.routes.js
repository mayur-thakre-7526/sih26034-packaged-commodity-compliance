import express from 'express';
import multer from 'multer';
import * as scansController from './scans.controller.js';
import { requireAuth } from '../../middleware/auth.middleware.js';

// Setup multer for in-memory file storage (buffer)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit per file
});

const router = express.Router();

// All scan routes require authentication
router.use(requireAuth);

router.post('/', upload.array('images'), scansController.createScan);
router.get('/', scansController.getScans);
router.get('/:id', scansController.getScan);
router.get('/:id/report', scansController.getScanReport);

export default router;
