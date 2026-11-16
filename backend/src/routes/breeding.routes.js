const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

const prisma = new PrismaClient();

// Get all breeding records
router.get('/', authenticate, async (req, res) => {
  try {
    const records = await prisma.breedingRecord.findMany({
      include: { bird: true, mateBird: true }
    });
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get active breeding status
router.get('/active', authenticate, async (req, res) => {
  try {
    const activeRecords = await prisma.breedingRecord.findMany({
      where: {
        status: { in: ['mating', 'incubating'] }
      },
      include: { bird: true }
    });
    res.json(activeRecords);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add breeding record
router.post('/', authenticate, authorize(['super_admin', 'head_keeper', 'keeper']), async (req, res) => {
  try {
    const birdId = Number(req.body.birdId);
    const mateBirdId = Number(req.body.mateBirdId);
    if (!Number.isInteger(birdId) || birdId < 1 || !Number.isInteger(mateBirdId) || mateBirdId < 1 || birdId === mateBirdId) {
      return res.status(400).json({ error: 'Pilih dua burung yang berbeda sebagai pasangan.' });
    }
    const record = await prisma.breedingRecord.create({
      data: { ...req.body, birdId, mateBirdId, createdById: req.user.userId }
    });
    res.status(201).json(record);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', authenticate, authorize(['super_admin', 'head_keeper', 'keeper']), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: 'ID catatan breeding tidak valid.' });
    }

    const { birdId, mateBirdId, matingDate, eggLayingDate, eggCount, hatchingDate, chickCount, status, notes } = req.body;
    const existing = await prisma.breedingRecord.findUnique({ where: { id }, select: { birdId: true, mateBirdId: true } });
    if (!existing) return res.status(404).json({ error: 'Catatan breeding tidak ditemukan.' });
    const nextBirdId = birdId === undefined ? existing.birdId : Number(birdId);
    const nextMateBirdId = mateBirdId === undefined ? existing.mateBirdId : Number(mateBirdId);
    if (birdId !== undefined && (!Number.isInteger(nextBirdId) || nextBirdId < 1)
      || mateBirdId !== undefined && (!Number.isInteger(nextMateBirdId) || nextMateBirdId < 1)
      || nextMateBirdId !== null && nextBirdId === nextMateBirdId) {
      return res.status(400).json({ error: 'Pilih dua burung yang berbeda sebagai pasangan.' });
    }
    const record = await prisma.breedingRecord.update({
      where: { id },
      data: {
        ...(birdId !== undefined ? { birdId: Number(birdId) } : {}),
        ...(mateBirdId !== undefined ? { mateBirdId: Number(mateBirdId) } : {}),
        ...(matingDate !== undefined ? { matingDate: matingDate ? new Date(matingDate) : null } : {}),
        ...(eggLayingDate !== undefined ? { eggLayingDate: eggLayingDate ? new Date(eggLayingDate) : null } : {}),
        ...(eggCount !== undefined ? { eggCount: eggCount === null || eggCount === '' ? null : Number(eggCount) } : {}),
        ...(hatchingDate !== undefined ? { hatchingDate: hatchingDate ? new Date(hatchingDate) : null } : {}),
        ...(chickCount !== undefined ? { chickCount: chickCount === null || chickCount === '' ? null : Number(chickCount) } : {}),
        ...(status !== undefined ? { status } : {}),
        ...(notes !== undefined ? { notes: notes || null } : {})
      }
    });
    res.json(record);
  } catch (error) {
    res.status(error.code === 'P2025' ? 404 : 500).json({ error: error.message });
  }
});

router.delete('/:id', authenticate, authorize(['super_admin', 'head_keeper', 'keeper']), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: 'ID catatan breeding tidak valid.' });
    }
    await prisma.breedingRecord.delete({ where: { id } });
    res.json({ message: 'Catatan breeding berhasil dihapus.' });
  } catch (error) {
    res.status(error.code === 'P2025' ? 404 : 500).json({ error: error.message });
  }
});

module.exports = router;
