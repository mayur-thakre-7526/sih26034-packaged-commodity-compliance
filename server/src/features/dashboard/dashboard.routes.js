import express from 'express';
import { getDashboardOverview } from './dashboard.controller.js';
import { requireAuth } from '../../middleware/auth.middleware.js';

const router = express.Router();

router.use(requireAuth);
router.get('/', getDashboardOverview);

export default router;
