const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middlewares/auth.middleware');

const router = express.Router();
const prisma = new PrismaClient();

router.get('/', authenticate, async (req, res) => {
  try {
    const logs = await prisma.auditLog.findMany({
      take: 200,
      include: { user: { select: { fullName: true, username: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
