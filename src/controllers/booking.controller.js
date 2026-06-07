import { z } from 'zod';
import prisma from '../utils/prisma.js';

const bookingSchema = z.object({
  serviceId: z.number(),
  quantity: z.number().min(1).default(1),
  bookingDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid date format" }),
  address: z.string().min(5),
  complaint: z.string()
});

export const checkAvailability = async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: 'Date is required' });

    const targetDate = new Date(date);
    const DAILY_LIMIT = parseInt(process.env.DAILY_BOOKING_LIMIT || '10');

    // Count active bookings for the given date
    const count = await prisma.booking.count({
      where: {
        bookingDate: targetDate,
        status: {
          in: ['PENDING', 'ASSIGNED', 'IN_PROGRESS']
        }
      }
    });

    res.json({
      date: targetDate.toISOString().split('T')[0],
      booked: count,
      limit: DAILY_LIMIT,
      available: count < DAILY_LIMIT
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createBooking = async (req, res) => {
  try {
    const data = bookingSchema.parse(req.body);
    const targetDate = new Date(data.bookingDate);
    const DAILY_LIMIT = parseInt(process.env.DAILY_BOOKING_LIMIT || '10');

    // Business Rule 1: Mencegah Overbooking
    const count = await prisma.booking.count({
      where: {
        bookingDate: targetDate,
        status: {
          in: ['PENDING', 'ASSIGNED', 'IN_PROGRESS']
        }
      }
    });

    if (count >= DAILY_LIMIT) {
      return res.status(400).json({ error: 'Maaf, jadwal operasional pada tanggal ini sudah penuh. Mohon pilih hari lain.' });
    }

    const service = await prisma.service.findUnique({ where: { id: data.serviceId } });
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    const totalPrice = service.basePrice * data.quantity;

    const booking = await prisma.booking.create({
      data: {
        customerId: req.user.id,
        serviceId: data.serviceId,
        quantity: data.quantity,
        bookingDate: targetDate,
        address: data.address,
        complaint: data.complaint,
        totalPrice: totalPrice,
        status: 'PENDING'
      }
    });

    res.status(201).json({ message: 'Pesanan Berhasil Dibuat', booking });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getCustomerBookings = async (req, res) => {
  try {
    const bookings = await prisma.booking.findMany({
      where: { customerId: req.user.id },
      include: {
        service: true,
        assignments: {
          include: { technician: { select: { id: true, name: true, phone: true } } }
        },
        documentation: true
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getBookingById = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await prisma.booking.findUnique({
      where: { id: Number(id) },
      include: {
        service: true,
        customer: { select: { id: true, name: true, phone: true, email: true } },
        assignments: {
          include: { technician: { select: { id: true, name: true, phone: true } } }
        },
        documentation: true
      }
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Allow access only if it belongs to customer, or user is admin/technician
    if (req.user.role === 'CUSTOMER' && booking.customerId !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    res.json(booking);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
