const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

const prisma = new PrismaClient();

// Get all feeding schedules
router.get('/', authenticate, async (req, res) => {
  try {
    const schedules = await prisma.feedingSchedule.findMany({
      include: { bird: true, user: { select: { fullName: true } } }
    });
    res.json(schedules);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get today's feeding schedule (can be filtered logically on client or here)
router.get('/today', authenticate, async (req, res) => {
  try {
    // For simplicity, returning all daily schedules
    const schedules = await prisma.feedingSchedule.findMany({
      where: { frequency: 'daily' },
      include: { bird: true }
    });
    res.json(schedules);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add feeding schedule
router.post('/', authenticate, authorize(['super_admin', 'head_keeper']), async (req, res) => {
  try {
    const schedule = await prisma.feedingSchedule.create({
      data: {
        ...req.body,
        userId: req.user.userId
      }
    });
    res.status(201).json(schedule);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update feeding schedule
router.put('/:id', authenticate, authorize(['super_admin', 'head_keeper']), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: 'ID jadwal pakan tidak valid.' });
    }
    const { birdId, feedingTime, feedType, amountKg, frequency } = req.body;
    const schedule = await prisma.feedingSchedule.update({
      where: { id },
      data: {
        ...(birdId !== undefined ? { birdId: Number(birdId) } : {}),
        ...(feedingTime !== undefined ? { feedingTime } : {}),
        ...(feedType !== undefined ? { feedType } : {}),
        ...(amountKg !== undefined ? { amountKg: amountKg === null || amountKg === '' ? null : Number(amountKg) } : {}),
        ...(frequency !== undefined ? { frequency } : {})
      }
    });
    res.json(schedule);
  } catch (error) {
    res.status(error.code === 'P2025' ? 404 : 500).json({ error: error.message });
  }
});

router.delete('/:id', authenticate, authorize(['super_admin', 'head_keeper']), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: 'ID jadwal pakan tidak valid.' });
    }
    await prisma.feedingSchedule.delete({ where: { id } });
    res.json({ message: 'Jadwal pakan berhasil dihapus.' });
  } catch (error) {
    res.status(error.code === 'P2025' ? 404 : 500).json({ error: error.message });
  }
});

module.exports = router;
