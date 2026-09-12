import express from 'express';
import * as usersController from './users.controller.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { requireAdmin } from '../../middleware/role.middleware.js';

const router = express.Router();

// Apply auth and admin middleware to all user management routes
router.use(requireAuth);
router.use(requireAdmin);

router.post('/', usersController.createUser);
router.get('/', usersController.getUsers);
router.patch('/:id/status', usersController.updateUserStatus);

export default router;
