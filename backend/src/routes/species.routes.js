const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

const prisma = new PrismaClient();
const getSpeciesData = (body) => {
  const fields = [
    'scientificName', 'localName', 'conservationStatus', 'dietType', 'keyTrait',
    'distributionStatus', 'vegetation', 'isProtected', 'avgLifespan',
    'description', 'photoUrl', 'isRare'
  ];
  return Object.fromEntries(fields
    .filter((field) => body[field] !== undefined)
    .map((field) => [field, body[field]]));
};

// Get all species
router.get('/', authenticate, async (req, res) => {
  try {
    const species = await prisma.species.findMany();
    res.json(species);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get specific species
router.get('/:id', authenticate, async (req, res) => {
  try {
    const species = await prisma.species.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { birds: true }
    });
    if (!species) return res.status(404).json({ message: 'Species not found' });
    res.json(species);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add new species
router.post('/', authenticate, authorize(['super_admin', 'head_keeper', 'keeper']), async (req, res) => {
  try {
    const species = await prisma.species.create({
      data: getSpeciesData(req.body)
    });
    res.status(201).json(species);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update species
router.put('/:id', authenticate, authorize(['super_admin', 'head_keeper', 'keeper']), async (req, res) => {
  try {
    const species = await prisma.species.update({
      where: { id: parseInt(req.params.id) },
      data: getSpeciesData(req.body)
    });
    res.json(species);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete species
router.delete('/:id', authenticate, authorize(['super_admin', 'head_keeper', 'keeper']), async (req, res) => {
  try {
    await prisma.species.delete({
      where: { id: parseInt(req.params.id) }
    });
    res.json({ message: 'Species deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
