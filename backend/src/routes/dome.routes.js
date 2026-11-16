const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

const prisma = new PrismaClient();

// Get all domes
router.get('/', authenticate, async (req, res) => {
  try {
    const domes = await prisma.dome.findMany({
      include: { habitats: true }
    });
    res.json(domes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get specific dome
router.get('/:id', authenticate, async (req, res) => {
  try {
    const dome = await prisma.dome.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { habitats: true }
    });
    if (!dome) return res.status(404).json({ message: 'Dome not found' });
    res.json(dome);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add new dome
router.post('/', authenticate, authorize(['super_admin', 'head_keeper', 'keeper']), async (req, res) => {
  try {
    const dome = await prisma.dome.create({
      data: req.body
    });
    res.status(201).json(dome);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update dome
router.put('/:id', authenticate, authorize(['super_admin', 'head_keeper', 'keeper']), async (req, res) => {
  try {
    const dome = await prisma.dome.update({
      where: { id: parseInt(req.params.id) },
      data: req.body
    });
    res.json(dome);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete dome
router.delete('/:id', authenticate, authorize(['super_admin', 'head_keeper', 'keeper']), async (req, res) => {
  try {
    await prisma.dome.delete({
      where: { id: parseInt(req.params.id) }
    });
    res.json({ message: 'Dome deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
