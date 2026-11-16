const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middlewares/auth.middleware');

const router = express.Router();
const prisma = new PrismaClient();

router.get('/', authenticate, async (req, res) => {
  try {
    const requestedDays = Number(req.query.days) || 14;
    const days = Math.min(Math.max(requestedDays, 1), 90);
    const now = new Date();
    const end = new Date(now);
    end.setDate(end.getDate() + days);
    const isVeterinarian = req.user.role === 'dokter_hewan';

    const [medicalTreatments, breeding, feeding] = await Promise.all([
      prisma.medicalTreatment.findMany({
        where: { nextCheckup: { gte: now, lte: end } },
        select: {
          id: true,
          birdId: true,
          nextCheckup: true,
          bird: { select: { id: true, name: true, ringNumber: true } }
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }]
      }),
      prisma.breedingRecord.findMany({
        where: { hatchingDate: { gte: now, lte: end }, status: 'incubating' },
        include: {
          bird: { select: { id: true, name: true, ringNumber: true, gender: true } },
          mateBird: { select: { id: true, name: true, ringNumber: true, gender: true } }
        },
        orderBy: { hatchingDate: 'asc' }
      }),
      isVeterinarian ? Promise.resolve([]) : prisma.feedingSchedule.findMany({
        where: { frequency: 'daily' },
        include: { bird: true },
        orderBy: { feedingTime: 'asc' }
      })
    ]);

    const latestTreatments = new Map();
    medicalTreatments.forEach((treatment) => {
      if (!latestTreatments.has(treatment.birdId)) latestTreatments.set(treatment.birdId, treatment);
    });
    const reminders = [
      ...Array.from(latestTreatments.values()).map((treatment) => ({
        id: `health-${treatment.id}`,
        type: 'health',
        title: 'Kontrol kesehatan',
        bird: treatment.bird,
        dueAt: treatment.nextCheckup
        })),
      ...breeding.map((record) => ({
        id: `hatching-${record.id}`,
        type: 'hatching',
        title: 'Perkiraan penetasan telur',
        bird: record.bird,
        mateBird: record.mateBird,
        dueAt: record.hatchingDate
      })),
      ...feeding.map((schedule) => ({
        id: `feeding-${schedule.id}`,
        type: 'feeding',
        title: `Jadwal pakan: ${schedule.feedType}`,
        bird: schedule.bird,
        dueAt: (() => {
          const dueAt = new Date();
          const [hours, minutes] = schedule.feedingTime.split(':').map(Number);
          dueAt.setHours(hours || 0, minutes || 0, 0, 0);
          return dueAt.toISOString();
        })()
      }))
    ].sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt));

    res.json(reminders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
