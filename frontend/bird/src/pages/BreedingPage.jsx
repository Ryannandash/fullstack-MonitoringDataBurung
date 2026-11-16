import { useEffect, useMemo, useState } from 'react'
import { Plus, HeartHandshake, Egg, Bird as BirdIcon, XCircle, Pencil, Trash2 } from 'lucide-react'
import * as breedingApi from '../api/breeding.api'
import * as birdApi from '../api/bird.api'
import Modal from '../components/ui/Modal'
import { StatCard, EmptyState, ErrorState, TableSkeleton } from '../components/ui/Misc'
import { BreedingBadge } from '../components/ui/Badge'
import { formatDate } from '../utils/format'
import { useAuth } from '../context/AuthContext'

const emptyForm = { birdId: '', mateBirdId: '', matingDate: '', eggLayingDate: '', eggCount: '', hatchingDate: '', chickCount: '', status: 'mating', notes: '' }
const genderLabel = (gender) => gender === 'male' ? 'Jantan' : gender === 'female' ? 'Betina' : 'Belum diketahui'
const toDateInput = (value) => {
  if (!value) return ''
  const date = new Date(value)
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

export default function BreedingPage() {
  const { role } = useAuth()
  const canWrite = ['super_admin', 'head_keeper', 'keeper'].includes(role)
  const canDelete = ['super_admin', 'head_keeper', 'keeper'].includes(role)
  const [records, setRecords] = useState([])
  const [birds, setBirds] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [editingRecord, setEditingRecord] = useState(null)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true); setError(null)
    try {
      const [r, b] = await Promise.all([breedingApi.getBreedingRecords(), birdApi.getBirds()])
      setRecords(r); setBirds(b)
    } catch (e) { setError(e?.response?.data?.error || e.message) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const kpis = useMemo(() => {
    const active = records.filter(r => ['mating', 'incubating'].includes((r.status || '').toLowerCase())).length
    const eggs = records.reduce((s, r) => s + (r.eggCount || 0), 0)
    const incubating = records.filter(r => (r.status || '').toLowerCase() === 'incubating').length
    const hatched = records.reduce((s, r) => s + (r.chickCount || 0), 0)
    const failed = records.filter(r => (r.status || '').toLowerCase() === 'failed').length
    return { active, eggs, incubating, hatched, failed }
  }, [records])

  const openCreate = () => {
    setEditingRecord(null)
    setForm({ ...emptyForm, birdId: birds[0]?.id || '' })
    setModalOpen(true)
  }

  const openEdit = (record) => {
    setEditingRecord(record)
    setForm({
      birdId: String(record.birdId),
      mateBirdId: record.mateBirdId ? String(record.mateBirdId) : '',
      matingDate: toDateInput(record.matingDate),
      eggLayingDate: toDateInput(record.eggLayingDate),
      eggCount: record.eggCount ?? '',
      hatchingDate: toDateInput(record.hatchingDate),
      chickCount: record.chickCount ?? '',
      status: record.status || 'mating',
      notes: record.notes || ''
    })
    setModalOpen(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        birdId: parseInt(form.birdId),
        mateBirdId: parseInt(form.mateBirdId),
        status: form.status,
        notes: form.notes || null,
        matingDate: form.matingDate ? new Date(form.matingDate).toISOString() : null,
        eggLayingDate: form.eggLayingDate ? new Date(form.eggLayingDate).toISOString() : null,
        hatchingDate: form.hatchingDate ? new Date(form.hatchingDate).toISOString() : null,
        eggCount: form.eggCount === '' ? null : parseInt(form.eggCount),
        chickCount: form.chickCount === '' ? null : parseInt(form.chickCount)
      }
      if (editingRecord) await breedingApi.updateBreedingRecord(editingRecord.id, payload)
      else await breedingApi.createBreedingRecord(payload)
      setModalOpen(false)
      await load()
    } catch (e) { alert(e?.response?.data?.error || 'Gagal menyimpan catatan breeding.') }
    finally { setSaving(false) }
  }

  const handleDelete = async (record) => {
    if (!window.confirm('Hapus catatan breeding ini?')) return
    try {
      await breedingApi.deleteBreedingRecord(record.id)
      await load()
    } catch (e) {
      alert(e?.response?.data?.error || 'Gagal menghapus catatan breeding.')
    }
  }

  return (
    <div>
      <div className="flex items-end justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-[22px] font-bold font-display tracking-tight">Breeding Record</h1>
          <p className="text-[13.5px] text-inksoft mt-0.5">{records.length} catatan di tabel BreedingRecord</p>
        </div>
        {canWrite && <button onClick={openCreate} className="btn btn-primary"><Plus size={16} />Catat Breeding</button>}
      </div>

      {!loading && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <StatCard icon={HeartHandshake} label="Pasangan Aktif" value={kpis.active} iconBg="#FCE7F3" iconFg="#BE185D" />
          <StatCard icon={Egg} label="Total Telur" value={kpis.eggs} iconBg="#FEF3C7" iconFg="#92400E" />
          <StatCard icon={Egg} label="Sedang Inkubasi" value={kpis.incubating} iconBg="#DBEAFE" iconFg="#1D4ED8" />
          <StatCard icon={BirdIcon} label="Total Menetas" value={kpis.hatched} iconBg="#DCFCE7" iconFg="#15803D" />
          <StatCard icon={XCircle} label="Gagal" value={kpis.failed} iconBg="#FEE2E2" iconFg="#B91C1C" />
        </div>
      )}

      <div className="card">
        {error ? <ErrorState message={error} /> : loading ? <TableSkeleton cols={8} /> : records.length === 0 ? (
          <EmptyState icon={HeartHandshake} title="Belum ada catatan breeding" subtitle="Mulai catat perkawinan, telur, dan penetasan burungmu." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr>
                  <th className="th">Pasangan Burung</th><th className="th">Status</th><th className="th">Tgl Kawin</th>
                  <th className="th">Tgl Bertelur</th><th className="th">Jml Telur</th><th className="th">Tgl Menetas</th><th className="th">Jml Anakan</th>{canWrite && <th className="th">Aksi</th>}
                </tr>
              </thead>
              <tbody>
                {records.map(r => (
                  <tr key={r.id} className="hover:bg-[#FFFAF3] transition-colors">
                    <td className="td font-semibold">{r.bird?.name || r.bird?.ringNumber} <span className="text-inksoft font-normal">({genderLabel(r.bird?.gender)}) ×</span> {r.mateBird ? <>{r.mateBird.name || r.mateBird.ringNumber} <span className="text-inksoft font-normal">({genderLabel(r.mateBird.gender)})</span></> : 'Pasangan belum dipilih'}</td>
                    <td className="td"><BreedingBadge status={r.status} /></td>
                    <td className="td">{formatDate(r.matingDate)}</td>
                    <td className="td">{formatDate(r.eggLayingDate)}</td>
                    <td className="td">{r.eggCount ?? '—'}</td>
                    <td className="td">{formatDate(r.hatchingDate)}</td>
                    <td className="td">{r.chickCount ?? '—'}</td>
                    {canWrite && <td className="td whitespace-nowrap">
                      <button type="button" onClick={() => openEdit(r)} aria-label="Edit catatan breeding" className="inline-flex w-8 h-8 rounded-lg border border-border items-center justify-center text-inksoft hover:border-primary hover:text-primary mr-1"><Pencil size={14} /></button>
                      {canDelete && <button type="button" onClick={() => handleDelete(r)} aria-label="Hapus catatan breeding" className="inline-flex w-8 h-8 rounded-lg border border-border items-center justify-center text-danger hover:bg-red-50"><Trash2 size={14} /></button>}
                    </td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {canWrite && <Modal
        open={modalOpen} onClose={() => setModalOpen(false)} title={editingRecord ? 'Edit Catatan Breeding' : 'Catat Breeding'} wide
        footer={<>
          <button className="btn btn-outline" onClick={() => setModalOpen(false)}>Batal</button>
          <button className="btn btn-primary" form="breeding-form" type="submit" disabled={saving}>{saving ? 'Menyimpan…' : editingRecord ? 'Simpan Perubahan' : 'Simpan'}</button>
        </>}
      >
        <form id="breeding-form" onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Burung pertama</label>
              <select required className="input" value={form.birdId} onChange={e => setForm(f => ({ ...f, birdId: e.target.value }))}>
                <option value="">— pilih burung —</option>
                {birds.map(b => <option key={b.id} value={b.id}>{b.name || b.ringNumber} · {genderLabel(b.gender)}</option>)}
              </select>
            </div>
            <div><label className="label">Burung pasangan</label>
              <select required className="input" value={form.mateBirdId} onChange={e => setForm(f => ({ ...f, mateBirdId: e.target.value }))}>
                <option value="">— pilih pasangan —</option>
                {birds.filter(b => String(b.id) !== String(form.birdId)).map(b => <option key={b.id} value={b.id}>{b.name || b.ringNumber} · {genderLabel(b.gender)}</option>)}
              </select>
            </div>
            <div><label className="label">Status</label>
              <select className="input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                <option value="mating">Mating (Kawin)</option><option value="incubating">Incubating (Mengerami)</option>
                <option value="hatched">Hatched (Menetas)</option><option value="failed">Failed (Gagal)</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className="label">Tgl Kawin</label><input type="date" className="input" value={form.matingDate} onChange={e => setForm(f => ({ ...f, matingDate: e.target.value }))} /></div>
            <div><label className="label">Tgl Bertelur</label><input type="date" className="input" value={form.eggLayingDate} onChange={e => setForm(f => ({ ...f, eggLayingDate: e.target.value }))} /></div>
            <div><label className="label">Jumlah Telur</label><input type="number" className="input" value={form.eggCount} onChange={e => setForm(f => ({ ...f, eggCount: e.target.value }))} /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className="label">Tgl Menetas</label><input type="date" className="input" value={form.hatchingDate} onChange={e => setForm(f => ({ ...f, hatchingDate: e.target.value }))} /></div>
            <div><label className="label">Jumlah Anakan</label><input type="number" className="input" value={form.chickCount} onChange={e => setForm(f => ({ ...f, chickCount: e.target.value }))} /></div>
          </div>
          <div><label className="label">Catatan</label><textarea rows={3} className="input" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
        </form>
      </Modal>}
    </div>
  )
}
