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
          status: { in: ['ASSIGNED', 'ON_THE_WAY', 'ARRIVED', 'IN_PROGRESS', 'SUSPENDED'] }
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
  status: z.enum(['ON_THE_WAY', 'ARRIVED', 'IN_PROGRESS', 'SUSPENDED']),
  suspensionReason: z.string().optional()
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

    // Validate transitions
    const validTransitions = {
      'ASSIGNED': ['ON_THE_WAY'],
      'ON_THE_WAY': ['ARRIVED'],
      'ARRIVED': ['IN_PROGRESS'],
      'IN_PROGRESS': ['SUSPENDED'],
      'SUSPENDED': ['IN_PROGRESS']
    };

    if (!validTransitions[booking.status]?.includes(data.status)) {
      return res.status(400).json({ error: `Cannot transition from ${booking.status} to ${data.status}` });
    }

    if (data.status === 'SUSPENDED' && (!data.suspensionReason || data.suspensionReason.trim() === '')) {
      return res.status(400).json({ error: 'Alasan penangguhan wajib diisi' });
    }

    const updateData = { status: data.status };
    if (data.status === 'SUSPENDED') {
      updateData.suspensionReason = data.suspensionReason;
    } else if (data.status === 'IN_PROGRESS' && booking.status === 'SUSPENDED') {
      // Clear reason when resuming
      updateData.suspensionReason = null;
    }

    const updatedBooking = await prisma.booking.update({
      where: { id: booking.id },
      data: updateData
    });

    res.json({ message: `Status updated to ${data.status}`, booking: updatedBooking });
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
