const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middlewares/auth.middleware');

const router = express.Router();
const prisma = new PrismaClient();

router.get('/summary', authenticate, async (req, res) => {
  try {
    const role = req.user.role;
    const taskWhere = role === 'keeper'
      ? { assignedToId: req.user.userId, status: { not: 'SELESAI' } }
      : { status: { not: 'SELESAI' } };
    const reportWhere = role === 'head_keeper'
      ? { status: 'MENUNGGU_VERIFIKASI' }
      : ['keeper', 'dokter_hewan'].includes(role)
        ? { userId: req.user.userId, status: { in: ['DRAFT', 'PERLU_REVISI'] } }
        : { status: 'MENUNGGU_VERIFIKASI' };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const upcomingLimit = new Date(today);
    upcomingLimit.setDate(upcomingLimit.getDate() + 14);
    const [birds, species, habitats, health, pendingTasks, pendingReports, upcomingCheckups] = await Promise.all([
      prisma.bird.count(),
      prisma.species.count(),
      prisma.habitat.count(),
      prisma.bird.groupBy({ by: ['statusHealth'], _count: { _all: true } }),
      prisma.taskAssignment.count({ where: taskWhere }),
      prisma.dailyReport.count({ where: reportWhere }),
      prisma.medicalTreatment.count({ where: { nextCheckup: { gte: today, lte: upcomingLimit } } })
    ]);
    res.json({
      birds,
      species,
      habitats,
      health: health.map((item) => ({ condition: item.statusHealth || 'belum diperiksa', total: item._count._all })),
      pendingTasks,
      pendingReports,
      upcomingCheckups
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
