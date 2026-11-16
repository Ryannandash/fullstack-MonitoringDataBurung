const ROLE_ALIASES = {
  admin: 'super_admin',
  administrator: 'super_admin',
  superadmin: 'super_admin',
  super_admin: 'super_admin',
  headkeeper: 'head_keeper',
  head_keeper: 'head_keeper',
  keeper: 'keeper',
  dokter_hewan: 'dokter_hewan',
  doctor: 'dokter_hewan',
  veterinarian: 'dokter_hewan',
  vet: 'dokter_hewan'
};

const ROLES = Object.freeze(['super_admin', 'head_keeper', 'keeper', 'dokter_hewan']);

const normalizeRole = (role) => {
  const key = String(role || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  return ROLE_ALIASES[key] || null;
};

const authorize = (allowedRoles) => (req, res, next) => {
  const role = normalizeRole(req.user?.role);
  if (!role || !allowedRoles.some((allowedRole) => normalizeRole(allowedRole) === role)) {
    return res.status(403).json({ message: 'Akses ditolak untuk role ini.' });
  }
  return next();
};

module.exports = { ROLES, normalizeRole, authorize };
