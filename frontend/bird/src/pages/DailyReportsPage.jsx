import { useEffect, useMemo, useState } from 'react'
import { ClipboardCheck, Eye, Send } from 'lucide-react'
import * as workflowApi from '../api/workflows.api'
import { useAuth } from '../context/AuthContext'
import Modal from '../components/ui/Modal'
import { EmptyState, ErrorState, TableSkeleton } from '../components/ui/Misc'
import { formatDate, formatDateTime, getRoleLabel } from '../utils/format'

const STATUSES = ['DRAFT', 'MENUNGGU_VERIFIKASI', 'DISETUJUI', 'PERLU_REVISI']
const LABELS = {
  DRAFT: 'Draft',
  MENUNGGU_VERIFIKASI: 'Menunggu Verifikasi',
  DISETUJUI: 'Disetujui',
  PERLU_REVISI: 'Perlu Revisi'
}
const BADGES = {
  DRAFT: 'badge-orange',
  MENUNGGU_VERIFIKASI: 'badge-warning',
  DISETUJUI: 'badge-success',
  PERLU_REVISI: 'badge-danger'
}

export default function DailyReportsPage() {
  const { role, user } = useAuth()
  const canCreate = ['keeper', 'dokter_hewan'].includes(role)
  const canReview = role === 'head_keeper'
  const [reports, setReports] = useState([])
  const [date, setDate] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selected, setSelected] = useState(null)
  const [detail, setDetail] = useState(null)
  const [reviewNote, setReviewNote] = useState('')
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const params = {}
      if (date) params.date = date
      if (status) params.status = status
      setReports(await workflowApi.getDailyReports(params))
      setError(null)
    } catch (requestError) {
      setError(requestError?.response?.data?.message || requestError.message)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [date, status])

  const myReport = useMemo(() => reports.find((report) => report.userId === user?.id && report.reportDate.slice(0, 10) === (date || new Date().toISOString().slice(0, 10))), [reports, user, date])

  const createDraft = async () => {
    setSaving(true)
    try {
      const report = await workflowApi.createDailyReport({ reportDate: date || new Date().toISOString().slice(0, 10) })
      await load()
      await openDetail(report)
    } catch (createError) {
      alert(createError?.response?.data?.message || 'Gagal membuat draft laporan.')
    } finally {
      setSaving(false)
    }
  }

  const openDetail = async (report) => {
    setSelected(report)
    setDetail(null)
    setReviewNote(report.reviewNote || '')
    try {
      setDetail(await workflowApi.getDailyReport(report.id))
    } catch (detailError) {
      alert(detailError?.response?.data?.message || 'Gagal memuat detail laporan.')
    }
  }

  const submit = async (report) => {
    setSaving(true)
    try {
      await workflowApi.submitDailyReport(report.id)
      setSelected(null)
      await load()
    } catch (submitError) {
      alert(submitError?.response?.data?.message || 'Gagal mengirim laporan.')
    } finally {
      setSaving(false)
    }
  }

  const review = async (action) => {
    if (!selected) return
    setSaving(true)
    try {
      await workflowApi.reviewDailyReport(selected.id, { action, note: reviewNote })
      setSelected(null)
      await load()
    } catch (reviewError) {
      alert(reviewError?.response?.data?.message || 'Gagal memverifikasi laporan.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="flex items-end justify-between gap-4 mb-6 flex-wrap">
        <div><h1 className="text-[22px] font-bold font-display tracking-tight">Laporan Harian</h1><p className="text-[13.5px] text-inksoft mt-0.5">Rekap otomatis aktivitas dari modul kerja; tidak perlu menginput ulang aktivitas.</p></div>
        {canCreate && <button className="btn btn-primary" onClick={createDraft} disabled={saving}><Send size={15} />{saving ? 'Menyiapkan…' : myReport ? 'Buka Laporan Hari Ini' : 'Buat Laporan Hari Ini'}</button>}
      </div>
      <div className="flex gap-3 mb-4 flex-wrap">
        <input aria-label="Filter tanggal" type="date" className="input !w-auto" value={date} onChange={(event) => setDate(event.target.value)} />
        <select aria-label="Filter status" className="input !w-auto" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">Semua status</option>{STATUSES.map((item) => <option key={item} value={item}>{LABELS[item]}</option>)}</select>
      </div>
      <div className="card">
        {error ? <ErrorState message={error} /> : loading ? <TableSkeleton cols={6} /> : !reports.length ? (
          <EmptyState icon={ClipboardCheck} title="Belum ada laporan harian" subtitle={canCreate ? 'Buat laporan untuk merangkum aktivitas yang sudah dicatat.' : 'Laporan yang dikirim akan muncul di sini.'} />
        ) : (
          <div className="overflow-x-auto"><table className="w-full border-collapse text-[13px]">
            <thead><tr><th className="th">Tanggal</th><th className="th">Pengguna</th><th className="th">Role</th><th className="th">Status</th><th className="th">Pemeriksa</th><th className="th">Aksi</th></tr></thead>
            <tbody>{reports.map((report) => <tr key={report.id}>
              <td className="td whitespace-nowrap">{formatDate(report.reportDate)}</td>
              <td className="td font-semibold">{report.user?.fullName || report.user?.username}</td>
              <td className="td">{getRoleLabel(report.user?.role)}</td>
              <td className="td"><span className={`badge ${BADGES[report.status] || 'badge-orange'}`}>{LABELS[report.status] || report.status}</span>{report.reviewNote && <div className="text-[11px] text-inksoft mt-1">{report.reviewNote}</div>}</td>
              <td className="td">{report.reviewer?.fullName || report.reviewer?.username || '—'}</td>
              <td className="td whitespace-nowrap">
                <button className="btn btn-outline !py-2 !px-3" onClick={() => openDetail(report)}><Eye size={14} />Detail</button>
                {canCreate && report.userId === user?.id && ['DRAFT', 'PERLU_REVISI'].includes(report.status) && <button className="btn btn-primary !py-2 !px-3 ml-2" disabled={saving} onClick={() => submit(report)}>Kirim</button>}
              </td>
            </tr>)}</tbody>
          </table></div>
        )}
      </div>

      <Modal open={Boolean(selected)} onClose={() => setSelected(null)} title="Detail Laporan Harian" wide footer={<>
        {canReview && selected?.status === 'MENUNGGU_VERIFIKASI' && <>
          <button className="btn btn-outline" disabled={saving || !reviewNote.trim()} onClick={() => review('revision')}>Minta Revisi</button>
          <button className="btn btn-primary" disabled={saving} onClick={() => review('approve')}>Setujui</button>
        </>}
        {canCreate && selected?.userId === user?.id && ['DRAFT', 'PERLU_REVISI'].includes(selected?.status) && <button className="btn btn-primary" disabled={saving} onClick={() => submit(selected)}>Kirim Verifikasi</button>}
        <button className="btn btn-outline" onClick={() => setSelected(null)}>Tutup</button>
      </>}>
        {!detail ? <div className="py-8 text-center text-inksoft">Memuat detail…</div> : (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap"><div><div className="font-bold">{detail.user?.fullName || detail.user?.username}</div><div className="text-sm text-inksoft">{formatDate(detail.reportDate)} · {getRoleLabel(detail.user?.role)}</div></div><span className={`badge ${BADGES[detail.status] || 'badge-orange'}`}>{LABELS[detail.status] || detail.status}</span></div>
            {canReview && selected?.status === 'MENUNGGU_VERIFIKASI' && <div><label className="label">Catatan pemeriksa (wajib saat revisi)</label><textarea rows={2} className="input" value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} /></div>}
            <div className="border border-border rounded-xl overflow-x-auto">
              {!detail.events?.length ? <div className="p-6 text-center text-sm text-inksoft">Tidak ada aktivitas pada tanggal laporan ini.</div> : <table className="w-full border-collapse text-[13px]">
                <thead><tr><th className="th">Waktu</th><th className="th">Modul</th><th className="th">Aktivitas</th><th className="th">Burung / Lokasi</th><th className="th">Catatan</th></tr></thead>
                <tbody>{detail.events.map((event) => <tr key={event.id}>
                  <td className="td whitespace-nowrap">{formatDateTime(event.date)}</td><td className="td">{event.source}</td><td className="td font-semibold">{event.type}</td><td className="td">{event.bird?.name || event.bird?.ringNumber || event.habitat?.name || '—'}</td><td className="td">{event.detail || '—'}</td>
                </tr>)}</tbody>
              </table>}
            </div>
            {detail.reviews?.length > 0 && <div><h3 className="font-semibold text-sm mb-2">Riwayat verifikasi</h3><div className="space-y-2">{detail.reviews.map((item) => <div key={item.id} className="border-l-2 border-primary pl-3 text-sm"><div className="font-medium">{item.action} · {item.user?.fullName || item.user?.username}</div><div className="text-inksoft">{formatDateTime(item.createdAt)}{item.note ? ` · ${item.note}` : ''}</div></div>)}</div></div>}
          </div>
        )}
      </Modal>
    </div>
  )
}
