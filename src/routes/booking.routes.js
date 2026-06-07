import { Router } from 'express';
import { checkAvailability, createBooking, getCustomerBookings, getBookingById } from '../controllers/booking.controller.js';
import { authenticate, authorizeRole } from '../middlewares/auth.middleware.js';

const router = Router();

router.get('/check-availability', checkAvailability);
router.post('/', authenticate, authorizeRole('CUSTOMER'), createBooking);
router.get('/customer', authenticate, authorizeRole('CUSTOMER'), getCustomerBookings);
router.get('/:id', authenticate, getBookingById);

export default router;
