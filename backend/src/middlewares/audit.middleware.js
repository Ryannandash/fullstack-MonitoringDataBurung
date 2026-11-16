const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const actions = { POST: 'CREATE', PUT: 'UPDATE', PATCH: 'UPDATE', DELETE: 'DELETE' };

module.exports = (req, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    const action = actions[req.method];
    if (!action || !req.user?.userId || res.statusCode < 200 || res.statusCode >= 300) {
      return originalJson(body);
    }

    const segments = req.originalUrl.split('?')[0].split('/').filter(Boolean);
    const entity = segments[1] || 'unknown';
    const pathId = segments[2] && /^\d+$/.test(segments[2]) ? Number(segments[2]) : null;
    const entityId = pathId || (Number.isInteger(body?.id) ? body.id : null);
    const auditEntry = {
      userId: req.user.userId,
      action,
      entity,
      entityId,
      path: req.originalUrl.split('?')[0]
    };

    return prisma.auditLog.create({ data: auditEntry })
      .then(() => originalJson(body))
      .catch((error) => {
        console.error('Failed to write audit log:', error);
        if (!res.headersSent) {
          res.statusCode = 500;
          return originalJson({ error: 'Perubahan tersimpan, tetapi audit trail gagal dicatat.' });
        }
      });
  };
  next();
};
