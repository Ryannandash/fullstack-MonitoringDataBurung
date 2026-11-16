const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

const router = express.Router();
const prisma = new PrismaClient();
const conditions = new Set(['sehat', 'sakit', 'dalam_pemulihan']);

router.use(authenticate);

const hideMedicalDetailsForKeeper = (record) => ({
  id: record.id,
  birdId: record.birdId,
  bird: record.bird,
  user: record.user,
  veterinarian: record.veterinarian,
  condition: record.condition,
  examinationDate: record.examinationDate,
  symptoms: record.symptoms,
  photoUrl: record.photoUrl
});

const syncBirdHealth = async (tx, birdId) => {
  const latestRecord = await tx.healthRecord.findFirst({
    where: { birdId },
    orderBy: [{ examinationDate: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
    select: { condition: true }
  });
  await tx.bird.update({
    where: { id: birdId },
    data: { statusHealth: latestRecord?.condition || null }
  });
};

router.get('/', async (req, res) => {
  try {
    let where = { doctorId: null };
    if (req.user.role === 'dokter_hewan') {
      where = {
        doctorId: null,
        user: {
          is: { role: { in: ['super_admin', 'head_keeper', 'keeper'] } }
        }
      };
    }
    const records = await prisma.healthRecord.findMany({
      where,
      include: { bird: { include: { species: true } }, user: { select: { fullName: true } } },
      orderBy: [{ examinationDate: 'desc' }, { createdAt: 'desc' }]
    });
    res.json(req.user.role === 'keeper' ? records.map(hideMedicalDetailsForKeeper) : records);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/bird/:birdId', async (req, res) => {
  try {
    const records = await prisma.healthRecord.findMany({
      where: { birdId: Number(req.params.birdId), doctorId: null },
      include: { user: { select: { fullName: true } } },
      orderBy: { examinationDate: 'desc' }
    });
    res.json(req.user.role === 'keeper' ? records.map(hideMedicalDetailsForKeeper) : records);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', authorize(['super_admin', 'head_keeper', 'keeper']), async (req, res) => {
  try {
    const birdId = Number(req.body.birdId);
    const examinationDate = req.body.examinationDate ? new Date(req.body.examinationDate) : new Date();
    if (!Number.isInteger(birdId) || birdId < 1 || !conditions.has(req.body.condition)
      || Number.isNaN(examinationDate.getTime())) {
      return res.status(400).json({ message: 'Burung, kondisi kesehatan, dan tanggal pemeriksaan yang valid wajib diisi.' });
    }

    const data = {
      birdId,
      userId: req.user.userId,
      condition: req.body.condition,
      examinationDate,
      symptoms: typeof req.body.symptoms === 'string' && req.body.symptoms.trim() ? req.body.symptoms.trim() : null,
      veterinarian: req.body.veterinarian || null,
      treatment: req.body.treatment || null,
      diagnosis: req.body.diagnosis || null,
      medicalAction: req.body.medicalAction || req.body.treatment || null,
      dietRecommendation: req.body.dietRecommendation || null,
      quarantine: Boolean(req.body.quarantine),
      photoUrl: req.body.photoUrl || null
    };
    const record = await prisma.$transaction(async (tx) => {
      const created = await tx.healthRecord.create({ data });
      await syncBirdHealth(tx, birdId);
      return created;
    });
    res.status(201).json(record);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', authorize(['super_admin', 'head_keeper', 'keeper']), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const birdId = req.body.birdId === undefined ? undefined : Number(req.body.birdId);
    const examinationDate = req.body.examinationDate === undefined
      ? undefined
      : (req.body.examinationDate ? new Date(req.body.examinationDate) : null);
    if (!Number.isInteger(id) || id < 1
      || (birdId !== undefined && (!Number.isInteger(birdId) || birdId < 1))
      || (req.body.condition !== undefined && !conditions.has(req.body.condition))
      || (req.body.symptoms !== undefined && req.body.symptoms !== null && typeof req.body.symptoms !== 'string')
      || (examinationDate && Number.isNaN(examinationDate.getTime()))) {
      return res.status(400).json({ message: 'Data pemeriksaan kesehatan tidak valid.' });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const current = await tx.healthRecord.findUnique({ where: { id }, select: { birdId: true } });
      if (!current) {
        const error = new Error('Pemeriksaan tidak ditemukan.');
        error.status = 404;
        throw error;
      }
      const record = await tx.healthRecord.update({
        where: { id },
        data: {
          ...(birdId !== undefined ? { birdId } : {}),
          ...(req.body.condition !== undefined ? { condition: req.body.condition } : {}),
          ...(examinationDate !== undefined ? { examinationDate } : {}),
          ...(req.body.symptoms !== undefined ? { symptoms: typeof req.body.symptoms === 'string' && req.body.symptoms.trim() ? req.body.symptoms.trim() : null } : {}),
          ...(req.body.veterinarian !== undefined ? { veterinarian: req.body.veterinarian || null } : {}),
          ...(req.body.treatment !== undefined ? { treatment: req.body.treatment || null } : {}),
          ...(req.body.diagnosis !== undefined ? { diagnosis: req.body.diagnosis || null } : {}),
          ...(req.body.medicalAction !== undefined ? { medicalAction: req.body.medicalAction || null } : {}),
          ...(req.body.dietRecommendation !== undefined ? { dietRecommendation: req.body.dietRecommendation || null } : {}),
          ...(req.body.quarantine !== undefined ? { quarantine: Boolean(req.body.quarantine) } : {}),
          ...(req.body.photoUrl !== undefined ? { photoUrl: req.body.photoUrl || null } : {})
        }
      });
      await syncBirdHealth(tx, current.birdId);
      if (birdId !== undefined && birdId !== current.birdId) await syncBirdHealth(tx, birdId);
      return record;
    });
    res.json(updated);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message, message: error.message });
  }
});

router.delete('/:id', authorize(['super_admin', 'head_keeper', 'keeper']), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ message: 'ID pemeriksaan tidak valid.' });
    }
    await prisma.$transaction(async (tx) => {
      const record = await tx.healthRecord.findUnique({ where: { id }, select: { birdId: true } });
      if (!record) {
        const error = new Error('Pemeriksaan tidak ditemukan.');
        error.status = 404;
        throw error;
      }
      await tx.healthRecord.delete({ where: { id } });
      await syncBirdHealth(tx, record.birdId);
    });
    res.json({ message: 'Pemeriksaan berhasil dihapus.' });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message, message: error.message });
  }
});

module.exports = router;
