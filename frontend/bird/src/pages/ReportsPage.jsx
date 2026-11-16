import { useEffect, useState } from 'react'
import { Activity, ArrowRightLeft, FileText, HeartPulse } from 'lucide-react'
import * as reportApi from '../api/report.api'
import * as speciesApi from '../api/species.api'
import { ErrorState, EmptyState } from '../components/ui/Misc'
import { formatDateTime } from '../utils/format'

const SECTIONS = [
  { key: 'activities', label: 'Aktivitas', icon: Activity },
  { key: 'healthRecords', label: 'Monitoring Kesehatan', icon: HeartPulse },
  { key: 'transfers', label: 'Riwayat Perpindahan', icon: ArrowRightLeft }
]

export default function ReportsPage() {
  const [section, setSection] = useState('activities')
  const [report, setReport] = useState(null)
  const [species, setSpecies] = useState([])
  const [speciesId, setSpeciesId] = useState('')
  const [speciesReport, setSpeciesReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [allReport, speciesList] = await Promise.all([
          reportApi.getAllReport(),
          speciesApi.getSpeciesList()
        ])
        if (cancelled) return
        setReport(allReport)
        setSpecies(speciesList)
      } catch (requestError) {
        if (!cancelled) setError(requestError?.response?.data?.error || requestError.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    const refreshWhenVisible = () => {
      if (!document.hidden) load()
    }
    document.addEventListener('visibilitychange', refreshWhenVisible)
    load()
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', refreshWhenVisible)
    }
  }, [])

  useEffect(() => {
    if (!speciesId) {
      setSpeciesReport(null)
      return
    }
    reportApi.getSpeciesReport(speciesId).then(setSpeciesReport).catch(() => setSpeciesReport(null))
  }, [speciesId])

  if (error) return <ErrorState message={error} />

  const summaryItems = [
    { label: 'Total aktivitas', value: report?.totalActivities ?? 0, icon: Activity },
    { label: 'Total pemeriksaan', value: report?.totalHealthRecords ?? 0, icon: HeartPulse },
    { label: 'Total perpindahan', value: report?.totalTransfers ?? 0, icon: ArrowRightLeft }
  ]
  const sectionData = {
    activities: report?.data || [],
    healthRecords: report?.healthRecords || [],
    transfers: report?.transfers || []
  }[section]
  const activeSection = SECTIONS.find((item) => item.key === section)

  return (
    <div>
      <div className="flex items-end justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-[22px] font-bold font-display tracking-tight">Reports</h1>
          <p className="text-[13.5px] text-inksoft mt-0.5">Laporan lengkap aktivitas, kesehatan, dan perpindahan burung.</p>
        </div>
      </div>

      {loading ? (
        <div className="card p-10 flex items-center justify-center">
          <div className="w-7 h-7 border-[3px] border-orange-200 border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
            {summaryItems.map((item) => {
              const Icon = item.icon
              return (
                <div key={item.label} className="card p-5">
                  <div className="w-10 h-10 rounded-xl2 bg-orange-100 text-primary-700 flex items-center justify-center mb-3">
                    <Icon size={19} />
                  </div>
                  <div className="text-[27px] font-extrabold font-display">{item.value}</div>
                  <div className="text-[12.5px] text-inksoft font-medium mt-0.5">{item.label}</div>
                </div>
              )
            })}
          </div>

          <div className="card p-5 mb-6 grid grid-cols-1 md:grid-cols-[minmax(180px,1fr)_minmax(240px,1.5fr)_minmax(200px,1fr)] gap-4 items-center">
            <div>
              <h2 className="text-[14px] font-bold mb-1">Laporan per Spesies</h2>
              <p className="text-[12px] text-inksoft m-0">Pilih spesies untuk melihat jumlah burung dan aktivitasnya.</p>
            </div>
            <select className="input" value={speciesId} onChange={(event) => setSpeciesId(event.target.value)}>
              <option value="">Pilih spesies</option>
              {species.map((item) => <option key={item.id} value={item.id}>{item.localName}</option>)}
            </select>
            {speciesReport ? (
              <div className="flex items-center gap-8">
                <div>
                  <div className="text-[20px] font-extrabold font-display">{speciesReport.totalBirds}</div>
                  <div className="text-[11.5px] text-inksoft">Total burung</div>
                </div>
                <div>
                  <div className="text-[20px] font-extrabold font-display">{speciesReport.totalActivities}</div>
                  <div className="text-[11.5px] text-inksoft">Total aktivitas</div>
                </div>
              </div>
            ) : (
              <p className="text-[12px] text-inksoft m-0">Ringkasan akan tampil setelah spesies dipilih.</p>
            )}
          </div>

          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h2 className="text-[14px] font-bold m-0">Detail Laporan</h2>
                <p className="text-[11.5px] text-inksoft mt-1 mb-0">Diurutkan berdasarkan tanggal pencatatan.</p>
              </div>
              <span className="badge badge-orange">{sectionData.length} entri</span>
            </div>

            <div className="px-5 py-3 border-b border-border flex gap-2 flex-wrap">
              {SECTIONS.map((item) => {
                const Icon = item.icon
                const count = {
                  activities: report?.totalActivities ?? 0,
                  healthRecords: report?.totalHealthRecords ?? 0,
                  transfers: report?.totalTransfers ?? 0
                }[item.key]
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setSection(item.key)}
                    aria-pressed={section === item.key}
                    className={`btn !py-2 !px-3 text-[12px] ${section === item.key ? 'btn-primary' : 'btn-outline'}`}
                  >
                    <Icon size={14} />{item.label}<span className="opacity-75">{count}</span>
                  </button>
                )
              })}
            </div>

            {!sectionData.length ? (
              <EmptyState
                icon={activeSection?.icon || FileText}
                title="Belum ada data"
                subtitle={`Belum ada ${activeSection?.label.toLowerCase()} yang tercatat.`}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-[13px]">
                  {section === 'activities' && (
                    <>
                      <thead><tr><th className="th">Tanggal Dicatat</th><th className="th">Waktu Aktivitas</th><th className="th">Burung</th><th className="th">Spesies</th><th className="th">Jenis Aktivitas</th></tr></thead>
                      <tbody>{sectionData.map((item) => (
                        <tr key={item.id} className="hover:bg-[#FFFAF3]">
                          <td className="td whitespace-nowrap">{formatDateTime(item.createdAt)}</td>
                          <td className="td whitespace-nowrap">{formatDateTime(item.activityTime)}</td>
                          <td className="td">{item.bird?.name || item.bird?.ringNumber || `#${item.birdId}`}</td>
                          <td className="td">{item.bird?.species?.localName || '—'}</td>
                          <td className="td"><span className="badge badge-orange">{item.activityType}</span></td>
                        </tr>
                      ))}</tbody>
                    </>
                  )}
                  {section === 'healthRecords' && (
                    <>
                      <thead><tr><th className="th">Tanggal Dicatat</th><th className="th">Tanggal Pemeriksaan</th><th className="th">Burung</th><th className="th">Spesies</th><th className="th">Kondisi</th><th className="th">Catatan</th><th className="th">Petugas</th></tr></thead>
                      <tbody>{sectionData.map((item) => (
                        <tr key={item.id} className="hover:bg-[#FFFAF3]">
                          <td className="td whitespace-nowrap">{formatDateTime(item.createdAt)}</td>
                          <td className="td whitespace-nowrap">{formatDateTime(item.examinationDate)}</td>
                          <td className="td">{item.bird?.name || item.bird?.ringNumber || `#${item.birdId}`}</td>
                          <td className="td">{item.bird?.species?.localName || '—'}</td>
                          <td className="td"><span className="badge badge-orange">{item.condition}</span></td>
                          <td className="td">{item.symptoms || item.treatment || '—'}</td>
                          <td className="td">{item.user?.fullName || item.user?.username || '—'}</td>
                        </tr>
                      ))}</tbody>
                    </>
                  )}
                  {section === 'transfers' && (
                    <>
                      <thead><tr><th className="th">Tanggal Dicatat</th><th className="th">Tanggal Perpindahan</th><th className="th">Burung</th><th className="th">Spesies</th><th className="th">Dari</th><th className="th">Ke</th><th className="th">Alasan</th><th className="th">Petugas</th></tr></thead>
                      <tbody>{sectionData.map((item) => (
                        <tr key={item.id} className="hover:bg-[#FFFAF3]">
                          <td className="td whitespace-nowrap">{formatDateTime(item.createdAt)}</td>
                          <td className="td whitespace-nowrap">{formatDateTime(item.movedAt)}</td>
                          <td className="td">{item.bird?.name || item.bird?.ringNumber || `#${item.birdId}`}</td>
                          <td className="td">{item.bird?.species?.localName || '—'}</td>
                          <td className="td">{item.fromHabitat?.name || '—'}</td>
                          <td className="td">{item.toHabitat?.name || '—'}</td>
                          <td className="td">{item.reason || '—'}</td>
                          <td className="td">{item.responsible?.fullName || item.responsible?.username || '—'}</td>
                        </tr>
                      ))}</tbody>
                    </>
                  )}
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
