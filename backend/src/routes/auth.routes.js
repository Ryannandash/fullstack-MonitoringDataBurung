const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { authenticate } = require('../middlewares/auth.middleware');
const { normalizeRole } = require('../lib/rbac');

const prisma = new PrismaClient();
const MAX_PROFILE_IMAGE_BYTES = 800_000;

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (typeof username !== 'string' || typeof password !== 'string' || !username.trim() || !password) {
      return res.status(400).json({ message: 'Username dan password wajib diisi.' });
    }
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user || !user.isActive) return res.status(401).json({ message: 'Username atau password salah.' });

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) return res.status(401).json({ message: 'Username atau password salah.' });
    const role = normalizeRole(user.role);
    if (!role) return res.status(403).json({ message: 'Role akun tidak dikenali.' });

    const token = jwt.sign(
      { userId: user.id, username: user.username, role },
      process.env.JWT_SECRET || 'secret_key',
      { expiresIn: '24h' }
    );
    res.json({ token, role });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { id: true, username: true, role: true, fullName: true, email: true, profileUrl: true, createdAt: true }
    });
    res.json(user ? { ...user, role: normalizeRole(user.role) } : null);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/me', authenticate, async (req, res) => {
  try {
    const { fullName, username, profileUrl } = req.body;

    if (
      typeof profileUrl === 'string' &&
      profileUrl.startsWith('data:image/') &&
      Buffer.byteLength(profileUrl, 'utf8') > MAX_PROFILE_IMAGE_BYTES
    ) {
      return res.status(413).json({ message: 'Foto profil terlalu besar. Silakan pilih foto yang lebih kecil.' });
    }

    // Check if username is already taken by another user
    if (username) {
      const existing = await prisma.user.findFirst({
        where: { username, id: { not: req.user.userId } }
      });
      if (existing) return res.status(400).json({ message: 'Username sudah digunakan' });
    }

    const updated = await prisma.user.update({
      where: { id: req.user.userId },
      data: { fullName, username, profileUrl }
    });
    res.json({ message: 'Profil berhasil diperbarui', user: { id: updated.id, username: updated.username, fullName: updated.fullName, profileUrl: updated.profileUrl } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/password', authenticate, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });

    const isValid = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!isValid) return res.status(400).json({ message: 'Password lama salah' });

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: req.user.userId },
      data: { passwordHash }
    });
    res.json({ message: 'Password berhasil diubah' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
