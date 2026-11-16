export function formatDate(d, opts = {}) {
  if (!d) return '—'
  const date = new Date(d)
  if (isNaN(date)) return '—'
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', ...opts })
}

export function formatDateTime(d) {
  if (!d) return '—'
  const date = new Date(d)
  if (isNaN(date)) return '—'
  return date.toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function formatReminderBirds(reminder) {
  const formatBird = (bird) => {
    if (!bird) return ''
    const name = bird.name || bird.ringNumber || 'Burung'
    const gender = bird.gender === 'male' ? 'Jantan' : bird.gender === 'female' ? 'Betina' : 'Belum diketahui'
    return `${name} (${gender})`
  }

  if (reminder?.type === 'hatching') {
    return [formatBird(reminder.bird), formatBird(reminder.mateBird)].filter(Boolean).join(' × ')
  }
  return reminder?.bird?.name || reminder?.bird?.ringNumber || '—'
}

// Bird has birthDate (DateTime, optional) — no separate "age" column in the schema,
// so age is always derived on the client from birthDate.
export function ageFromBirthDate(birthDate) {
  if (!birthDate) return '—'
  const birth = new Date(birthDate)
  if (isNaN(birth)) return '—'
  const now = new Date()
  let years = now.getFullYear() - birth.getFullYear()
  let months = now.getMonth() - birth.getMonth()
  if (months < 0) { years--; months += 12 }
  if (years <= 0) return `${months} bln`
  return `${years} thn ${months} bln`
}

export function initials(name) {
  if (!name) return '?'
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('')
}

export function normalizeRole(role) {
  const raw = String(role || 'keeper').trim().toLowerCase().replace(/[\s-]+/g, '_')
  if (raw === 'admin' || raw === 'administrator' || raw === 'superadmin' || raw === 'super_admin') return 'super_admin'
  if (raw === 'headkeeper' || raw === 'head_keeper') return 'head_keeper'
  if (raw === 'keeper') return 'keeper'
  if (raw === 'dokter_hewan' || raw === 'doctor' || raw === 'veterinarian' || raw === 'vet') return 'dokter_hewan'
  return 'unknown'
}

export function getRoleLabel(role) {
  const normalized = normalizeRole(role)
  const labels = {
    super_admin: 'Super Admin',
    head_keeper: 'Head Keeper',
    keeper: 'Keeper',
    dokter_hewan: 'Dokter Hewan'
  }

  return labels[normalized] || 'Pengguna'
}
