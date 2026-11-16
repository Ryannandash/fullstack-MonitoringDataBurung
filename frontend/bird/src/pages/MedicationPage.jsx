import { useEffect, useState } from 'react'
import { Pill, Plus, Pencil, Trash2 } from 'lucide-react'
import * as birdApi from '../api/bird.api'
import * as workflowApi from '../api/workflows.api'
import { useAuth } from '../context/AuthContext'
import Modal from '../components/ui/Modal'
import { EmptyState, ErrorState, TableSkeleton } from '../components/ui/Misc'
import { formatDate } from '../utils/format'

const toDateInput = (value) => {
  if (!value) return ''
  const date = new Date(value)
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

const initialForm = {
  birdId: '',
  condition: 'sakit',
  symptoms: '',
  medicine: '',
  dosage: '',
  timesPerDay: '1',
  durationDays: '1',
  nextCheckup: '',
  instructions: ''
}

export default function MedicationPage({ reportOnly = false }) {
  const { role } = useAuth()
  const canManage = role === 'dokter_hewan' && !reportOnly
  const [treatments, setTreatments] = useState([])
  const [birds, setBirds] = useState([])
  const [form, setForm] = useState(initialForm)
  const [editingTreatment, setEditingTreatment] = useState(null)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const [treatmentList, birdList] = await Promise.all([
        workflowApi.getMedicalTreatments(),
        canManage ? birdApi.getBirds() : Promise.resolve([])
      ])
      setTreatments(treatmentList)
      setBirds(birdList)
    } catch (requestError) {
      setError(requestError?.response?.data?.message || requestError?.response?.data?.error || requestError.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [canManage])

  const openCreate = () => {
    setEditingTreatment(null)
    setForm({ ...initialForm, birdId: String(birds[0]?.id || '') })
    setOpen(true)
  }

  const openEdit = (treatment) => {
    setEditingTreatment(treatment)
    setForm({
      birdId: String(treatment.birdId || treatment.healthRecord?.birdId || ''),
      condition: treatment.condition || treatment.healthRecord?.condition || 'sakit',
      symptoms: treatment.symptoms || treatment.healthRecord?.symptoms || '',
      medicine: treatment.medicine,
      dosage: treatment.dosage,
      timesPerDay: String(treatment.timesPerDay || 1),
      durationDays: String(treatment.durationDays),
      nextCheckup: toDateInput(treatment.nextCheckup),
      instructions: treatment.instructions || ''
    })
    setOpen(true)
  }

  const save = async (event) => {
    event.preventDefault()
    setSaving(true)
    try {
      const payload = {
        birdId: Number(form.birdId),
        condition: form.condition,
        symptoms: form.symptoms.trim(),
        medicine: form.medicine.trim(),
        dosage: form.dosage.trim(),
        timesPerDay: Number(form.timesPerDay),
        durationDays: Number(form.durationDays),
        nextCheckup: form.nextCheckup ? new Date(form.nextCheckup).toISOString() : null,
        instructions: form.instructions.trim() || null
      }
      if (editingTreatment) await workflowApi.updateMedicalTreatment(editingTreatment.id, payload)
      else await workflowApi.createMedicalTreatment(payload)
      setOpen(false)
      setEditingTreatment(null)
      await load()
    } catch (saveError) {
      alert(saveError?.response?.data?.message || saveError?.response?.data?.error || 'Gagal menyimpan pemberian obat.')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (treatment) => {
    if (!window.confirm(`Hapus catatan pemberian ${treatment.medicine}?`)) return
    try {
      await workflowApi.deleteMedicalTreatment(treatment.id)
      await load()
    } catch (deleteError) {
      alert(deleteError?.response?.data?.message || deleteError?.response?.data?.error || 'Gagal menghapus catatan obat.')
    }
  }

  return (
    <div>
      <div className="flex items-end justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-[22px] font-bold font-display tracking-tight">{reportOnly ? 'Laporan Pemberian Obat' : 'Pemberian Obat'}</h1>
          <p className="text-[13.5px] text-inksoft mt-0.5">{reportOnly ? 'Riwayat obat dan vitamin yang telah dicatat oleh dokter hewan.' : 'Catat obat atau vitamin untuk ditampilkan pada Laporan Pemberian Obat.'}</p>
        </div>
        {canManage && <button className="btn btn-primary" onClick={openCreate}><Plus size={16} />Catat Pemberian Obat</button>}
      </div>

      <div className="card">
        {error ? <ErrorState message={error} /> : loading ? <TableSkeleton cols={canManage ? 12 : 11} /> : treatments.length === 0 ? (
          <EmptyState icon={Pill} title={reportOnly ? 'Belum ada laporan obat' : 'Belum ada catatan obat'} subtitle="Catatan pemberian obat dan vitamin akan tampil di sini." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13px]">
              <thead><tr>
                <th className="th">Tanggal</th><th className="th">Burung</th><th className="th">Dokter</th><th className="th">Kondisi</th>
                <th className="th">Gejala</th><th className="th">Obat / Vitamin</th><th className="th">Dosis</th>
                <th className="th">Pemberian</th><th className="th">Durasi</th><th className="th">Kontrol berikutnya</th><th className="th">Instruksi</th>
                {canManage && <th className="th">Aksi</th>}
              </tr></thead>
              <tbody>{treatments.map((treatment) => (
                <tr key={treatment.id}>
                  <td className="td whitespace-nowrap">{formatDate(treatment.createdAt)}</td>
                  <td className="td font-semibold">{treatment.bird?.name || treatment.bird?.ringNumber || treatment.healthRecord?.bird?.name || treatment.healthRecord?.bird?.ringNumber || '—'}</td>
                  <td className="td">{treatment.user?.fullName || treatment.user?.username || '—'}</td>
                  <td className="td">{treatment.condition || treatment.healthRecord?.condition || '—'}</td>
                  <td className="td">{treatment.symptoms || treatment.healthRecord?.symptoms || '—'}</td>
                  <td className="td">{treatment.medicine}</td>
                  <td className="td">{treatment.dosage}</td>
                  <td className="td">{treatment.timesPerDay || 1} kali/hari</td>
                  <td className="td">{treatment.durationDays} hari</td>
                  <td className="td whitespace-nowrap">{formatDate(treatment.nextCheckup)}</td>
                  <td className="td">{treatment.instructions || '—'}</td>
                  {canManage && <td className="td whitespace-nowrap">
                    <button type="button" onClick={() => openEdit(treatment)} aria-label="Edit pemberian obat" className="inline-flex w-8 h-8 rounded-lg border border-border items-center justify-center text-inksoft hover:border-primary hover:text-primary mr-1"><Pencil size={14} /></button>
                    <button type="button" onClick={() => remove(treatment)} aria-label="Hapus pemberian obat" className="inline-flex w-8 h-8 rounded-lg border border-border items-center justify-center text-danger hover:bg-red-50"><Trash2 size={14} /></button>
                  </td>}
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>

      {canManage && <Modal open={open} onClose={() => setOpen(false)} title={editingTreatment ? 'Edit Pemberian Obat' : 'Catat Pemberian Obat'} wide footer={<>
        <button className="btn btn-outline" onClick={() => setOpen(false)}>Batal</button>
        <button className="btn btn-primary" form="medication-form" type="submit" disabled={saving}>{saving ? 'Menyimpan…' : 'Simpan Catatan'}</button>
      </>}>
        <form id="medication-form" onSubmit={save} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div><label className="label">Burung</label><select required className="input" disabled={Boolean(editingTreatment)} value={form.birdId} onChange={(event) => setForm({ ...form, birdId: event.target.value })}>
              <option value="">Pilih burung</option>{birds.map((bird) => <option key={bird.id} value={bird.id}>{bird.name || bird.ringNumber}</option>)}
            </select></div>
            <div><label className="label">Kondisi burung</label><select required className="input" value={form.condition} onChange={(event) => setForm({ ...form, condition: event.target.value })}>
              <option value="sakit">Sakit</option><option value="dalam_pemulihan">Dalam pemulihan</option><option value="sehat">Sehat</option>
            </select></div>
          </div>
          <div><label className="label">Gejala / keluhan</label><textarea required rows={2} className="input" value={form.symptoms} onChange={(event) => setForm({ ...form, symptoms: event.target.value })} /></div>
          <div><label className="label">Nama obat atau vitamin</label><input required maxLength={120} className="input" value={form.medicine} onChange={(event) => setForm({ ...form, medicine: event.target.value })} /></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div><label className="label">Dosis setiap pemberian</label><input required maxLength={120} className="input" value={form.dosage} onChange={(event) => setForm({ ...form, dosage: event.target.value })} placeholder="Contoh: 2 ml" /></div>
            <div><label className="label">Berapa kali per hari</label><input required type="number" min="1" step="1" className="input" value={form.timesPerDay} onChange={(event) => setForm({ ...form, timesPerDay: event.target.value })} /></div>
            <div><label className="label">Durasi (hari)</label><input required type="number" min="1" step="1" className="input" value={form.durationDays} onChange={(event) => setForm({ ...form, durationDays: event.target.value })} /></div>
          </div>
          <div><label className="label">Kontrol berikutnya (opsional)</label><input type="date" className="input" value={form.nextCheckup} onChange={(event) => setForm({ ...form, nextCheckup: event.target.value })} /></div>
          <div><label className="label">Instruksi perawatan (opsional)</label><textarea rows={2} className="input" value={form.instructions} onChange={(event) => setForm({ ...form, instructions: event.target.value })} /></div>
          <p className="text-[12px] text-inksoft">Tanggal dicatat otomatis. Catatan ini akan tampil pada Laporan Pemberian Obat.</p>
        </form>
      </Modal>}
    </div>
  )
}
