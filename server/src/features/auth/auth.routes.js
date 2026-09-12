import express from 'express';
import * as authController from './auth.controller.js';
import { requireAuth } from '../../middleware/auth.middleware.js';

const router = express.Router();

// Public login endpoint
router.post('/login', authController.login);

// Protected current user endpoint
router.get('/me', requireAuth, authController.getCurrentUser);

export default router;
