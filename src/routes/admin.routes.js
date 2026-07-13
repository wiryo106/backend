import { Router } from 'express';
import { getPendingBookings, getAvailableTechnicians, assignTechnician, getReports, downloadReport, downloadReportPdf } from '../controllers/admin.controller.js';
import { authenticate, authorizeRole } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticate, authorizeRole('ADMIN'));

router.get('/bookings/pending', getPendingBookings);
router.get('/technicians/available', getAvailableTechnicians);
router.post('/bookings/:id/assign', assignTechnician);
router.get('/reports', getReports);
router.get('/reports/download', downloadReport);
router.get('/reports/download-pdf', downloadReportPdf);

export default router;
