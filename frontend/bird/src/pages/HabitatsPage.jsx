import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, MapPinned, Feather } from 'lucide-react'
import * as habitatApi from '../api/habitat.api'
import * as domeApi from '../api/dome.api'
import Modal from '../components/ui/Modal'
import { EmptyState, ErrorState, TableSkeleton } from '../components/ui/Misc'
import { useAuth } from '../context/AuthContext'

const emptyForm = { domeId: '', name: '', vegetationType: '', areaSize: '', description: '' }

export default function HabitatsPage() {
  const { role } = useAuth()
  const canManage = ['super_admin', 'head_keeper', 'keeper'].includes(role)
  const [list, setList] = useState([])
  const [domes, setDomes] = useState([])
  const [domeFilter, setDomeFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const load = async (domeId) => {
    setLoading(true); setError(null)
    try {
      const [h, d] = await Promise.all([habitatApi.getHabitats(domeId || undefined), domeApi.getDomes()])
      setList(h); setDomes(d)
    } catch (e) { setError(e?.response?.data?.error || e.message) }
    finally { setLoading(false) }
  }
  useEffect(() => { load(domeFilter) }, [domeFilter])

  const openCreate = () => { setEditing(null); setForm({ ...emptyForm, domeId: domes[0]?.id || '' }); setModalOpen(true) }
  const openEdit = (h) => {
    setEditing(h)
    setForm({ domeId: h.domeId, name: h.name || '', vegetationType: h.vegetationType || '', areaSize: h.areaSize ?? '', description: h.description || '' })
    setModalOpen(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = { ...form, domeId: parseInt(form.domeId), areaSize: form.areaSize === '' ? null : parseFloat(form.areaSize) }
      if (editing) await habitatApi.updateHabitat(editing.id, payload)
      else await habitatApi.createHabitat(payload)
      setModalOpen(false); load(domeFilter)
    } catch (e) { alert(e?.response?.data?.error || 'Gagal menyimpan habitat.') }
    finally { setSaving(false) }
  }

  const handleDelete = async (h) => {
    if (!confirm(`Hapus habitat "${h.name}"? Ini akan gagal jika masih ada burung terhubung.`)) return
    try { await habitatApi.deleteHabitat(h.id); load(domeFilter) }
    catch (e) { alert(e?.response?.data?.error || 'Gagal menghapus habitat.') }
  }

  return (
    <div>
      <div className="flex items-end justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-[22px] font-bold font-display tracking-tight">Zona Kandang</h1>
          <p className="text-[13.5px] text-inksoft mt-0.5">{list.length} zona kandang tercatat</p>
        </div>
        <div className="flex items-center gap-2.5">
          <select className="input !w-auto" value={domeFilter} onChange={e => setDomeFilter(e.target.value)}>
            <option value="">Semua Dome</option>
            {domes.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          {canManage && <button onClick={openCreate} className="btn btn-primary"><Plus size={16} />Tambah Zona</button>}
        </div>
      </div>

      {error ? <ErrorState message={error} /> : loading ? (
        <div className="card"><TableSkeleton cols={4} /></div>
      ) : list.length === 0 ? (
        <div className="card"><EmptyState icon={MapPinned} title="Belum ada zona kandang" subtitle="Tambahkan zona kandang di dalam dome untuk menempatkan burung." /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {list.map(h => (
            <div key={h.id} className="card card-hover p-5">
              <div className="flex items-center gap-3.5">
                <div className="w-[52px] h-[52px] rounded-xl2 bg-gradient-to-br from-orange-300 to-primary flex items-center justify-center text-white flex-shrink-0"><MapPinned size={22} /></div>
                <div className="min-w-0">
              <div className="font-bold text-[14.5px] truncate">{h.name}</div>
                  <div className="text-[11.5px] text-inksoft truncate">{h.dome?.name || 'Tanpa dome'}</div>
                </div>
              </div>
              {h.vegetationType && <div className="text-[12px] text-inksoft mt-3">Vegetasi: {h.vegetationType}</div>}
              <div className="flex items-center justify-between mt-3 text-[12.5px]">
                <span className="flex items-center gap-1.5 text-inksoft"><Feather size={13} />{h.birds?.length ?? 0} burung</span>
                {h.areaSize && <span className="font-semibold text-ink">{h.areaSize} m²</span>}
              </div>
              {canManage && <div className="flex gap-2 mt-4">
                <button onClick={() => openEdit(h)} className="btn btn-outline flex-1 justify-center !py-2 text-[12.5px]"><Pencil size={13} />Edit</button>
                <button onClick={() => handleDelete(h)} className="btn btn-danger !py-2 !px-3"><Trash2 size={13} /></button>
              </div>}
            </div>
          ))}
        </div>
      )}

      {canManage && <Modal
        open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Zona Kandang' : 'Tambah Zona Kandang'}
        footer={<>
          <button className="btn btn-outline" onClick={() => setModalOpen(false)}>Batal</button>
          <button className="btn btn-primary" form="habitat-form" type="submit" disabled={saving}>{saving ? 'Menyimpan…' : 'Simpan'}</button>
        </>}
      >
        <form id="habitat-form" onSubmit={handleSave} className="space-y-4">
          <div><label className="label">Dome</label>
            <select required className="input" value={form.domeId} onChange={e => setForm(f => ({ ...f, domeId: e.target.value }))}>
              <option value="">— pilih dome —</option>
              {domes.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div><label className="label">Zona Kandang</label><input required className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Zona B — Enclosure Kakatua" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Jenis Vegetasi</label><input className="input" value={form.vegetationType} onChange={e => setForm(f => ({ ...f, vegetationType: e.target.value }))} placeholder="Hutan hujan tropis" /></div>
            <div><label className="label">Luas Area (m²)</label><input type="number" step="0.1" className="input" value={form.areaSize} onChange={e => setForm(f => ({ ...f, areaSize: e.target.value }))} /></div>
          </div>
          <div><label className="label">Deskripsi</label><textarea rows={3} className="input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
        </form>
      </Modal>}
    </div>
  )
}
