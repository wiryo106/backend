import { Router } from 'express';
import { getMyTasks, updateTaskStatus, completeTask } from '../controllers/technician.controller.js';
import { authenticate, authorizeRole } from '../middlewares/auth.middleware.js';
import { upload } from '../middlewares/upload.middleware.js';

const router = Router();

router.use(authenticate, authorizeRole('TECHNICIAN'));

router.get('/tasks', getMyTasks);
router.put('/tasks/:id/status', updateTaskStatus);

// upload.single('photo') will process the file upload
router.post('/tasks/:id/complete', upload.single('photo'), completeTask);

export default router;
