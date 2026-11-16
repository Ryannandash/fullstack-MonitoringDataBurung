import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Globe2, MapPinned } from 'lucide-react'
import * as domeApi from '../api/dome.api'
import Modal from '../components/ui/Modal'
import { EmptyState, ErrorState, TableSkeleton } from '../components/ui/Misc'
import { useAuth } from '../context/AuthContext'

const emptyForm = { name: '', region: '', areaSize: '' }

export default function DomesPage() {
  const { role } = useAuth()
  const canManage = ['super_admin', 'head_keeper', 'keeper'].includes(role)
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true); setError(null)
    try { setList(await domeApi.getDomes()) }
    catch (e) { setError(e?.response?.data?.error || e.message) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const openCreate = () => { setEditing(null); setForm(emptyForm); setModalOpen(true) }
  const openEdit = (d) => { setEditing(d); setForm({ name: d.name || '', region: d.region || '', areaSize: d.areaSize ?? '' }); setModalOpen(true) }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = { ...form, areaSize: form.areaSize === '' ? null : parseFloat(form.areaSize) }
      if (editing) await domeApi.updateDome(editing.id, payload)
      else await domeApi.createDome(payload)
      setModalOpen(false); load()
    } catch (e) { alert(e?.response?.data?.error || 'Gagal menyimpan dome.') }
    finally { setSaving(false) }
  }

  const handleDelete = async (d) => {
    if (!confirm(`Hapus dome "${d.name}"? Ini akan gagal jika masih ada habitat terhubung.`)) return
    try { await domeApi.deleteDome(d.id); load() }
    catch (e) { alert(e?.response?.data?.error || 'Gagal menghapus dome.') }
  }

  return (
    <div>
      <div className="flex items-end justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-[22px] font-bold font-display tracking-tight">Dome</h1>
          <p className="text-[13.5px] text-inksoft mt-0.5">{list.length} dome tercatat</p>
        </div>
        {canManage && <button onClick={openCreate} className="btn btn-primary"><Plus size={16} />Tambah Dome</button>}
      </div>

      {error ? <ErrorState message={error} /> : loading ? (
        <div className="card"><TableSkeleton cols={4} /></div>
      ) : list.length === 0 ? (
        <div className="card"><EmptyState icon={Globe2} title="Belum ada dome" subtitle="Tambahkan dome pertama sebagai lokasi utama habitat." /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {list.map(d => (
            <div key={d.id} className="card card-hover p-5">
              <div className="flex items-center gap-3.5">
                <div className="w-[52px] h-[52px] rounded-xl2 bg-gradient-to-br from-orange-300 to-primary flex items-center justify-center text-white flex-shrink-0"><Globe2 size={22} /></div>
                <div className="min-w-0">
                  <div className="font-bold text-[14.5px] truncate">{d.name}</div>
                  <div className="text-[11.5px] text-inksoft truncate">{d.region || 'Region belum diisi'}</div>
                </div>
              </div>
              <div className="flex items-center justify-between mt-4 text-[12.5px]">
                <span className="flex items-center gap-1.5 text-inksoft"><MapPinned size={13} />{d.habitats?.length ?? 0} habitat</span>
                {d.areaSize && <span className="font-semibold text-ink">{d.areaSize} m²</span>}
              </div>
              {canManage && <div className="flex gap-2 mt-4">
                <button onClick={() => openEdit(d)} className="btn btn-outline flex-1 justify-center !py-2 text-[12.5px]"><Pencil size={13} />Edit</button>
                <button onClick={() => handleDelete(d)} className="btn btn-danger !py-2 !px-3"><Trash2 size={13} /></button>
              </div>}
            </div>
          ))}
        </div>
      )}

      {canManage && <Modal
        open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Dome' : 'Tambah Dome'}
        footer={<>
          <button className="btn btn-outline" onClick={() => setModalOpen(false)}>Batal</button>
          <button className="btn btn-primary" form="dome-form" type="submit" disabled={saving}>{saving ? 'Menyimpan…' : 'Simpan'}</button>
        </>}
      >
        <form id="dome-form" onSubmit={handleSave} className="space-y-4">
          <div><label className="label">Nama Dome</label><input required className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Dome 2 — Zona Tropis" /></div>
          <div><label className="label">Region</label><input className="input" value={form.region} onChange={e => setForm(f => ({ ...f, region: e.target.value }))} placeholder="TMII, Jakarta Timur" /></div>
          <div><label className="label">Luas Area (m²)</label><input type="number" step="0.1" className="input" value={form.areaSize} onChange={e => setForm(f => ({ ...f, areaSize: e.target.value }))} /></div>
        </form>
      </Modal>}
    </div>
  )
}
