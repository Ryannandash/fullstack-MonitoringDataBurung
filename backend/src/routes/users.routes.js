const express = require('express');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const { ROLES, normalizeRole } = require('../lib/rbac');

const router = express.Router();
const prisma = new PrismaClient();
const publicUser = {
  id: true,
  username: true,
  fullName: true,
  email: true,
  phone: true,
  role: true,
  isActive: true,
  createdAt: true
};

router.use(authenticate, authorize(['super_admin']));

router.get('/', async (req, res) => {
  try {
    const search = String(req.query.search || '').trim();
    const role = req.query.role ? normalizeRole(req.query.role) : null;
    if (req.query.role && !role) return res.status(400).json({ message: 'Filter role tidak valid.' });
    const where = {
      ...(role ? { role: role === 'super_admin' ? { in: ['super_admin', 'admin'] } : role } : {}),
      ...(req.query.active === 'true' ? { isActive: true } : req.query.active === 'false' ? { isActive: false } : {}),
      ...(search ? {
        OR: [
          { username: { contains: search } },
          { fullName: { contains: search } },
          { email: { contains: search } }
        ]
      } : {})
    };
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 20));
    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        select: publicUser,
        orderBy: [{ fullName: 'asc' }, { username: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize
      })
    ]);
    res.json({
      data: users.map((user) => ({ ...user, role: normalizeRole(user.role) })),
      page,
      pageSize,
      total
    });
  } catch (error) {
    res.status(500).json({ message: 'Gagal memuat pengguna.', error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { username, fullName, email, password, phone, role } = req.body;
    const normalizedRole = normalizeRole(role);
    if (!username?.trim() || !fullName?.trim() || !email?.trim() || !password || !normalizedRole) {
      return res.status(400).json({ message: 'Nama, username, email, password, dan role wajib diisi.' });
    }
    if (!ROLES.includes(normalizedRole)) return res.status(400).json({ message: 'Role tidak valid.' });
    if (password.length < 8) return res.status(400).json({ message: 'Password minimal 8 karakter.' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ message: 'Format email tidak valid.' });
    }

    const user = await prisma.user.create({
      data: {
        username: username.trim(),
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone?.trim() || null,
        role: normalizedRole,
        passwordHash: await bcrypt.hash(password, 12)
      },
      select: publicUser
    });
    res.status(201).json({ ...user, role: normalizeRole(user.role) });
  } catch (error) {
    res.status(error.code === 'P2002' ? 409 : 500).json({
      message: error.code === 'P2002' ? 'Username atau email sudah digunakan.' : 'Gagal membuat pengguna.',
      error: error.code === 'P2002' ? undefined : error.message
    });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) return res.status(400).json({ message: 'ID pengguna tidak valid.' });
    const current = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true, isActive: true } });
    if (!current) return res.status(404).json({ message: 'Pengguna tidak ditemukan.' });

    const data = {};
    if (req.body.username !== undefined) {
      if (!req.body.username.trim()) return res.status(400).json({ message: 'Username tidak boleh kosong.' });
      data.username = req.body.username.trim();
    }
    if (req.body.fullName !== undefined) {
      if (!req.body.fullName.trim()) return res.status(400).json({ message: 'Nama lengkap tidak boleh kosong.' });
      data.fullName = req.body.fullName.trim();
    }
    if (req.body.email !== undefined) {
      const email = req.body.email.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ message: 'Format email tidak valid.' });
      data.email = email;
    }
    if (req.body.phone !== undefined) data.phone = req.body.phone?.trim() || null;
    if (req.body.role !== undefined) {
      const role = normalizeRole(req.body.role);
      if (!role || !ROLES.includes(role)) return res.status(400).json({ message: 'Role tidak valid.' });
      data.role = role;
    }
    if (req.body.isActive !== undefined) {
      if (typeof req.body.isActive !== 'boolean') return res.status(400).json({ message: 'Status akun tidak valid.' });
      data.isActive = req.body.isActive;
    }
    if (req.body.password !== undefined) {
      if (typeof req.body.password !== 'string' || req.body.password.length < 8) {
        return res.status(400).json({ message: 'Password baru minimal 8 karakter.' });
      }
      data.passwordHash = await bcrypt.hash(req.body.password, 12);
    }

    const wasSuperAdmin = normalizeRole(current.role) === 'super_admin' && current.isActive;
    const willBeSuperAdmin = normalizeRole(data.role ?? current.role) === 'super_admin' && (data.isActive ?? current.isActive);
    if (wasSuperAdmin && !willBeSuperAdmin) {
      const activeAdmins = await prisma.user.count({ where: { role: { in: ['admin', 'super_admin'] }, isActive: true } });
      if (activeAdmins <= 1) return res.status(409).json({ message: 'Akun Super Admin aktif terakhir tidak dapat dinonaktifkan atau diturunkan rolenya.' });
    }

    const user = await prisma.user.update({ where: { id }, data, select: publicUser });
    res.json({ ...user, role: normalizeRole(user.role) });
  } catch (error) {
    res.status(error.code === 'P2002' ? 409 : error.code === 'P2025' ? 404 : 500).json({
      message: error.code === 'P2002' ? 'Username atau email sudah digunakan.' : 'Gagal memperbarui pengguna.',
      error: ['P2002', 'P2025'].includes(error.code) ? undefined : error.message
    });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) return res.status(400).json({ message: 'ID pengguna tidak valid.' });
    if (id === req.user.userId) return res.status(400).json({ message: 'Akun yang sedang digunakan tidak dapat dinonaktifkan.' });
    const user = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true, isActive: true } });
    if (!user) return res.status(404).json({ message: 'Pengguna tidak ditemukan.' });
    if (normalizeRole(user.role) === 'super_admin' && user.isActive) {
      const activeAdmins = await prisma.user.count({ where: { role: { in: ['admin', 'super_admin'] }, isActive: true } });
      if (activeAdmins <= 1) return res.status(409).json({ message: 'Super Admin aktif terakhir tidak dapat dinonaktifkan.' });
    }
    await prisma.user.update({ where: { id }, data: { isActive: false } });
    res.json({ message: 'Pengguna dinonaktifkan. Riwayat dan data terkait tetap disimpan.' });
  } catch (error) {
    res.status(500).json({ message: 'Gagal menonaktifkan pengguna.', error: error.message });
  }
});

module.exports = router;
