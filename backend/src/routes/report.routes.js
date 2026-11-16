const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middlewares/auth.middleware');

const prisma = new PrismaClient();

const getDayRange = (date = new Date()) => {
  const startDate = new Date(date);
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(date);
  endDate.setHours(23, 59, 59, 999);
  return { startDate, endDate };
};

const getReport = async (startDate, endDate) => {
  const where = startDate && endDate
    ? { createdAt: { gte: startDate, lte: endDate } }
    : {};
  const [activities, healthRecords, transfers] = await Promise.all([
    prisma.activityLog.findMany({
      where,
      include: { bird: { include: { species: true } } },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.healthRecord.findMany({
      where,
      include: {
        bird: { include: { species: true } },
        user: { select: { fullName: true, username: true } }
      },
      orderBy: [{ examinationDate: 'desc' }, { createdAt: 'desc' }]
    }),
    prisma.birdTransfer.findMany({
      where,
      include: {
        bird: { include: { species: true } },
        fromHabitat: { include: { dome: true } },
        toHabitat: { include: { dome: true } },
        responsible: { select: { fullName: true, username: true } }
      },
      orderBy: { createdAt: 'desc' }
    })
  ]);

  return {
    startDate,
    endDate,
    totalActivities: activities.length,
    totalHealthRecords: healthRecords.length,
    totalTransfers: transfers.length,
    data: activities,
    healthRecords,
    transfers
  };
};

router.get('/all', authenticate, async (req, res) => {
  try {
    res.json(await getReport());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/daily', authenticate, async (req, res) => {
  try {
    const { startDate, endDate } = getDayRange();
    const report = await getReport(startDate, endDate);
    res.json({ date: startDate, ...report });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/weekly', authenticate, async (req, res) => {
  try {
    const { endDate } = getDayRange();
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 6);
    startDate.setHours(0, 0, 0, 0);
    res.json(await getReport(startDate, endDate));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/monthly', authenticate, async (req, res) => {
  try {
    const { endDate } = getDayRange();
    const startDate = new Date(endDate);
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);
    res.json(await getReport(startDate, endDate));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get report per species
router.get('/species/:id', authenticate, async (req, res) => {
  try {
    const speciesId = parseInt(req.params.id);
    const birds = await prisma.bird.findMany({ where: { speciesId } });
    const birdIds = birds.map(b => b.id);

    const activities = await prisma.activityLog.findMany({
      where: { birdId: { in: birdIds } }
    });
    res.json({ speciesId, totalBirds: birds.length, totalActivities: activities.length, data: activities });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
