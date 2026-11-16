const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { authorize, normalizeRole } = require('../lib/rbac');

const prisma = new PrismaClient();

const authenticate = async (req, res, next) => {
  const authHeader = req.header('Authorization');
  if (!authHeader) {
    return res.status(401).json({ message: 'Authorization header is missing' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Token is missing' });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_key');
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }

  if (!Number.isInteger(decoded.userId)) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, role: true, isActive: true }
    });
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'User session is no longer valid' });
    }
    const role = normalizeRole(user.role);
    if (!role) {
      return res.status(403).json({ message: 'Role akun tidak dikenali.' });
    }
    req.user = { ...decoded, role };
    return next();
  } catch (error) {
    console.error('Failed to validate authenticated user:', error);
    return res.status(500).json({ message: 'Unable to verify user session' });
  }
};

module.exports = { authenticate, authorize };
