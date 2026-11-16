const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

const prisma = new PrismaClient();

// Get all birds (filter by species, dome)
router.get('/', authenticate, async (req, res) => {
  try {
    const { speciesId, domeId } = req.query;
    const filter = {};
    if (speciesId) filter.speciesId = parseInt(speciesId);
    if (domeId) filter.habitat = { domeId: parseInt(domeId) };

    const birds = await prisma.bird.findMany({
      where: filter,
      include: { species: true, habitat: { include: { dome: true } } }
    });
    res.json(birds);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get specific bird
router.get('/:id', authenticate, async (req, res) => {
  try {
    const bird = await prisma.bird.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { species: true, habitat: { include: { dome: true } } }
    });
    if (!bird) return res.status(404).json({ message: 'Bird not found' });
    res.json(bird);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add new bird
router.post('/', authenticate, authorize(['super_admin', 'head_keeper', 'keeper']), async (req, res) => {
  try {
    const bird = await prisma.bird.create({
      data: req.body
    });
    res.status(201).json(bird);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update bird
router.put('/:id', authenticate, authorize(['super_admin', 'head_keeper', 'keeper']), async (req, res) => {
  try {
    const bird = await prisma.bird.update({
      where: { id: parseInt(req.params.id) },
      data: req.body
    });
    res.json(bird);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Soft delete / delete bird (Prisma doesn't have native soft delete without custom middleware, so we do hard delete or add deletedAt field. Here we hard delete)
router.delete('/:id', authenticate, authorize(['super_admin', 'head_keeper', 'keeper']), async (req, res) => {
  try {
    await prisma.bird.delete({
      where: { id: parseInt(req.params.id) }
    });
    res.json({ message: 'Bird deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
