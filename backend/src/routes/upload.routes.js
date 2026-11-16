const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middlewares/auth.middleware');

const router = express.Router();
const prisma = new PrismaClient();
const uploadDirectory = path.join(__dirname, '../../uploads');
fs.mkdirSync(uploadDirectory, { recursive: true });
const extensionsByType = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'application/pdf': '.pdf'
};

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDirectory,
    filename: (req, file, callback) => {
      const extension = extensionsByType[file.mimetype];
      callback(null, `${crypto.randomBytes(16).toString('hex')}${extension}`);
    }
  }),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, callback) => {
    const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm', 'application/pdf']);
    if (!allowedTypes.has(file.mimetype)) {
      return callback(new Error('File harus berupa JPEG, PNG, WebP, MP4, WebM, atau PDF.'));
    }
    callback(null, true);
  }
});

router.get('/', authenticate, async (req, res) => {
  try {
    const where = {};
    for (const field of ['birdId', 'userId']) {
      if (req.query[field] === undefined || req.query[field] === '') continue;
      const id = Number(req.query[field]);
      if (!Number.isInteger(id) || id < 1) return res.status(400).json({ message: `Filter ${field} tidak valid.` });
      where[field] = id;
    }
    if (req.query.category) where.category = String(req.query.category);
    if (req.query.date) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(req.query.date))) {
        return res.status(400).json({ message: 'Filter tanggal tidak valid.' });
      }
      const start = new Date(`${req.query.date}T00:00:00.000Z`);
      if (Number.isNaN(start.getTime()) || start.toISOString().slice(0, 10) !== req.query.date) {
        return res.status(400).json({ message: 'Filter tanggal tidak valid.' });
      }
      const end = new Date(start);
      end.setUTCDate(end.getUTCDate() + 1);
      where.createdAt = { gte: start, lt: end };
    }
    const documents = await prisma.mediaDocument.findMany({
      where,
      include: { bird: true, user: { select: { fullName: true, username: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(documents);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', authenticate, (req, res, next) => {
  upload.single('file')(req, res, (error) => {
    if (error) return res.status(400).json({ message: error.message });
    next();
  });
}, async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'File wajib dipilih.' });
  try {
    const birdId = req.body.birdId ? Number(req.body.birdId) : null;
    if (birdId) await prisma.bird.findUniqueOrThrow({ where: { id: birdId } });
    const document = await prisma.mediaDocument.create({
      data: {
        birdId,
        userId: req.user.userId,
        category: req.body.category || 'general',
        fileName: req.file.originalname.slice(0, 191),
        fileUrl: `/uploads/${req.file.filename}`,
        mimeType: req.file.mimetype,
        sizeBytes: req.file.size,
        description: req.body.description || null
      }
    });
    res.status(201).json(document);
  } catch (error) {
    fs.unlink(req.file.path, (unlinkError) => {
      if (unlinkError) console.error('Failed to remove rejected upload:', unlinkError);
    });
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', authenticate, async (req, res) => {
  try {
    const document = await prisma.mediaDocument.findUniqueOrThrow({ where: { id: Number(req.params.id) } });
    if (req.user.role !== 'super_admin' && document.userId !== req.user.userId) {
      return res.status(403).json({ message: 'Anda hanya dapat menghapus dokumentasi yang diunggah sendiri.' });
    }
    const filePath = path.join(uploadDirectory, path.basename(document.fileUrl));
    await prisma.mediaDocument.delete({ where: { id: document.id } });
    fs.unlink(filePath, (error) => {
      if (error && error.code !== 'ENOENT') console.error('Failed to remove uploaded file:', error);
    });
    res.json({ message: 'Dokumentasi berhasil dihapus.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
