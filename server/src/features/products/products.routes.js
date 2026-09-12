import express from 'express';
import * as productsController from './products.controller.js';
import { requireAuth } from '../../middleware/auth.middleware.js';

const router = express.Router();

// All product routes require authentication
router.use(requireAuth);

router.post('/', productsController.createProduct);
router.get('/', productsController.getProducts);
router.get('/:id', productsController.getProduct);

export default router;
