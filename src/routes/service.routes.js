import { Router } from 'express';
import { getServices, getServiceById, createService, updateService, deleteService } from '../controllers/service.controller.js';
import { authenticate, authorizeRole } from '../middlewares/auth.middleware.js';

const router = Router();

router.get('/', getServices);
router.get('/:id', getServiceById);

// Admin only routes
router.post('/', authenticate, authorizeRole('ADMIN'), createService);
router.put('/:id', authenticate, authorizeRole('ADMIN'), updateService);
router.delete('/:id', authenticate, authorizeRole('ADMIN'), deleteService);

export default router;
