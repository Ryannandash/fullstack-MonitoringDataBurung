const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middlewares/auth.middleware');

const router = express.Router();
const prisma = new PrismaClient();

router.use(authenticate);

const presentItem = (item) => ({
  ...item,
  currentContainers: item.currentStock,
  minimumContainers: item.minimumStock,
  maximumContainers: item.maximumStock
});

const isNonNegativeNumber = (value) => Number.isFinite(Number(value)) && Number(value) >= 0;

router.get('/', async (req, res) => {
  try {
    const items = await prisma.feedInventoryItem.findMany({
      include: { movements: { take: 5, orderBy: { createdAt: 'desc' }, include: { user: { select: { fullName: true } } } } },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }]
    });
    res.json(items.map(presentItem));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    const usesContainers = req.body.currentContainers !== undefined || req.body.containerCapacityKg !== undefined;
    const containerCapacityKg = usesContainers ? Number(req.body.containerCapacityKg) : 40;
    const containerUnit = usesContainers
      ? String(req.body.containerUnit || '').trim()
      : (typeof req.body.unit === 'string' && req.body.unit.trim() ? req.body.unit.trim() : 'container');
    const currentContainers = usesContainers ? Number(req.body.currentContainers || 0) : null;
    const minimumContainers = usesContainers ? Number(req.body.minimumContainers || 0) : null;
    const maximumContainers = usesContainers && req.body.maximumContainers !== undefined && req.body.maximumContainers !== null && req.body.maximumContainers !== ''
      ? Number(req.body.maximumContainers)
      : null;
    const currentStock = usesContainers ? currentContainers : Number(req.body.currentStock || 0);
    const minimumStock = usesContainers ? minimumContainers : Number(req.body.minimumStock || 0);

    if (!name || !Number.isFinite(currentStock) || !Number.isFinite(minimumStock)
      || currentStock < 0 || minimumStock < 0
      || (usesContainers && (!containerUnit || !Number.isFinite(containerCapacityKg) || containerCapacityKg <= 0
        || !isNonNegativeNumber(currentContainers) || !isNonNegativeNumber(minimumContainers)
        || (maximumContainers !== null && !isNonNegativeNumber(maximumContainers))))
      || (maximumContainers !== null && (maximumContainers < minimumStock || currentStock > maximumContainers))) {
      return res.status(400).json({ message: 'Isi pakan, jumlah container, serta batas minimum dan maksimum harus valid.' });
    }
    const item = await prisma.$transaction(async (tx) => {
      const created = await tx.feedInventoryItem.create({
        data: {
          name,
          unit: usesContainers ? containerUnit : (req.body.unit || 'kg'),
          currentStock,
          minimumStock,
          maximumStock: maximumContainers,
          containerUnit,
          containerCapacityKg
        }
      });
      if (currentStock > 0) {
        await tx.feedStockMovement.create({
          data: {
            inventoryId: created.id,
            userId: req.user.userId,
            change: currentStock,
            note: usesContainers ? `Stok awal: ${currentContainers} ${containerUnit}` : 'Stok awal'
          }
        });
      }
      return created;
    });
    res.status(201).json(presentItem(item));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : undefined;
    if (!Number.isInteger(id) || id < 1 || (name !== undefined && !name)) {
      return res.status(400).json({ message: 'Data stok pakan tidak valid.' });
    }
    const item = await prisma.$transaction(async (tx) => {
      const current = await tx.feedInventoryItem.findUnique({ where: { id } });
      if (!current) {
        const error = new Error('Jenis pakan tidak ditemukan.');
        error.status = 404;
        throw error;
      }

      const containerUnit = req.body.containerUnit === undefined ? current.containerUnit : String(req.body.containerUnit).trim();
      const containerCapacityKg = req.body.containerCapacityKg === undefined
        ? current.containerCapacityKg
        : Number(req.body.containerCapacityKg);
      const minimumContainers = req.body.minimumContainers === undefined
        ? current.minimumStock
        : Number(req.body.minimumContainers);
      const maximumContainers = req.body.maximumContainers === undefined
        ? current.maximumStock
        : (req.body.maximumContainers === null || req.body.maximumContainers === '' ? null : Number(req.body.maximumContainers));

      if (!containerUnit || !Number.isFinite(containerCapacityKg) || containerCapacityKg <= 0
        || !isNonNegativeNumber(minimumContainers)
        || (maximumContainers !== null && !isNonNegativeNumber(maximumContainers))
        || (maximumContainers !== null && maximumContainers < minimumContainers)) {
        const error = new Error('Takaran container dan batas stok harus valid; batas maksimum tidak boleh kurang dari minimum.');
        error.status = 400;
        throw error;
      }

      return tx.feedInventoryItem.update({
        where: { id },
        data: {
          ...(name !== undefined ? { name } : {}),
          containerUnit,
          containerCapacityKg,
          minimumStock: minimumContainers,
          maximumStock: maximumContainers,
          unit: containerUnit
        }
      });
    });
    res.json(presentItem(item));
  } catch (error) {
    res.status(error.status || (error.code === 'P2025' ? 404 : 500)).json({ error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ message: 'ID stok pakan tidak valid.' });
    }
    await prisma.$transaction(async (tx) => {
      await tx.feedStockMovement.deleteMany({ where: { inventoryId: id } });
      await tx.feedInventoryItem.delete({ where: { id } });
    });
    res.json({ message: 'Jenis pakan berhasil dihapus.' });
  } catch (error) {
    res.status(error.code === 'P2025' ? 404 : 500).json({ error: error.message });
  }
});

router.post('/:id/adjust', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const changeInput = req.body.changeContainers === undefined ? Number(req.body.change) : Number(req.body.changeContainers);
    if (!Number.isInteger(id) || id < 1 || !Number.isFinite(changeInput) || changeInput === 0) {
      return res.status(400).json({ message: 'Perubahan stok harus berupa angka container bukan nol.' });
    }
    const item = await prisma.$transaction(async (tx) => {
      const existing = await tx.feedInventoryItem.findUnique({
        where: { id },
        select: { maximumStock: true }
      });
      if (!existing) {
        const error = new Error('Jenis pakan tidak ditemukan.');
        error.status = 404;
        throw error;
      }
      const changeContainers = changeInput;
      const updated = await tx.feedInventoryItem.updateMany({
        where: {
          id,
          ...(changeContainers < 0
            ? { currentStock: { gte: Math.abs(changeContainers) } }
            : existing.maximumStock !== null
              ? { currentStock: { lte: existing.maximumStock - changeContainers } }
              : {})
        },
        data: {
          ...(changeContainers > 0
            ? { currentStock: { increment: changeContainers } }
            : { currentStock: { decrement: Math.abs(changeContainers) } }),
          updatedAt: new Date()
        }
      });
      if (!updated.count) {
        const error = new Error(changeContainers > 0
          ? 'Penambahan melebihi batas maksimum stok.'
          : 'Stok tidak mencukupi untuk dikurangi.');
        error.status = 400;
        throw error;
      }
      await tx.feedStockMovement.create({
        data: {
          inventoryId: id,
          userId: req.user.userId,
          change: changeContainers,
          note: req.body.note || null
        }
      });
      return tx.feedInventoryItem.findUnique({ where: { id } });
    });
    res.json(presentItem(item));
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

module.exports = router;
