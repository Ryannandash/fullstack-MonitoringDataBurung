import { CheckCircle2, AlertCircle, Eye, HeartPulse, MinusCircle, Egg, Bird, XCircle, Clock } from 'lucide-react'

// statusHealth values keepers actually type in the DB tend to be free text.
// We map the common ones; anything else falls back to neutral so nothing breaks.
const HEALTH_MAP = {
  sehat: { cls: 'badge-success', icon: CheckCircle2 },
  healthy: { cls: 'badge-success', icon: CheckCircle2 },
  sakit: { cls: 'badge-danger', icon: AlertCircle },
  sick: { cls: 'badge-danger', icon: AlertCircle },
  dalam_pemulihan: { cls: 'badge-warning', icon: Clock },
  pemulihan: { cls: 'badge-warning', icon: Clock },
  observasi: { cls: 'badge-warning', icon: Eye },
  observation: { cls: 'badge-warning', icon: Eye },
  mati: { cls: 'badge-neutral', icon: MinusCircle },
  deceased: { cls: 'badge-neutral', icon: MinusCircle }
}

const BREEDING_MAP = {
  mating: { cls: 'badge-info', icon: HeartPulse },
  incubating: { cls: 'badge-warning', icon: Egg },
  hatched: { cls: 'badge-success', icon: Bird },
  failed: { cls: 'badge-danger', icon: XCircle }
}

export function HealthBadge({ status }) {
  if (!status) return <span className="badge badge-neutral">Belum diketahui</span>
  const key = status.toLowerCase()
  const m = HEALTH_MAP[key] || { cls: 'badge-neutral', icon: Clock }
  const Icon = m.icon
  const label = ['dalam_pemulihan', 'pemulihan'].includes(key) ? 'Dalam pemulihan' : status
  return <span className={`badge ${m.cls}`}><Icon size={11} />{label}</span>
}

export function BreedingBadge({ status }) {
  if (!status) return <span className="badge badge-neutral">—</span>
  const key = status.toLowerCase()
  const m = BREEDING_MAP[key] || { cls: 'badge-neutral', icon: Clock }
  const Icon = m.icon
  const labels = { mating: 'Mating (Kawin)', incubating: 'Incubating (Mengerami)', hatched: 'Hatched (Menetas)', failed: 'Failed (Gagal)' }
  return <span className={`badge ${m.cls}`}><Icon size={11} />{labels[key] || status}</span>
}

export function ConservationBadge({ status }) {
  if (!status) return <span className="badge badge-neutral">Tidak diketahui</span>
  const key = status.toLowerCase()
  const cls = key.includes('critically') ? 'badge-danger'
    : key.includes('endangered') ? 'badge-warning'
    : key.includes('vulnerable') ? 'badge-orange'
    : key.includes('near') ? 'badge-info'
    : 'badge-success'
  return <span className={`badge ${cls}`}>{status}</span>
}
