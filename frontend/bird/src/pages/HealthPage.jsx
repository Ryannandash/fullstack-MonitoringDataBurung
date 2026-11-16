import { useEffect, useState } from 'react'
import { Plus, Stethoscope, Pencil, Trash2 } from 'lucide-react'
import * as healthApi from '../api/health.api'
import * as birdApi from '../api/bird.api'
import * as uploadApi from '../api/upload.api'
import { useAuth } from '../context/AuthContext'
import Modal from '../components/ui/Modal'
import { EmptyState, ErrorState, TableSkeleton } from '../components/ui/Misc'
import { formatDate } from '../utils/format'
import { resolveMediaUrl } from '../utils/media'

const toDateInput = (value) => {
  if (!value) return ''
  const date = new Date(value)
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

const initialForm = {
  birdId: '',
  condition: 'sakit',
  examinationDate: toDateInput(new Date()),
  symptoms: '',
  file: null
}
export default function HealthPage() {
  const { role } = useAuth()
  const canCreate = ['super_admin', 'head_keeper', 'keeper'].includes(role)
  const canManage = ['super_admin', 'head_keeper', 'keeper'].includes(role)
  const [records, setRecords] = useState([])
  const [birds, setBirds] = useState([])
  const [form, setForm] = useState(initialForm)
  const [editingRecord, setEditingRecord] = useState(null)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const [healthRecords, birdList] = await Promise.all([
        healthApi.getHealthRecords(),
        birdApi.getBirds()
      ])
      setRecords(healthRecords)
      setBirds(birdList)
    } catch (requestError) {
      setError(requestError?.response?.data?.error || requestError.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load()   }, [role])

  const openCreate = () => {
    setEditingRecord(null)
    setForm({ ...initialForm, birdId: String(birds[0]?.id || '') })
    setOpen(true)
  }

  const openEdit = (record) => {
    setEditingRecord(record)
    setForm({
      birdId: String(record.birdId),
      condition: record.condition,
      examinationDate: toDateInput(record.examinationDate),
      symptoms: record.symptoms || '',
      photoUrl: record.photoUrl || null,
      file: null
    })
    setOpen(true)
  }

  const save = async (event) => {
    event.preventDefault()
    setSaving(true)
    try {
      let photoUrl = null
      if (form.file) {
        const document = await uploadApi.uploadDocument({
          file: form.file,
          birdId: form.birdId,
          category: 'health'
        })
        photoUrl = document.fileUrl
      }
      const payload = {
        birdId: Number(form.birdId),
        condition: form.condition,
        examinationDate: new Date(form.examinationDate).toISOString(),
        symptoms: form.symptoms || null,
        photoUrl: photoUrl || form.photoUrl
      }
      if (editingRecord) await healthApi.updateHealthRecord(editingRecord.id, payload)
      else await healthApi.createHealthRecord(payload)
      setOpen(false)
      setEditingRecord(null)
      setForm(initialForm)
      await load()
    } catch (saveError) {
      alert(saveError?.response?.data?.error || saveError?.response?.data?.message || 'Gagal menyimpan pemeriksaan.')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (record) => {
    if (!window.confirm('Hapus riwayat pemeriksaan ini?')) return
    try {
      await healthApi.deleteHealthRecord(record.id)
      await load()
    } catch (deleteError) {
      alert(deleteError?.response?.data?.error || deleteError?.response?.data?.message || 'Gagal menghapus pemeriksaan.')
    }
  }

  return (
    <div>
      <div className="flex items-end justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-[22px] font-bold font-display tracking-tight">Monitoring Kesehatan</h1>
          <p className="text-[13.5px] text-inksoft mt-0.5">Pantau riwayat pemeriksaan dan kondisi kesehatan burung.</p>
        </div>
        {canCreate && <button className="btn btn-primary" onClick={openCreate}><Plus size={16} />Catat Kondisi Burung</button>}
      </div>

      <div className="card">
        {error ? <ErrorState message={error} /> : loading ? <TableSkeleton cols={6} /> : records.length === 0 ? (
          <EmptyState icon={Stethoscope} title="Belum ada pemeriksaan" subtitle={canCreate ? 'Tambahkan catatan kondisi burung yang sakit.' : 'Riwayat kondisi burung akan muncul di sini.'} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13px]">
              <thead><tr>
                <th className="th">Tanggal</th><th className="th">Burung</th><th className="th">Kondisi</th>
                <th className="th">Gejala / Keluhan</th><th className="th">Dokumentasi</th>{canManage && <th className="th">Aksi</th>}
              </tr></thead>
              <tbody>{records.map((record) => (
                <tr key={record.id}>
                  <td className="td whitespace-nowrap">{formatDate(record.examinationDate)}</td>
                  <td className="td font-semibold">{record.bird?.name || record.bird?.ringNumber}</td>
                  <td className="td"><span className={`badge ${record.condition === 'sehat' ? 'badge-success' : record.condition === 'sakit' ? 'badge-danger' : 'badge-warning'}`}>{record.condition === 'dalam_pemulihan' ? 'Dalam pemulihan' : record.condition}</span></td>
                  <td className="td">{record.symptoms || '—'}</td>
                  <td className="td">{record.photoUrl ? <a className="text-primary-600" href={resolveMediaUrl(record.photoUrl)} target="_blank" rel="noreferrer">Lihat dokumentasi</a> : '—'}</td>
                  {canManage && <td className="td whitespace-nowrap">
                    <button type="button" onClick={() => openEdit(record)} aria-label="Edit pemeriksaan" className="inline-flex w-8 h-8 rounded-lg border border-border items-center justify-center text-inksoft hover:border-primary hover:text-primary mr-1"><Pencil size={14} /></button>
                    <button type="button" onClick={() => remove(record)} aria-label="Hapus pemeriksaan" className="inline-flex w-8 h-8 rounded-lg border border-border items-center justify-center text-danger hover:bg-red-50"><Trash2 size={14} /></button>
                  </td>}
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>

      {canCreate && <Modal open={open} onClose={() => setOpen(false)} title={editingRecord ? 'Edit Monitoring Kesehatan' : 'Catat Kondisi Burung'} wide
        footer={<>
          <button className="btn btn-outline" onClick={() => setOpen(false)}>Batal</button>
          <button className="btn btn-primary" form="health-form" type="submit" disabled={saving}>{saving ? 'Menyimpan…' : editingRecord ? 'Simpan Perubahan' : 'Simpan Pemeriksaan'}</button>
        </>}>
        <form id="health-form" onSubmit={save} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Burung</label><select required className="input" value={form.birdId} onChange={(e) => setForm({ ...form, birdId: e.target.value })}>
              <option value="">Pilih burung</option>{birds.map((bird) => <option key={bird.id} value={bird.id}>{bird.name || bird.ringNumber}</option>)}
            </select></div>
            <div><label className="label">Kondisi</label><select required className="input" value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })}><option value="sehat">Sehat</option><option value="sakit">Sakit</option><option value="dalam_pemulihan">Dalam pemulihan</option></select></div>
            <div><label className="label">Tanggal Pemeriksaan</label><input required type="date" className="input" value={form.examinationDate} onChange={(e) => setForm({ ...form, examinationDate: e.target.value })} /></div>
          </div>
          <div><label className="label">Gejala atau Keluhan</label><textarea rows={2} className="input" value={form.symptoms} onChange={(e) => setForm({ ...form, symptoms: e.target.value })} /></div>
          <div><label className="label">Foto/video/dokumen (maks. 20 MB)</label><input type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,application/pdf" className="input" onChange={(e) => setForm({ ...form, file: e.target.files?.[0] || null })} /></div>
          {form.photoUrl && <p className="text-[12px] text-inksoft">Dokumentasi saat ini tetap digunakan jika tidak memilih file baru.</p>}
        </form>
      </Modal>}

    </div>
  )
}
