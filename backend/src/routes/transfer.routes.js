const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

const router = express.Router();
const prisma = new PrismaClient();

router.use(authenticate);

router.get('/', authorize(['super_admin', 'head_keeper', 'keeper']), async (req, res) => {
  try {
    const transfers = await prisma.birdTransfer.findMany({
      where: req.user.role === 'keeper' ? { userId: req.user.userId } : {},
      include: {
        bird: true,
        fromHabitat: { include: { dome: true } },
        toHabitat: { include: { dome: true } },
        responsible: { select: { fullName: true, username: true } },
        approvedBy: { select: { fullName: true, username: true } }
      },
      orderBy: { movedAt: 'desc' }
    });
    res.json(transfers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/bird/:birdId', authorize(['super_admin', 'head_keeper', 'keeper']), async (req, res) => {
  try {
    const transfers = await prisma.birdTransfer.findMany({
      where: {
        birdId: Number(req.params.birdId),
        ...(req.user.role === 'keeper' ? { userId: req.user.userId } : {})
      },
      include: { fromHabitat: true, toHabitat: true, responsible: { select: { fullName: true } } },
      orderBy: { movedAt: 'desc' }
    });
    res.json(transfers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', authorize(['super_admin', 'keeper']), async (req, res) => {
  try {
    const birdId = Number(req.body.birdId);
    const toHabitatId = Number(req.body.toHabitatId);
    const movedAt = req.body.movedAt ? new Date(req.body.movedAt) : new Date();
    if (!Number.isInteger(birdId) || birdId < 1 || !Number.isInteger(toHabitatId) || toHabitatId < 1
      || Number.isNaN(movedAt.getTime())) {
      return res.status(400).json({ message: 'Burung, habitat tujuan, dan tanggal perpindahan harus valid.' });
    }
    const result = await prisma.$transaction(async (tx) => {
      const bird = await tx.bird.findUnique({ where: { id: birdId } });
      if (!bird) {
        const error = new Error('Burung tidak ditemukan.');
        error.status = 404;
        throw error;
      }
      if (bird.habitatId === toHabitatId) {
        const error = new Error('Habitat tujuan sama dengan habitat burung saat ini.');
        error.status = 400;
        throw error;
      }
      const destination = await tx.habitat.findUnique({ where: { id: toHabitatId } });
      if (!destination) {
        const error = new Error('Habitat tujuan tidak ditemukan.');
        error.status = 400;
        throw error;
      }
      const transfer = await tx.birdTransfer.create({
        data: {
          birdId,
          fromHabitatId: bird.habitatId,
          toHabitatId,
          movedAt,
          reason: req.body.reason || null,
          userId: req.user.userId,
          isQuarantine: Boolean(req.body.isQuarantine),
          approvalStatus: 'pending'
        }
      });
      return transfer;
    });
    res.status(201).json(result);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

router.patch('/:id/review', authorize(['head_keeper']), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { action, note } = req.body;
    if (!Number.isInteger(id) || id < 1 || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({ message: 'Keputusan verifikasi tidak valid.' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const current = await tx.birdTransfer.findUnique({ where: { id } });
      if (!current) {
        const error = new Error('Pengajuan perpindahan tidak ditemukan.');
        error.status = 404;
        throw error;
      }
      if (current.approvalStatus !== 'pending') {
        const error = new Error('Pengajuan ini sudah diverifikasi.');
        error.status = 409;
        throw error;
      }

      const transfer = await tx.birdTransfer.update({
        where: { id },
        data: {
          approvalStatus: action === 'approve' ? 'approved' : 'rejected',
          approvedById: req.user.userId,
          approvedAt: new Date(),
          reviewNote: typeof note === 'string' ? note.trim() || null : null
        },
        include: {
          bird: true,
          fromHabitat: true,
          toHabitat: true,
          responsible: { select: { fullName: true, username: true } }
        }
      });
      if (action === 'approve') {
        await tx.bird.update({
          where: { id: current.birdId },
          data: { habitatId: current.toHabitatId }
        });
      }
      return transfer;
    });
    res.json(result);
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
});

module.exports = router;
