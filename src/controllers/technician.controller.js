import { z } from 'zod';
import prisma from '../utils/prisma.js';

export const getMyTasks = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const assignments = await prisma.assignment.findMany({
      where: {
        technicianId: req.user.id,
        booking: {
          status: { in: ['ASSIGNED', 'IN_PROGRESS'] }
          // bookingDate: today // Optionally filter by today
        }
      },
      include: {
        booking: {
          include: {
            customer: { select: { name: true, phone: true } },
            service: true
          }
        }
      },
      orderBy: { booking: { bookingDate: 'asc' } }
    });

    res.json(assignments.map(a => a.booking));
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

const statusSchema = z.object({
  status: z.enum(['IN_PROGRESS'])
});

export const updateTaskStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const data = statusSchema.parse(req.body);

    const booking = await prisma.booking.findFirst({
      where: {
        id: Number(id),
        assignments: { some: { technicianId: req.user.id } }
      }
    });

    if (!booking) {
      return res.status(404).json({ error: 'Task not found or not assigned to you' });
    }

    if (booking.status !== 'ASSIGNED') {
      return res.status(400).json({ error: 'Cannot transition to IN_PROGRESS from current status' });
    }

    const updatedBooking = await prisma.booking.update({
      where: { id: booking.id },
      data: { status: data.status }
    });

    res.json({ message: 'Status updated to IN_PROGRESS', booking: updatedBooking });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

const completeSchema = z.object({
  description: z.string().optional()
});

export const completeTask = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Parse fields if they are sent as form data
    const description = req.body.description || '';

    // Business Rule 2: Validasi Bukti Kerja
    if (!req.file) {
      return res.status(400).json({ error: 'Gagal. Dokumentasi foto hasil pekerjaan wajib dilampirkan sebelum menyelesaikan tugas.' });
    }

    const booking = await prisma.booking.findFirst({
      where: {
        id: Number(id),
        assignments: { some: { technicianId: req.user.id } }
      }
    });

    if (!booking) {
      return res.status(404).json({ error: 'Task not found or not assigned to you' });
    }

    if (booking.status !== 'IN_PROGRESS') {
      return res.status(400).json({ error: 'Task must be IN_PROGRESS before completing' });
    }

    // Photo URL path relative to server root
    const photoUrl = `/uploads/${req.file.filename}`;

    const result = await prisma.$transaction([
      prisma.documentation.create({
        data: {
          bookingId: booking.id,
          photoUrl,
          description
        }
      }),
      prisma.booking.update({
        where: { id: booking.id },
        data: { status: 'COMPLETED' }
      })
    ]);

    res.json({ message: 'Task completed successfully', result });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
