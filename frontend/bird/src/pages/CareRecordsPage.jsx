import { useEffect, useMemo, useState } from 'react'
import { Plus, Dumbbell, Brush, Pencil, Trash2 } from 'lucide-react'
import * as workflowApi from '../api/workflows.api'
import * as birdApi from '../api/bird.api'
import * as habitatApi from '../api/habitat.api'
import * as domeApi from '../api/dome.api'
import * as uploadApi from '../api/upload.api'
import Modal from '../components/ui/Modal'
import { EmptyState, ErrorState, TableSkeleton } from '../components/ui/Misc'
import { formatDateTime } from '../utils/format'
import { resolveMediaUrl } from '../utils/media'
import { useAuth } from '../context/AuthContext'

const emptyForms = {
  training: { birdId: '', title: '', technique: '', notes: '', trainedAt: '', photoUrl: null, file: null },
  cleaning: { domeId: '', habitatId: '', status: 'Selesai', notes: '', cleanedAt: '', photoUrl: null, file: null }
}

const config = {
  training: { title: 'Pelatihan Burung', api: 'training', icon: Dumbbell, date: 'trainedAt', category: 'training' },
  cleaning: { title: 'Kebersihan Kandang', api: 'cleaning', icon: Brush, date: 'cleanedAt', category: 'cleaning' }
}

const dateTimeValue = () => {
  const date = new Date()
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}

const apiMethods = {
  training: {
    list: workflowApi.getTrainingRecords,
    create: workflowApi.createTrainingRecord,
    update: workflowApi.updateTrainingRecord,
    remove: workflowApi.deleteTrainingRecord
  },
  cleaning: {
    list: workflowApi.getCleaningRecords,
    create: workflowApi.createCleaningRecord,
    update: workflowApi.updateCleaningRecord,
    remove: workflowApi.deleteCleaningRecord
  },
}

export default function CareRecordsPage({ kind }) {
  const page = config[kind]
  const api = apiMethods[kind]
  const Icon = page.icon
  const { role } = useAuth()
  const canWrite = ['keeper', 'super_admin'].includes(role)
  const [records, setRecords] = useState([])
  const [birds, setBirds] = useState([])
  const [habitats, setHabitats] = useState([])
  const [domes, setDomes] = useState([])
  const [date, setDate] = useState('')
  const [search, setSearch] = useState('')
  const [form, setForm] = useState(emptyForms[kind])
  const [editing, setEditing] = useState(null)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const [items, birdList, habitatList, domeList] = await Promise.all([
        api.list(date ? { date } : {}),
        birdApi.getBirds(),
        kind === 'cleaning' ? habitatApi.getHabitats() : Promise.resolve([]),
        kind === 'cleaning' ? domeApi.getDomes() : Promise.resolve([])
      ])
      setRecords(items)
      setBirds(birdList)
      setHabitats(habitatList)
      setDomes(domeList)
    } catch (requestError) {
      setError(requestError?.response?.data?.message || requestError?.response?.data?.error || requestError.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [kind, date])

  const visibleRecords = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return records
    return records.filter((record) => {
      const bird = record.bird?.name || record.bird?.ringNumber || ''
      const location = record.habitat?.name || ''
      const title = record.title || record.area || ''
      return `${bird} ${location} ${title} ${record.notes || ''}`.toLowerCase().includes(query)
    })
  }, [records, search])

  const startCreate = () => {
    setEditing(null)
    setForm({
      ...emptyForms[kind],
      birdId: String(birds[0]?.id || ''),
      domeId: String(domes[0]?.id || ''),
      habitatId: String(habitats.find((habitat) => habitat.domeId === domes[0]?.id)?.id || ''),
      [page.date]: dateTimeValue()
    })
    setOpen(true)
  }

  const startEdit = (record) => {
    setEditing(record)
    const values = { ...emptyForms[kind], ...record, file: null }
    if (kind === 'cleaning') {
      values.habitatId = String(record.habitatId)
      values.domeId = String(record.habitat?.domeId || '')
    }
    else values.birdId = String(record.birdId)
    values[page.date] = dateTimeValueForInput(record[page.date])
    setForm(values)
    setOpen(true)
  }

  const save = async (event) => {
    event.preventDefault()
    setSaving(true)
    try {
      let photoUrl = form.photoUrl || null
      if (form.file) {
        const document = await uploadApi.uploadDocument({
          file: form.file,
          birdId: form.birdId || undefined,
          category: page.category,
          description: `${page.title}${form.title ? ` · ${form.title}` : ''}`
        })
        photoUrl = document.fileUrl
      }

      let payload
      if (kind === 'training') {
        payload = {
          birdId: Number(form.birdId),
          title: form.title,
          technique: form.technique || null,
          notes: form.notes || null,
          trainedAt: new Date(form.trainedAt).toISOString(),
          photoUrl
        }
      } else if (kind === 'cleaning') {
        const selectedHabitat = habitats.find((habitat) => habitat.id === Number(form.habitatId))
        payload = {
          habitatId: Number(form.habitatId),
          area: selectedHabitat?.name || '',
          status: form.status,
          notes: form.notes || null,
          cleanedAt: new Date(form.cleanedAt).toISOString(),
          photoUrl
        }
      }

      if (editing) await api.update(editing.id, payload)
      else await api.create(payload)
      setOpen(false)
      await load()
    } catch (saveError) {
      alert(saveError?.response?.data?.message || saveError?.response?.data?.error || `Gagal menyimpan ${page.title.toLowerCase()}.`)
    } finally {
      setSaving(false)
    }
  }

  const remove = async (record) => {
    if (!window.confirm(`Hapus catatan ${page.title.toLowerCase()} ini?`)) return
    try {
      await api.remove(record.id)
      await load()
    } catch (removeError) {
      alert(removeError?.response?.data?.message || 'Gagal menghapus catatan.')
    }
  }

  const person = (record) => record.trainer?.fullName || record.user?.fullName || record.user?.username || '—'
  const subject = (record) => kind === 'cleaning' ? record.habitat?.name : record.bird?.name || record.bird?.ringNumber
  const label = (record) => kind === 'training' ? record.title : record.habitat?.dome?.name || record.area

  return (
    <div>
      <div className="flex items-end justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-[22px] font-bold font-display tracking-tight">{page.title}</h1>
          <p className="text-[13.5px] text-inksoft mt-0.5">Catatan tersimpan di database dan dapat dilacak kembali pada laporan harian.</p>
        </div>
        {canWrite && <button className="btn btn-primary" onClick={startCreate}><Plus size={16} />Tambah Catatan</button>}
      </div>

      <div className="flex gap-3 mb-4 flex-wrap">
        <input aria-label="Filter tanggal" type="date" className="input !w-auto" value={date} onChange={(event) => setDate(event.target.value)} />
        <input aria-label="Cari catatan" className="input !w-full sm:!w-64" placeholder="Cari burung, lokasi, catatan…" value={search} onChange={(event) => setSearch(event.target.value)} />
      </div>

      <div className="card">
        {error ? <ErrorState message={error} /> : loading ? <TableSkeleton cols={6} /> : !visibleRecords.length ? (
          <EmptyState icon={Icon} title={`Belum ada ${page.title.toLowerCase()}`} subtitle="Catatan dari formulir aktivitas akan ditampilkan di sini." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13px]">
              <thead><tr>
                <th className="th">Tanggal</th><th className="th">{kind === 'cleaning' ? 'Habitat' : 'Burung'}</th>
                <th className="th">{kind === 'training' ? 'Latihan' : 'Dome'}</th>
                <th className="th">Catatan</th><th className="th">Dicatat Oleh</th><th className="th">Aksi</th>
              </tr></thead>
              <tbody>{visibleRecords.map((record) => (
                <tr key={record.id}>
                  <td className="td whitespace-nowrap">{formatDateTime(record[page.date])}</td>
                  <td className="td font-semibold">{subject(record) || '—'}</td>
                  <td className="td">{label(record) || '—'}</td>
                  <td className="td">{record.notes || '—'}</td>
                  <td className="td">{person(record)}</td>
                  <td className="td whitespace-nowrap">
                    {canWrite && <>
                      <button type="button" onClick={() => startEdit(record)} aria-label="Edit catatan" className="inline-flex w-8 h-8 rounded-lg border border-border items-center justify-center text-inksoft hover:border-primary hover:text-primary mr-1"><Pencil size={14} /></button>
                      <button type="button" onClick={() => remove(record)} aria-label="Hapus catatan" className="inline-flex w-8 h-8 rounded-lg border border-border items-center justify-center text-danger hover:bg-red-50"><Trash2 size={14} /></button>
                    </>}
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={`${editing ? 'Edit' : 'Tambah'} ${page.title}`} wide
        footer={<>
          <button className="btn btn-outline" onClick={() => setOpen(false)}>Batal</button>
          <button className="btn btn-primary" form="care-record-form" type="submit" disabled={saving}>{saving ? 'Menyimpan…' : 'Simpan'}</button>
        </>}>
        <form id="care-record-form" onSubmit={save} className="space-y-4">
          {kind === 'cleaning' ? (
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Dome</label><select required className="input" value={form.domeId} onChange={(e) => { const domeId = e.target.value; const firstHabitat = habitats.find((item) => item.domeId === Number(domeId)); setForm({ ...form, domeId, habitatId: String(firstHabitat?.id || '') }) }}><option value="">Pilih dome</option>{domes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
              <div><label className="label">Zona kandang (habitat)</label><select required className="input" value={form.habitatId} onChange={(e) => setForm({ ...form, habitatId: e.target.value })}><option value="">Pilih zona kandang</option>{habitats.filter((item) => item.domeId === Number(form.domeId)).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
              <div><label className="label">Waktu</label><input required type="datetime-local" className="input" value={form.cleanedAt} onChange={(e) => setForm({ ...form, cleanedAt: e.target.value })} /></div>
              <div><label className="label">Status</label><select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option>Selesai</option><option>Perlu tindak lanjut</option></select></div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Burung</label><select required className="input" value={form.birdId} onChange={(e) => setForm({ ...form, birdId: e.target.value })}><option value="">Pilih burung</option>{birds.map((bird) => <option key={bird.id} value={bird.id}>{bird.name || bird.ringNumber}</option>)}</select></div>
              <div><label className="label">{kind === 'training' ? 'Waktu pelatihan' : 'Waktu pembersihan'}</label><input required type="datetime-local" className="input" value={form[page.date]} onChange={(e) => setForm({ ...form, [page.date]: e.target.value })} /></div>
              {kind === 'training' ? (
                <>
                  <div className="col-span-2"><label className="label">Kegiatan latihan</label><input required maxLength={150} className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
                  <div><label className="label">Teknik</label><textarea rows={2} className="input" value={form.technique} onChange={(e) => setForm({ ...form, technique: e.target.value })} /></div>
                </>
              ) : null}
            </div>
          )}
          <div><label className="label">Catatan</label><textarea rows={2} className="input" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          <div><label className="label">Bukti foto/video (maks. 20 MB)</label><input type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" className="input" onChange={(e) => setForm({ ...form, file: e.target.files?.[0] || null })} /></div>
          {form.photoUrl && <a className="text-primary-600 text-sm" href={resolveMediaUrl(form.photoUrl)} target="_blank" rel="noreferrer">Lihat dokumentasi saat ini</a>}
        </form>
      </Modal>
    </div>
  )
}

function dateTimeValueForInput(value) {
  if (!value) return dateTimeValue()
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}
