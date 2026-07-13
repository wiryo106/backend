import { z } from 'zod';
import prisma from '../utils/prisma.js';
import PDFDocument from 'pdfkit-table';

export const getPendingBookings = async (req, res) => {
  try {
    const bookings = await prisma.booking.findMany({
      where: { status: 'PENDING' },
      include: {
        customer: { select: { id: true, name: true, phone: true, email: true } },
        service: true
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getAllBookings = async (req, res) => {
  try {
    const bookings = await prisma.booking.findMany({
      include: {
        customer: { select: { id: true, name: true, phone: true, email: true } },
        service: true,
        assignments: {
          include: {
            technician: { select: { name: true, phone: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' } // Newest first
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

export const downloadReport = async (req, res) => {
  try {
    const { month, year } = req.query;

    if (!month || !year) {
      return res.status(400).json({ error: 'Parameter month dan year wajib diisi' });
    }

    const m = parseInt(month);
    const y = parseInt(year);

    // Tentukan range tanggal awal & akhir bulan
    const startDate = new Date(y, m - 1, 1);
    const endDate = new Date(y, m, 1); // Awal bulan berikutnya

    // Query booking COMPLETED di bulan tersebut
    const bookings = await prisma.booking.findMany({
      where: {
        status: 'COMPLETED',
        bookingDate: {
          gte: startDate,
          lt: endDate,
        },
      },
      include: {
        customer: { select: { name: true, phone: true } },
        service: { select: { name: true } },
        assignments: {
          include: {
            technician: { select: { name: true } },
          },
        },
      },
      orderBy: { bookingDate: 'asc' },
    });

    // Nama bulan untuk header
    const namaBulan = [
      '', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];

    // Generate CSV
    const csvRows = [];

    // Header info
    csvRows.push(`Laporan Pendapatan - ${namaBulan[m]} ${y}`);
    csvRows.push('');

    // Column headers
    csvRows.push('No,Tanggal,Pelanggan,Telepon,Layanan,Jumlah,Alamat,Teknisi,Total Harga');

    // Data rows
    let totalRevenue = 0;
    bookings.forEach((b, index) => {
      const tanggal = b.bookingDate ? new Date(b.bookingDate).toLocaleDateString('id-ID') : '-';
      const pelanggan = b.customer?.name || '-';
      const telepon = b.customer?.phone || '-';
      const layanan = b.service?.name || '-';
      const jumlah = b.quantity || 1;
      // Escape alamat yang mengandung koma
      const alamat = `"${(b.address || '-').replace(/"/g, '""')}"`;
      const teknisi = b.assignments?.map(a => a.technician?.name).filter(Boolean).join('; ') || '-';
      const harga = b.totalPrice || 0;
      totalRevenue += harga;

      csvRows.push(`${index + 1},${tanggal},${pelanggan},${telepon},${layanan},${jumlah},${alamat},${teknisi},${harga}`);
    });

    // Footer summary
    csvRows.push('');
    csvRows.push(`Total Pesanan Selesai:,${bookings.length}`);
    csvRows.push(`Total Pendapatan:,${totalRevenue}`);

    const csvContent = csvRows.join('\n');
    const fileName = `laporan_${namaBulan[m]}_${y}.csv`;

    // BOM untuk UTF-8 agar Excel membaca karakter Indonesia dengan benar
    const bom = '\uFEFF';

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(bom + csvContent);
  } catch (error) {
    console.error('Download report error:', error);
    res.status(500).json({ error: 'Gagal mengunduh laporan' });
  }
};

export const downloadReportPdf = async (req, res) => {
  try {
    const { month, year } = req.query;

    if (!month || !year) {
      return res.status(400).json({ error: 'Parameter month dan year wajib diisi' });
    }

    const m = parseInt(month);
    const y = parseInt(year);
    const startDate = new Date(y, m - 1, 1);
    const endDate = new Date(y, m, 1);

    const bookings = await prisma.booking.findMany({
      where: {
        status: 'COMPLETED',
        bookingDate: {
          gte: startDate,
          lt: endDate,
        },
      },
      include: {
        customer: { select: { name: true, phone: true } },
        service: { select: { name: true } },
        assignments: {
          include: {
            technician: { select: { name: true } },
          },
        },
      },
      orderBy: { bookingDate: 'asc' },
    });

    const namaBulan = [
      '', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];

    const doc = new PDFDocument({ margin: 30, size: 'A4' });
    
    const fileName = `laporan_${namaBulan[m]}_${y}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    doc.pipe(res);

    // Header
    doc.fontSize(20).text('Laporan Pendapatan', { align: 'center' });
    doc.fontSize(14).text(`Periode: ${namaBulan[m]} ${y}`, { align: 'center' });
    doc.moveDown(2);

    let totalRevenue = 0;
    const tableRows = bookings.map((b, index) => {
      const tanggal = b.bookingDate ? new Date(b.bookingDate).toLocaleDateString('id-ID') : '-';
      const pelanggan = b.customer?.name || '-';
      const layanan = b.service?.name || '-';
      const teknisi = b.assignments?.map(a => a.technician?.name).filter(Boolean).join(', ') || '-';
      const harga = b.totalPrice || 0;
      totalRevenue += harga;

      return [
        (index + 1).toString(),
        tanggal,
        pelanggan,
        layanan,
        teknisi,
        `Rp ${harga.toLocaleString('id-ID')}`
      ];
    });

    const table = {
      headers: ['No', 'Tanggal', 'Pelanggan', 'Layanan', 'Teknisi', 'Total Harga'],
      rows: tableRows,
    };

    await doc.table(table, { 
      prepareHeader: () => doc.font('Helvetica-Bold').fontSize(10),
      prepareRow: (row, indexColumn, indexRow, rectRow) => doc.font('Helvetica').fontSize(10),
    });

    doc.moveDown();
    doc.font('Helvetica-Bold').fontSize(12).text(`Total Pesanan Selesai: ${bookings.length}`);
    doc.text(`Total Pendapatan: Rp ${totalRevenue.toLocaleString('id-ID')}`);

    doc.end();

  } catch (error) {
    console.error('Download PDF report error:', error);
    res.status(500).json({ error: 'Gagal mengunduh laporan PDF' });
  }
};

