const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const { normalizeRole } = require('../lib/rbac');

const router = express.Router();
const prisma = new PrismaClient();
const REPORT_STATUSES = new Set(['DRAFT', 'MENUNGGU_VERIFIKASI', 'DISETUJUI', 'PERLU_REVISI']);
const TASK_STATUSES = new Set(['DITUGASKAN', 'DIKERJAKAN', 'SELESAI']);
const HEALTH_CONDITIONS = new Set(['sehat', 'sakit', 'dalam_pemulihan']);

router.use(authenticate);

const parseId = (value) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

const parseDate = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const dayRange = (date) => {
  const start = new Date(date);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
};

const notify = async ({ userId = null, role = null, title, message, type = 'INFO', link = null }) => (
  prisma.notification.create({ data: { userId, role, title, message, type, link } })
);

const canViewOwnedRecord = (record, req, ownerField = 'userId') => (
  ['super_admin', 'head_keeper'].includes(req.user.role) || record[ownerField] === req.user.userId
);

const getDailyEvents = async (report, viewerRole) => {
  const { start, end } = dayRange(report.reportDate);
  const userScope = ['super_admin', 'head_keeper'].includes(viewerRole) ? {} : { userId: report.userId };
  const birdInclude = { bird: { select: { id: true, name: true, ringNumber: true } } };
  const [activities, trainings, cleanings, health, transfers, breeding] = await Promise.all([
    prisma.activityLog.findMany({
      where: { ...userScope, activityTime: { gte: start, lt: end } },
      include: { ...birdInclude, user: { select: { id: true, fullName: true, role: true } } }
    }),
    prisma.trainingRecord.findMany({
      where: { trainedAt: { gte: start, lt: end }, ...(userScope.userId ? { trainerId: userScope.userId } : {}) },
      include: { ...birdInclude, trainer: { select: { id: true, fullName: true, role: true } } }
    }),
    prisma.cleaningRecord.findMany({
      where: { ...userScope, cleanedAt: { gte: start, lt: end } },
      include: { habitat: true, user: { select: { id: true, fullName: true, role: true } } }
    }),
    prisma.healthRecord.findMany({
      where: {
        ...(userScope.userId ? { OR: [{ userId: userScope.userId }, { reporterId: userScope.userId }, { doctorId: userScope.userId }] } : {}),
        examinationDate: { gte: start, lt: end }
      },
      include: { ...birdInclude, user: { select: { id: true, fullName: true, role: true } } }
    }),
    prisma.birdTransfer.findMany({
      where: { ...userScope, movedAt: { gte: start, lt: end } },
      include: { ...birdInclude, responsible: { select: { id: true, fullName: true, role: true } } }
    }),
    prisma.breedingRecord.findMany({
      where: {
        ...(userScope.userId ? { createdById: userScope.userId } : {}),
        OR: [
          { matingDate: { gte: start, lt: end } },
          { eggLayingDate: { gte: start, lt: end } },
          { hatchingDate: { gte: start, lt: end } }
        ]
      },
      include: { ...birdInclude, createdBy: { select: { id: true, fullName: true, role: true } } }
    })
  ]);

  const events = [
    ...activities.map((item) => ({
      id: `activity-${item.id}`, source: 'Daily Activity', date: item.activityTime,
      type: item.activityType, detail: item.description, bird: item.bird, user: item.user, photoUrl: item.photoUrl
    })),
    ...trainings.map((item) => ({
      id: `training-${item.id}`, source: 'Pelatihan Burung', date: item.trainedAt,
      type: item.title, detail: item.outcome || item.notes, bird: item.bird, user: item.trainer, photoUrl: item.photoUrl
    })),
    ...cleanings.map((item) => ({
      id: `cleaning-${item.id}`, source: 'Kebersihan Kandang', date: item.cleanedAt,
      type: `Pembersihan ${item.area}`, detail: item.notes, habitat: item.habitat, user: item.user, photoUrl: item.photoUrl
    })),
    ...health.map((item) => ({
      id: `health-${item.id}`, source: 'Kesehatan Burung', date: item.examinationDate,
      type: 'Pemeriksaan kesehatan', detail: viewerRole === 'keeper'
        ? `Kondisi: ${item.condition}`
        : [item.condition, item.diagnosis, item.medicalAction || item.treatment].filter(Boolean).join(' · '),
      bird: item.bird, user: item.user, photoUrl: item.photoUrl
    })),
    ...transfers.map((item) => ({
      id: `transfer-${item.id}`, source: 'Perpindahan', date: item.movedAt,
      type: `Perpindahan (${item.approvalStatus})`, detail: item.reason, bird: item.bird, user: item.responsible
    })),
    ...breeding.map((item) => ({
      id: `breeding-${item.id}`, source: 'Breeding Record', date: item.hatchingDate || item.eggLayingDate || item.matingDate,
      type: `Reproduksi: ${item.status || 'catatan'}`, detail: item.notes, bird: item.bird, user: item.createdBy
    }))
  ];
  return events.sort((left, right) => new Date(right.date) - new Date(left.date));
};

const addRecordRoutes = ({ path, model, dateField, include, allowedRead, allowedWrite, ownerField, validate }) => {
  router.get(path, authorize(allowedRead), async (req, res) => {
    try {
      const where = ['super_admin', 'head_keeper'].includes(req.user.role) ? {} : { [ownerField]: req.user.userId };
      if (req.query.date) {
        const date = parseDate(req.query.date);
        if (!date) return res.status(400).json({ message: 'Filter tanggal tidak valid.' });
        const { start, end } = dayRange(date);
        where[dateField] = { gte: start, lt: end };
      }
      res.json(await prisma[model].findMany({ where, include, orderBy: { [dateField]: 'desc' } }));
    } catch (error) {
      res.status(500).json({ message: 'Gagal memuat catatan.', error: error.message });
    }
  });

  router.post(path, authorize(allowedWrite), async (req, res) => {
    try {
      const data = validate(req.body);
      if (data.error) return res.status(400).json({ message: data.error });
      data[ownerField] = req.user.userId;
      res.status(201).json(await prisma[model].create({ data, include }));
    } catch (error) {
      res.status(500).json({ message: 'Gagal menyimpan catatan.', error: error.message });
    }
  });

  router.put(`${path}/:id`, authorize(allowedWrite), async (req, res) => {
    try {
      const id = parseId(req.params.id);
      if (!id) return res.status(400).json({ message: 'ID catatan tidak valid.' });
      const current = await prisma[model].findUnique({ where: { id } });
      if (!current) return res.status(404).json({ message: 'Catatan tidak ditemukan.' });
      if (!canViewOwnedRecord(current, req, ownerField)) {
        return res.status(403).json({ message: 'Anda hanya dapat mengubah catatan sendiri.' });
      }
      const data = validate({ ...current, ...req.body });
      if (data.error) return res.status(400).json({ message: data.error });
      delete data[ownerField];
      res.json(await prisma[model].update({ where: { id }, data, include }));
    } catch (error) {
      res.status(500).json({ message: 'Gagal memperbarui catatan.', error: error.message });
    }
  });

  router.delete(`${path}/:id`, authorize(allowedWrite), async (req, res) => {
    try {
      const id = parseId(req.params.id);
      if (!id) return res.status(400).json({ message: 'ID catatan tidak valid.' });
      const current = await prisma[model].findUnique({ where: { id } });
      if (!current) return res.status(404).json({ message: 'Catatan tidak ditemukan.' });
      if (!canViewOwnedRecord(current, req, ownerField)) {
        return res.status(403).json({ message: 'Anda hanya dapat menghapus catatan sendiri.' });
      }
      await prisma[model].delete({ where: { id } });
      res.json({ message: 'Catatan berhasil dihapus.' });
    } catch (error) {
      res.status(500).json({ message: 'Gagal menghapus catatan.', error: error.message });
    }
  });
};

addRecordRoutes({
  path: '/training',
  model: 'trainingRecord',
  dateField: 'trainedAt',
  ownerField: 'trainerId',
  include: { bird: true, trainer: { select: { id: true, fullName: true, username: true } } },
  allowedRead: ['super_admin', 'head_keeper', 'keeper', 'dokter_hewan'],
  allowedWrite: ['super_admin', 'keeper'],
  validate: (body) => {
    const birdId = parseId(body.birdId);
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const trainedAt = body.trainedAt ? new Date(body.trainedAt) : new Date();
    if (!birdId || !title || title.length > 150 || Number.isNaN(trainedAt.getTime())) return { error: 'Burung, kegiatan latihan, dan tanggal yang valid wajib diisi.' };
    return {
      birdId,
      title,
      technique: body.technique || null,
      outcome: body.outcome || null,
      notes: body.notes || null,
      trainedAt,
      photoUrl: body.photoUrl || null
    };
  }
});

addRecordRoutes({
  path: '/cleaning',
  model: 'cleaningRecord',
  dateField: 'cleanedAt',
  ownerField: 'userId',
  include: { habitat: { include: { dome: true } }, user: { select: { id: true, fullName: true, username: true } } },
  allowedRead: ['super_admin', 'head_keeper', 'keeper'],
  allowedWrite: ['super_admin', 'keeper'],
  validate: (body) => {
    const habitatId = parseId(body.habitatId);
    const area = typeof body.area === 'string' ? body.area.trim() : '';
    const cleanedAt = body.cleanedAt ? new Date(body.cleanedAt) : new Date();
    if (!habitatId || !area || area.length > 120 || Number.isNaN(cleanedAt.getTime())) return { error: 'Habitat, area, dan tanggal yang valid wajib diisi.' };
    return {
      habitatId,
      area,
      cleanedAt,
      checklist: body.checklist || null,
      status: body.status || 'Selesai',
      notes: body.notes || null,
      photoUrl: body.photoUrl || null
    };
  }
});

router.get('/tasks/keepers', authorize(['super_admin', 'head_keeper']), async (req, res) => {
  try {
    const keepers = await prisma.user.findMany({
      where: { role: 'keeper', isActive: true },
      select: { id: true, fullName: true, username: true },
      orderBy: { fullName: 'asc' }
    });
    res.json(keepers);
  } catch (error) {
    res.status(500).json({ message: 'Gagal memuat daftar Keeper.', error: error.message });
  }
});

router.get('/tasks', authorize(['super_admin', 'head_keeper', 'keeper']), async (req, res) => {
  try {
    const where = req.user.role === 'keeper' ? { assignedToId: req.user.userId } : {};
    const tasks = await prisma.taskAssignment.findMany({
      where,
      include: {
        assignedBy: { select: { fullName: true, username: true } },
        assignedTo: { select: { id: true, fullName: true, username: true } },
        bird: true,
        habitat: true
      },
      orderBy: [{ dueAt: 'asc' }, { createdAt: 'desc' }]
    });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: 'Gagal memuat penugasan.', error: error.message });
  }
});

router.post('/tasks', authorize(['super_admin', 'head_keeper']), async (req, res) => {
  try {
    const assignedToId = parseId(req.body.assignedToId);
    const title = typeof req.body.title === 'string' ? req.body.title.trim() : '';
    const activityType = typeof req.body.activityType === 'string' ? req.body.activityType.trim() : '';
    const dueAt = req.body.dueAt ? new Date(req.body.dueAt) : null;
    if (!assignedToId || !title || title.length > 150 || !activityType || activityType.length > 50 || (dueAt && Number.isNaN(dueAt.getTime()))) {
      return res.status(400).json({ message: 'Keeper, judul, jenis tugas, dan tenggat yang valid wajib diisi.' });
    }
    const assignee = await prisma.user.findUnique({ where: { id: assignedToId }, select: { id: true, role: true, isActive: true } });
    if (!assignee || !assignee.isActive || normalizeRole(assignee.role) !== 'keeper') {
      return res.status(400).json({ message: 'Penugasan hanya dapat diberikan kepada Keeper aktif.' });
    }
    const task = await prisma.taskAssignment.create({
      data: {
        assignedById: req.user.userId,
        assignedToId,
        birdId: req.body.birdId ? parseId(req.body.birdId) : null,
        habitatId: req.body.habitatId ? parseId(req.body.habitatId) : null,
        title,
        activityType,
        details: req.body.details || null,
        dueAt
      }
    });
    await notify({
      userId: assignedToId,
      title: 'Penugasan baru',
      message: title,
      type: 'TASK',
      link: '/tasks'
    });
    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({ message: 'Gagal membuat penugasan.', error: error.message });
  }
});

router.put('/tasks/:id', authorize(['super_admin', 'head_keeper']), async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: 'ID penugasan tidak valid.' });
    const data = {};

    if (req.body.assignedToId !== undefined) {
      const assignedToId = parseId(req.body.assignedToId);
      if (!assignedToId) return res.status(400).json({ message: 'Keeper tidak valid.' });
      const assignee = await prisma.user.findUnique({ where: { id: assignedToId }, select: { id: true, role: true, isActive: true } });
      if (!assignee || !assignee.isActive || normalizeRole(assignee.role) !== 'keeper') {
        return res.status(400).json({ message: 'Penugasan hanya dapat diberikan kepada Keeper aktif.' });
      }
      data.assignedToId = assignedToId;
    }
    if (req.body.title !== undefined) {
      const title = typeof req.body.title === 'string' ? req.body.title.trim() : '';
      if (!title || title.length > 150) return res.status(400).json({ message: 'Judul tugas tidak valid.' });
      data.title = title;
    }
    if (req.body.activityType !== undefined) {
      const activityType = typeof req.body.activityType === 'string' ? req.body.activityType.trim() : '';
      if (!activityType || activityType.length > 50) return res.status(400).json({ message: 'Jenis tugas tidak valid.' });
      data.activityType = activityType;
    }
    for (const field of ['birdId', 'habitatId']) {
      if (req.body[field] === undefined) continue;
      if (req.body[field] === null || req.body[field] === '') {
        data[field] = null;
      } else {
        const value = parseId(req.body[field]);
        if (!value) return res.status(400).json({ message: `${field} tidak valid.` });
        data[field] = value;
      }
    }
    if (req.body.details !== undefined) data.details = req.body.details || null;
    if (req.body.dueAt !== undefined) {
      const dueAt = req.body.dueAt ? new Date(req.body.dueAt) : null;
      if (dueAt && Number.isNaN(dueAt.getTime())) return res.status(400).json({ message: 'Tenggat tugas tidak valid.' });
      data.dueAt = dueAt;
    }

    res.json(await prisma.taskAssignment.update({ where: { id }, data }));
  } catch (error) {
    res.status(error.code === 'P2025' ? 404 : 500).json({ message: 'Gagal memperbarui penugasan.', error: error.code === 'P2025' ? undefined : error.message });
  }
});

router.delete('/tasks/:id', authorize(['super_admin', 'head_keeper']), async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: 'ID penugasan tidak valid.' });
    await prisma.taskAssignment.delete({ where: { id } });
    res.json({ message: 'Penugasan berhasil dihapus.' });
  } catch (error) {
    res.status(error.code === 'P2025' ? 404 : 500).json({ message: 'Gagal menghapus penugasan.', error: error.code === 'P2025' ? undefined : error.message });
  }
});

router.patch('/tasks/:id/status', authorize(['super_admin', 'head_keeper', 'keeper']), async (req, res) => {
  try {
    const id = parseId(req.params.id);
    const status = req.body.status;
    if (!id || !TASK_STATUSES.has(status)) return res.status(400).json({ message: 'Status tugas tidak valid.' });
    const task = await prisma.taskAssignment.findUnique({ where: { id } });
    if (!task) return res.status(404).json({ message: 'Penugasan tidak ditemukan.' });
    if (req.user.role === 'keeper' && task.assignedToId !== req.user.userId) {
      return res.status(403).json({ message: 'Keeper hanya dapat memperbarui tugas yang ditujukan kepadanya.' });
    }
    if (req.user.role === 'keeper' && !['DIKERJAKAN', 'SELESAI'].includes(status)) {
      return res.status(403).json({ message: 'Keeper hanya dapat mulai atau menyelesaikan tugas.' });
    }
    res.json(await prisma.taskAssignment.update({
      where: { id },
      data: { status, completionNote: req.body.completionNote || undefined }
    }));
  } catch (error) {
    res.status(500).json({ message: 'Gagal memperbarui status tugas.', error: error.message });
  }
});

router.get('/daily-reports', authorize(['super_admin', 'head_keeper', 'keeper', 'dokter_hewan']), async (req, res) => {
  try {
    const where = ['super_admin', 'head_keeper'].includes(req.user.role) ? {} : { userId: req.user.userId };
    if (req.query.date) {
      const date = parseDate(req.query.date);
      if (!date) return res.status(400).json({ message: 'Filter tanggal laporan tidak valid.' });
      where.reportDate = date;
    }
    if (req.query.status) {
      if (!REPORT_STATUSES.has(req.query.status)) return res.status(400).json({ message: 'Filter status laporan tidak valid.' });
      where.status = req.query.status;
    }
    if (req.query.userId && ['super_admin', 'head_keeper'].includes(req.user.role)) {
      const userId = parseId(req.query.userId);
      if (!userId) return res.status(400).json({ message: 'Filter pengguna tidak valid.' });
      where.userId = userId;
    }
    const reports = await prisma.dailyReport.findMany({
      where,
      include: {
        user: { select: { id: true, username: true, fullName: true, role: true } },
        reviewer: { select: { id: true, username: true, fullName: true } },
        reviews: { orderBy: { createdAt: 'desc' }, include: { user: { select: { fullName: true, username: true } } } }
      },
      orderBy: [{ reportDate: 'desc' }, { createdAt: 'desc' }]
    });
    res.json(reports);
  } catch (error) {
    res.status(500).json({ message: 'Gagal memuat laporan harian.', error: error.message });
  }
});

router.post('/daily-reports', authorize(['keeper', 'dokter_hewan']), async (req, res) => {
  try {
    const reportDate = parseDate(req.body.reportDate || new Date().toISOString().slice(0, 10));
    if (!reportDate) return res.status(400).json({ message: 'Tanggal laporan tidak valid.' });
    const report = await prisma.dailyReport.upsert({
      where: { userId_reportDate: { userId: req.user.userId, reportDate } },
      create: { userId: req.user.userId, reportDate },
      update: {}
    });
    res.status(201).json(report);
  } catch (error) {
    res.status(500).json({ message: 'Gagal membuat draft laporan.', error: error.message });
  }
});

router.get('/daily-reports/:id', authorize(['super_admin', 'head_keeper', 'keeper', 'dokter_hewan']), async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: 'ID laporan tidak valid.' });
    const report = await prisma.dailyReport.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, username: true, fullName: true, role: true } },
        reviewer: { select: { id: true, username: true, fullName: true } },
        reviews: { orderBy: { createdAt: 'desc' }, include: { user: { select: { fullName: true, username: true } } } }
      }
    });
    if (!report) return res.status(404).json({ message: 'Laporan tidak ditemukan.' });
    if (!['super_admin', 'head_keeper'].includes(req.user.role) && report.userId !== req.user.userId) {
      return res.status(403).json({ message: 'Anda hanya dapat melihat laporan sendiri.' });
    }
    res.json({ ...report, events: await getDailyEvents(report, req.user.role) });
  } catch (error) {
    res.status(500).json({ message: 'Gagal memuat detail laporan.', error: error.message });
  }
});

router.post('/daily-reports/:id/submit', authorize(['keeper', 'dokter_hewan']), async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: 'ID laporan tidak valid.' });
    const report = await prisma.dailyReport.findUnique({ where: { id } });
    if (!report || report.userId !== req.user.userId) return res.status(404).json({ message: 'Draft laporan tidak ditemukan.' });
    if (!['DRAFT', 'PERLU_REVISI'].includes(report.status)) return res.status(409).json({ message: 'Status laporan ini tidak dapat dikirim.' });
    const submitted = await prisma.dailyReport.update({
      where: { id },
      data: { status: 'MENUNGGU_VERIFIKASI', submittedAt: new Date(), reviewerId: null, reviewedAt: null }
    });
    const heads = await prisma.user.findMany({ where: { role: 'head_keeper', isActive: true }, select: { id: true } });
    await Promise.all(heads.map((head) => notify({
      userId: head.id,
      title: 'Laporan harian menunggu verifikasi',
      message: `Laporan ${submitted.reportDate.toISOString().slice(0, 10)} siap diperiksa.`,
      type: 'DAILY_REPORT',
      link: `/daily-reports/${submitted.id}`
    })));
    res.json(submitted);
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengirim laporan harian.', error: error.message });
  }
});

router.post('/daily-reports/:id/review', authorize(['head_keeper']), async (req, res) => {
  try {
    const id = parseId(req.params.id);
    const action = req.body.action;
    const note = typeof req.body.note === 'string' ? req.body.note.trim() : '';
    if (!id || !['approve', 'revision'].includes(action) || (action === 'revision' && !note)) {
      return res.status(400).json({ message: 'Keputusan valid dan catatan revisi wajib diisi jika meminta revisi.' });
    }
    const report = await prisma.dailyReport.findUnique({ where: { id } });
    if (!report) return res.status(404).json({ message: 'Laporan tidak ditemukan.' });
    if (report.status !== 'MENUNGGU_VERIFIKASI') return res.status(409).json({ message: 'Laporan belum menunggu verifikasi.' });
    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.dailyReport.update({
        where: { id },
        data: {
          status: action === 'approve' ? 'DISETUJUI' : 'PERLU_REVISI',
          reviewerId: req.user.userId,
          reviewedAt: new Date(),
          reviewNote: note || null
        }
      });
      await tx.dailyReportReview.create({
        data: { dailyReportId: id, userId: req.user.userId, action: action === 'approve' ? 'DISETUJUI' : 'PERLU_REVISI', note: note || null }
      });
      await tx.notification.create({
        data: {
          userId: report.userId,
          title: action === 'approve' ? 'Laporan harian disetujui' : 'Laporan harian perlu revisi',
          message: note || 'Laporan harian telah disetujui.',
          type: 'DAILY_REPORT',
          link: `/daily-reports/${id}`
        }
      });
      return updated;
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Gagal memverifikasi laporan.', error: error.message });
  }
});

router.get('/notifications', async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: {
        OR: [
          { userId: req.user.userId },
          { userId: null, role: req.user.role }
        ]
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    });
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: 'Gagal memuat notifikasi.', error: error.message });
  }
});

router.patch('/notifications/:id/read', async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: 'ID notifikasi tidak valid.' });
    const result = await prisma.notification.updateMany({
      where: { id, userId: req.user.userId },
      data: { readAt: new Date() }
    });
    if (!result.count) return res.status(404).json({ message: 'Notifikasi tidak ditemukan.' });
    res.json({ message: 'Notifikasi ditandai sudah dibaca.' });
  } catch (error) {
    res.status(500).json({ message: 'Gagal memperbarui notifikasi.' });
  }
});

router.patch('/notifications/read-all', async (req, res) => {
  try {
    const result = await prisma.notification.updateMany({
      where: { userId: req.user.userId, readAt: null },
      data: { readAt: new Date() }
    });
    res.json({ updated: result.count });
  } catch (error) {
    res.status(500).json({ message: 'Gagal memperbarui notifikasi.' });
  }
});

router.get('/medical-treatments', authorize(['super_admin', 'head_keeper', 'keeper', 'dokter_hewan']), async (req, res) => {
  try {
    const treatments = await prisma.medicalTreatment.findMany({
      include: {
        bird: true,
        healthRecord: { include: { bird: true } },
        user: { select: { fullName: true, username: true } }
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }]
    });
    res.json(treatments);
  } catch (error) {
    res.status(500).json({ message: 'Gagal memuat pengobatan.', error: error.message });
  }
});

router.post('/medical-treatments', authorize(['dokter_hewan']), async (req, res) => {
  try {
    const birdId = parseId(req.body.birdId);
    const timesPerDay = Number(req.body.timesPerDay);
    const durationDays = Number(req.body.durationDays);
    const nextCheckup = req.body.nextCheckup ? new Date(req.body.nextCheckup) : null;
    if (!birdId || !HEALTH_CONDITIONS.has(req.body.condition)
      || typeof req.body.symptoms !== 'string' || !req.body.symptoms.trim()
      || typeof req.body.medicine !== 'string' || !req.body.medicine.trim()
      || typeof req.body.dosage !== 'string' || !req.body.dosage.trim()
      || !Number.isInteger(timesPerDay) || timesPerDay < 1
      || !Number.isInteger(durationDays) || durationDays < 1
      || (nextCheckup && Number.isNaN(nextCheckup.getTime()))) {
      return res.status(400).json({ message: 'Burung, kondisi, gejala, obat, dosis, frekuensi, dan durasi wajib valid.' });
    }
    const now = new Date();
    const medicine = req.body.medicine.trim();
    const dosage = req.body.dosage.trim();
    const bird = await prisma.bird.findUnique({ where: { id: birdId }, select: { id: true } });
    if (!bird) return res.status(404).json({ message: 'Burung tidak ditemukan.' });
    const treatment = await prisma.medicalTreatment.create({
      data: {
        birdId,
        userId: req.user.userId,
        condition: req.body.condition,
        symptoms: req.body.symptoms.trim(),
        nextCheckup,
        medicine,
        dosage,
        timesPerDay,
        durationDays,
        instructions: typeof req.body.instructions === 'string' ? req.body.instructions.trim() || null : null,
        startsAt: now
      },
      include: { bird: true, user: { select: { fullName: true, username: true } } }
    });
    res.status(201).json(treatment);
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message || 'Gagal menyimpan pengobatan.' });
  }
});

router.put('/medical-treatments/:id', authorize(['dokter_hewan']), async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: 'ID pengobatan tidak valid.' });
    const current = await prisma.medicalTreatment.findUnique({ where: { id } });
    if (!current) return res.status(404).json({ message: 'Pengobatan tidak ditemukan.' });
    const data = {};

    if (req.body.condition !== undefined) {
      if (!HEALTH_CONDITIONS.has(req.body.condition)) return res.status(400).json({ message: 'Kondisi kesehatan tidak valid.' });
      data.condition = req.body.condition;
    }
    for (const field of ['medicine', 'dosage']) {
      if (req.body[field] === undefined) continue;
      if (typeof req.body[field] !== 'string' || !req.body[field].trim()) {
        return res.status(400).json({ message: 'Nama obat dan dosis wajib diisi.' });
      }
      data[field] = req.body[field].trim();
    }
    if (req.body.symptoms !== undefined
      && (typeof req.body.symptoms !== 'string' || !req.body.symptoms.trim())) {
      return res.status(400).json({ message: 'Gejala atau keluhan wajib diisi.' });
    }
    if (req.body.symptoms !== undefined) data.symptoms = req.body.symptoms.trim();
    let nextCheckup;
    if (req.body.nextCheckup !== undefined) {
      nextCheckup = req.body.nextCheckup ? new Date(req.body.nextCheckup) : null;
      if (nextCheckup && Number.isNaN(nextCheckup.getTime())) {
        return res.status(400).json({ message: 'Tanggal kontrol berikutnya tidak valid.' });
      }
      data.nextCheckup = nextCheckup;
    }
    if (req.body.timesPerDay !== undefined) {
      const timesPerDay = Number(req.body.timesPerDay);
      if (!Number.isInteger(timesPerDay) || timesPerDay < 1) return res.status(400).json({ message: 'Frekuensi pemberian obat tidak valid.' });
      data.timesPerDay = timesPerDay;
    }
    if (req.body.durationDays !== undefined) {
      const durationDays = Number(req.body.durationDays);
      if (!Number.isInteger(durationDays) || durationDays < 1) return res.status(400).json({ message: 'Durasi pengobatan tidak valid.' });
      data.durationDays = durationDays;
    }
    if (req.body.instructions !== undefined) data.instructions = req.body.instructions || null;
    const updated = await prisma.$transaction(async (tx) => {
      const treatment = await tx.medicalTreatment.update({
        where: { id },
        data,
        include: { bird: true, user: { select: { fullName: true, username: true } } }
      });
      return treatment;
    });
    res.json(updated);
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message || 'Gagal memperbarui pengobatan.' });
  }
});

router.delete('/medical-treatments/:id', authorize(['dokter_hewan']), async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: 'ID pengobatan tidak valid.' });
    const treatment = await prisma.medicalTreatment.findUnique({ where: { id }, select: { id: true } });
    if (!treatment) return res.status(404).json({ message: 'Pengobatan tidak ditemukan.' });
    await prisma.medicalTreatment.delete({ where: { id } });
    res.json({ message: 'Catatan pengobatan berhasil dihapus.' });
  } catch (error) {
    res.status(500).json({ message: 'Gagal menghapus pengobatan.', error: error.message });
  }
});

module.exports = router;
