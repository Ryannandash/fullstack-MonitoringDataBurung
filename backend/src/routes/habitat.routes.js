const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

const prisma = new PrismaClient();

// Get all habitats
router.get('/', authenticate, async (req, res) => {
  try {
    const { domeId } = req.query;
    const filter = domeId ? { domeId: parseInt(domeId) } : {};

    const habitats = await prisma.habitat.findMany({
      where: filter,
      include: { dome: true }
    });
    res.json(habitats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get specific habitat
router.get('/:id', authenticate, async (req, res) => {
  try {
    const habitat = await prisma.habitat.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { dome: true, birds: true }
    });
    if (!habitat) return res.status(404).json({ message: 'Habitat not found' });
    res.json(habitat);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add new habitat
router.post('/', authenticate, authorize(['super_admin', 'head_keeper', 'keeper']), async (req, res) => {
  try {
    const habitat = await prisma.habitat.create({
      data: req.body
    });
    res.status(201).json(habitat);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update habitat
router.put('/:id', authenticate, authorize(['super_admin', 'head_keeper', 'keeper']), async (req, res) => {
  try {
    const habitat = await prisma.habitat.update({
      where: { id: parseInt(req.params.id) },
      data: req.body
    });
    res.json(habitat);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete habitat
router.delete('/:id', authenticate, authorize(['super_admin', 'head_keeper', 'keeper']), async (req, res) => {
  try {
    await prisma.habitat.delete({
      where: { id: parseInt(req.params.id) }
    });
    res.json({ message: 'Habitat deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
