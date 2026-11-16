import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Bird as BirdIcon, Stethoscope, Utensils, ArrowRight,
  MapPinned, Bell, ClipboardCheck, ListChecks
} from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { getBirds } from '../api/bird.api'
import { getSpeciesList } from '../api/species.api'
import { getBreedingRecords } from '../api/breeding.api'
import { getTodayFeeding } from '../api/feeding.api'
import { StatCard, KpiSkeleton, ErrorState } from '../components/ui/Misc'
import { formatDateTime, formatReminderBirds, getRoleLabel } from '../utils/format'
import { getDashboardSummary } from '../api/dashboard.api'
import { getReminders } from '../api/reminder.api'
import { useAuth } from '../context/AuthContext'

const PIE_COLORS = ['#F97316', '#FB923C', '#FDBA74', '#FED7AA', '#FFEDD5', '#22C55E', '#3B82F6', '#EF4444']

export default function DashboardPage() {
  const { role } = useAuth()
  const isVet = role === 'dokter_hewan'
  const isKeeper = role === 'keeper'
  const isHeadKeeper = role === 'head_keeper'
  const canSeeOperations = !isVet
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [birds, setBirds] = useState([])
  const [species, setSpecies] = useState([])
  const [allBreeding, setAllBreeding] = useState([])
  const [todayFeeding, setTodayFeeding] = useState([])
  const [summary, setSummary] = useState(null)
  const [reminders, setReminders] = useState([])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [b, s, allB, tf, dashboard, upcoming] = await Promise.all([
          getBirds(), getSpeciesList(), getBreedingRecords(),
          canSeeOperations ? getTodayFeeding() : Promise.resolve([]),
          getDashboardSummary(), getReminders(14)
        ])
        if (cancelled) return
        setBirds(b); setSpecies(s); setAllBreeding(allB)
        setTodayFeeding(tf)
        setSummary(dashboard); setReminders(upcoming)
      } catch (e) {
        if (!cancelled) setError(e?.response?.data?.error || e.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [canSeeOperations])

  if (error) return <ErrorState message={error} />

  const sickCount = birds.filter(b => (b.statusHealth || '').toLowerCase().includes('sakit') || (b.statusHealth || '').toLowerCase().includes('sick')).length
  const healthyCount = birds.filter(b => (b.statusHealth || '').toLowerCase() === 'sehat').length
  const recoveringCount = birds.filter(b => ['pemulihan', 'dalam_pemulihan'].includes((b.statusHealth || '').toLowerCase())).length
  const chicksHatched = allBreeding.reduce((sum, r) => sum + (r.chickCount || 0), 0)

  const kpis = isKeeper ? [
    { label: 'Tugas Belum Selesai', value: summary?.pendingTasks ?? '—', icon: ListChecks, bg: '#FFEDD5', fg: '#C2410C', to: '/tasks' },
    { label: 'Jadwal Pakan Hari Ini', value: todayFeeding.length, icon: Utensils, bg: '#FFEDD5', fg: '#C2410C', to: '/feeding' },
  ] : isHeadKeeper ? [
    { label: 'Laporan Menunggu Verifikasi', value: summary?.pendingReports ?? '—', icon: ClipboardCheck, bg: '#FEF3C7', fg: '#92400E', to: '/daily-reports' },
    { label: 'Tugas Belum Selesai', value: summary?.pendingTasks ?? '—', icon: ListChecks, bg: '#FFEDD5', fg: '#C2410C', to: '/tasks' },
    { label: 'Total Burung', value: birds.length, icon: BirdIcon, bg: '#DCFCE7', fg: '#15803D', to: '/birds' }
  ] : isVet ? [
    { label: 'Burung Sakit', value: sickCount, icon: Stethoscope, bg: '#FEE2E2', fg: '#B91C1C', to: '/health' },
    { label: 'Burung Dalam Pemulihan', value: recoveringCount, icon: Stethoscope, bg: '#FEF3C7', fg: '#92400E', to: '/health' },
    { label: 'Burung Sehat', value: healthyCount, icon: Stethoscope, bg: '#DCFCE7', fg: '#15803D', to: '/health' },
    { label: 'Kontrol 14 Hari', value: summary?.upcomingCheckups ?? '—', icon: Bell, bg: '#DBEAFE', fg: '#1D4ED8', to: '/reminders' }
  ] : [
    { label: 'Total Burung', value: birds.length, icon: BirdIcon, bg: '#DCFCE7', fg: '#15803D', to: '/birds' },
    { label: 'Total Spesies', value: species.length, icon: BirdIcon, bg: '#FFEDD5', fg: '#C2410C', to: '/species' },
    { label: 'Total Habitat', value: summary?.habitats ?? '—', icon: MapPinned, bg: '#DBEAFE', fg: '#1D4ED8', to: '/habitats' },
    { label: 'Laporan Menunggu', value: summary?.pendingReports ?? '—', icon: ClipboardCheck, bg: '#FEF3C7', fg: '#92400E', to: '/daily-reports' },
    { label: 'Anakan Menetas', value: chicksHatched, icon: BirdIcon, bg: '#DCFCE7', fg: '#15803D', to: '/breeding' },
    { label: 'Jadwal Pakan Hari Ini', value: todayFeeding.length, icon: Utensils, bg: '#FFEDD5', fg: '#C2410C', to: '/feeding' }
  ]

  const speciesPopulation = species
    .map(s => ({ name: s.localName, value: birds.filter(b => b.speciesId === s.id).length }))
    .filter(s => s.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 8)

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-[22px] font-bold font-display tracking-tight">Dashboard {getRoleLabel(role)}</h1>
        <p className="text-[13.5px] text-inksoft mt-0.5">{isVet ? 'Ringkasan kondisi kesehatan dan jadwal pemeriksaan.' : isHeadKeeper ? 'Ringkasan tugas operasional dan laporan yang perlu ditindaklanjuti.' : isKeeper ? 'Ringkasan tugas dan perawatan harian Anda.' : 'Ringkasan pengelolaan Zona Taman Burung Jagat Satwa Nusantara.'}</p>
      </div>
      {loading ? <KpiSkeleton count={8} /> : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {kpis.map(k => (
            <Link key={k.label} to={k.to}>
              <StatCard icon={k.icon} label={k.label} value={k.value} iconBg={k.bg} iconFg={k.fg} />
            </Link>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 mb-6">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-[14.5px] font-bold m-0">Populasi per Spesies</h3>
            <span className="text-[11.5px] text-inksoft">Top 8</span>
          </div>
          <div className="h-[260px] mt-2">
            {speciesPopulation.length === 0 ? (
              <div className="h-full flex items-center justify-center text-inksoft text-[13px]">Belum ada data burung.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={speciesPopulation} dataKey="value" nameKey="name" innerRadius={62} outerRadius={92} paddingAngle={2}>
                    {speciesPopulation.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 justify-center mt-2">
            {speciesPopulation.map((s, i) => (
              <span key={s.name} className="flex items-center gap-1.5 text-[11px] text-inksoft font-medium">
                <span className="w-2 h-2 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />{s.name} ({s.value})
              </span>
            ))}
          </div>
        </div>

      </div>

      {canSeeOperations && <div className="grid grid-cols-1 gap-4">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[14.5px] font-bold m-0">Jadwal Pakan Hari Ini</h3>
            <Link to="/feeding" className="text-[12px] font-semibold text-primary-600 flex items-center gap-1">Lihat semua<ArrowRight size={13} /></Link>
          </div>
          {loading ? <div className="skeleton h-40" /> : todayFeeding.length === 0 ? (
            <p className="text-[13px] text-inksoft py-6 text-center">Tidak ada jadwal pakan harian (frequency = "daily").</p>
          ) : (
            <div className="space-y-3">
              {todayFeeding.slice(0, 5).map(f => (
                <div key={f.id} className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl2 bg-orange-100 text-primary-700 flex items-center justify-center flex-shrink-0">
                    <Utensils size={15} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-semibold text-ink truncate">{f.feedType} — {f.bird?.name || f.bird?.ringNumber}</div>
                    <div className="text-[11.5px] text-inksoft">{f.feedingTime}{f.amountKg ? ` · ${f.amountKg} kg` : ''}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[14.5px] font-bold m-0">Pengingat Mendatang</h3>
            <Link to="/reminders" className="text-[12px] font-semibold text-primary-600 flex items-center gap-1">Lihat semua <ArrowRight size={13} /></Link>
          </div>
          {loading ? <div className="skeleton h-32" /> : reminders.length === 0 ? (
            <p className="text-[13px] text-inksoft py-4 text-center">Tidak ada pengingat dalam 14 hari.</p>
          ) : <div className="space-y-3">{reminders.slice(0, 5).map((reminder) => (
            <div key={reminder.id} className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl2 bg-orange-100 text-primary-700 flex items-center justify-center"><Bell size={15} /></div>
              <div className="min-w-0"><div className="text-[13px] font-semibold truncate">{reminder.title}</div><div className="text-[11.5px] text-inksoft">{formatReminderBirds(reminder)} · {reminder.type === 'feeding' ? reminder.dueAt : formatDateTime(reminder.dueAt)}</div></div>
            </div>
          ))}</div>}
        </div>

        <div className="card p-5">
          <h3 className="text-[14.5px] font-bold m-0 mb-3">Ringkasan Kondisi Kesehatan</h3>
          {loading ? <div className="skeleton h-32" /> : <div className="space-y-3">
            {(summary?.health || []).map((item) => (
              <div key={item.condition} className="flex items-center justify-between text-[13px]">
                <span className="capitalize text-inksoft">{item.condition}</span><span className="font-bold">{item.total}</span>
              </div>
            ))}
            {(!summary?.health || summary.health.length === 0) && <p className="text-[13px] text-inksoft py-4 text-center">Belum ada data kondisi kesehatan.</p>}
          </div>}
        </div>
      </div>
    </div>
  )
}
