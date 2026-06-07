import { z } from 'zod';
import prisma from '../utils/prisma.js';

export const getPendingBookings = async (req, res) => {
  try {
    const bookings = await prisma.booking.findMany({
      where: { status: 'PENDING' },
      include: {
        customer: { select: { id: true, name: true, phone: true, email: true } },
        service: true
      },
      orderBy: { bookingDate: 'asc' }
    });
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getAvailableTechnicians = async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: 'Date is required' });

    const targetDate = new Date(date);

    // Find technicians who are not assigned to incomplete bookings on the given date
    // Or just return all technicians for simplicity, and let admin decide
    // For a strict system, filter out those with too many assignments
    const technicians = await prisma.user.findMany({
      where: { role: 'TECHNICIAN' },
      select: {
        id: true,
        name: true,
        phone: true,
        assignments: {
          where: {
            booking: {
              bookingDate: targetDate,
              status: { in: ['ASSIGNED', 'IN_PROGRESS'] }
            }
          }
        }
      }
    });

    res.json(technicians.map(t => ({
      id: t.id,
      name: t.name,
      phone: t.phone,
      activeAssignments: t.assignments.length
    })));
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

const assignSchema = z.object({
  technicianId: z.number()
});

export const assignTechnician = async (req, res) => {
  try {
    const { id } = req.params;
    const data = assignSchema.parse(req.body);

    const booking = await prisma.booking.findUnique({ where: { id: Number(id) } });
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (booking.status !== 'PENDING') {
      return res.status(400).json({ error: 'Can only assign technicians to PENDING bookings' });
    }

    const technician = await prisma.user.findUnique({
      where: { id: data.technicianId }
    });

    if (!technician || technician.role !== 'TECHNICIAN') {
      return res.status(400).json({ error: 'Invalid technician' });
    }

    // Transaction to create assignment and update booking status
    const result = await prisma.$transaction([
      prisma.assignment.create({
        data: {
          bookingId: booking.id,
          technicianId: technician.id
        }
      }),
      prisma.booking.update({
        where: { id: booking.id },
        data: { status: 'ASSIGNED' }
      })
    ]);

    // Here we could trigger a push notification to the technician

    res.json({ message: 'Technician assigned successfully', result });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getReports = async (req, res) => {
  try {
    const { month, year } = req.query;
    
    // For simplicity, just returning overall counts if no filter provided
    const totalBookings = await prisma.booking.count();
    const completedBookings = await prisma.booking.count({ where: { status: 'COMPLETED' } });
    
    const revenueResult = await prisma.booking.aggregate({
      where: { status: 'COMPLETED' },
      _sum: { totalPrice: true }
    });

    res.json({
      totalBookings,
      completedBookings,
      totalRevenue: revenueResult._sum.totalPrice || 0
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
