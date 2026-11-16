import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Plus, Eye, Pencil, Trash2, Feather, Search } from 'lucide-react'
import * as birdApi from '../api/bird.api'
import * as speciesApi from '../api/species.api'
import * as habitatApi from '../api/habitat.api'
import * as uploadApi from '../api/upload.api'
import Modal from '../components/ui/Modal'
import { EmptyState, ErrorState, TableSkeleton } from '../components/ui/Misc'
import { ageFromBirthDate } from '../utils/format'
import { useAuth } from '../context/AuthContext'
import { resolveMediaUrl } from '../utils/media'

const emptyForm = { speciesId: '', habitatId: '', ringNumber: '', name: '', birthDate: '', gender: '', uniqueMark: '', photoUrl: '', file: null }

export default function BirdsPage() {
  const { role } = useAuth()
  const canEdit = ['super_admin', 'head_keeper', 'keeper'].includes(role)
  const canDelete = ['super_admin', 'head_keeper', 'keeper'].includes(role)
  const [searchParams] = useSearchParams()
  const [list, setList] = useState([])
  const [species, setSpecies] = useState([])
  const [habitats, setHabitats] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [speciesFilter, setSpeciesFilter] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const q = searchParams.get('search')
    if (q !== null) setSearch(q)
  }, [searchParams])

  const load = async (speciesId) => {
    setLoading(true); setError(null)
    try {
      const [b, s, h] = await Promise.all([
        birdApi.getBirds(speciesId ? { speciesId } : {}),
        speciesApi.getSpeciesList(),
        habitatApi.getHabitats()
      ])
      setList(b); setSpecies(s); setHabitats(h)
    } catch (e) { setError(e?.response?.data?.error || e.message) }
    finally { setLoading(false) }
  }
  useEffect(() => { load(speciesFilter) }, [speciesFilter])

  const filtered = useMemo(() => {
    if (!search.trim()) return list
    const q = search.toLowerCase()
    return list.filter(b => (b.name || '').toLowerCase().includes(q) || b.ringNumber.toLowerCase().includes(q))
  }, [list, search])

  const openCreate = () => { setEditing(null); setForm(emptyForm); setModalOpen(true) }
  const openEdit = (b) => {
    setEditing(b)
    setForm({
      speciesId: b.speciesId, habitatId: b.habitatId, ringNumber: b.ringNumber, name: b.name || '',
      birthDate: b.birthDate ? b.birthDate.slice(0, 10) : '', gender: b.gender || '',
      uniqueMark: b.uniqueMark || '', photoUrl: b.photoUrl || '', file: null
    })
    setModalOpen(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      let photoUrl = form.photoUrl || null
      if (form.file) {
        const document = await uploadApi.uploadDocument({ file: form.file, category: 'bird', description: `Foto burung ${form.name || form.ringNumber}` })
        photoUrl = document.fileUrl
      }
      const formData = { ...form }
      delete formData.file
      const payload = {
        ...formData,
        photoUrl,
        speciesId: parseInt(form.speciesId),
        habitatId: parseInt(form.habitatId),
        birthDate: form.birthDate ? new Date(form.birthDate).toISOString() : null
      }
      if (editing) await birdApi.updateBird(editing.id, payload)
      else await birdApi.createBird(payload)
      setModalOpen(false); load(speciesFilter)
    } catch (e) { alert(e?.response?.data?.error || 'Gagal menyimpan data burung. Pastikan ringNumber unik.') }
    finally { setSaving(false) }
  }

  const handleDelete = async (b) => {
    if (!confirm(`Hapus burung "${b.name || b.ringNumber}"?`)) return
    try { await birdApi.deleteBird(b.id); load(speciesFilter) }
    catch (e) { alert(e?.response?.data?.error || 'Gagal menghapus burung.') }
  }

  return (
    <div>
      <div className="flex items-end justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-[22px] font-bold font-display tracking-tight">Bird Management</h1>
          <p className="text-[13.5px] text-inksoft mt-0.5">{list.length} burung tercatat di tabel Bird</p>
        </div>
        {canEdit && <button onClick={openCreate} className="btn btn-primary"><Plus size={16} />Tambah Burung</button>}
      </div>

      <div className="card mb-0">
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-border flex-wrap">
          <div className="relative w-full max-w-[280px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="input pl-9" placeholder="Cari nama atau ring number…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="input !w-auto" value={speciesFilter} onChange={e => setSpeciesFilter(e.target.value)}>
            <option value="">Semua Spesies</option>
            {species.map(s => <option key={s.id} value={s.id}>{s.localName}</option>)}
          </select>
        </div>

        {error ? <ErrorState message={error} /> : loading ? <TableSkeleton cols={7} /> : filtered.length === 0 ? (
          <EmptyState icon={Feather} title="Belum ada burung" subtitle="Tambahkan burung pertama untuk mulai memantau." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr>
                  <th className="th">Burung</th><th className="th">Ring No.</th><th className="th">Spesies</th>
                  <th className="th">Gender</th><th className="th">Umur / Rata-rata Spesies</th><th className="th">Zona Kandang</th>
                  <th className="th text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(b => (
                  <tr key={b.id} className="hover:bg-[#FFFAF3] transition-colors">
                    <td className="td">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl2 bg-gradient-to-br from-orange-300 to-primary flex items-center justify-center text-white flex-shrink-0 overflow-hidden relative">
                          {b.photoUrl ? (
                            <img 
                              src={resolveMediaUrl(b.photoUrl)} 
                              alt={b.name} 
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextElementSibling.style.display = 'flex';
                              }}
                            />
                          ) : null}
                          <div className="absolute inset-0 flex items-center justify-center" style={{ display: b.photoUrl ? 'none' : 'flex' }}>
                            <Feather size={15} />
                          </div>
                        </div>
                        <span className="font-semibold text-ink">{b.name || <span className="text-inksoft italic">Tanpa nama</span>}</span>
                      </div>
                    </td>
                    <td className="td font-mono text-[12.5px]">{b.ringNumber}</td>
                    <td className="td">{b.species?.localName}</td>
                    <td className="td capitalize">{b.gender || '—'}</td>
                    <td className="td whitespace-nowrap">
                      <div>Aktual: {ageFromBirthDate(b.birthDate)}</div>
                      <div className="text-[11px] text-inksoft">
                        Rata-rata spesies: {b.species?.avgLifespan == null ? '—' : `${b.species.avgLifespan.toLocaleString('id-ID')} thn`}
                      </div>
                    </td>
                    <td className="td">{b.habitat?.name || '—'}</td>
                    <td className="td text-right whitespace-nowrap">
                      <Link to={`/birds/${b.id}`} className="inline-flex w-7 h-7 rounded-lg border border-border items-center justify-center text-inksoft hover:border-primary hover:text-primary"><Eye size={13} /></Link>
                      {canEdit && <button onClick={() => openEdit(b)} className="inline-flex w-7 h-7 rounded-lg border border-border items-center justify-center text-inksoft hover:border-primary hover:text-primary ml-1.5"><Pencil size={13} /></button>}
                      {canDelete && <button onClick={() => handleDelete(b)} className="inline-flex w-7 h-7 rounded-lg border border-border items-center justify-center text-inksoft hover:border-danger hover:text-danger ml-1.5"><Trash2 size={13} /></button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {canEdit && <Modal
        open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Burung' : 'Tambah Burung'} wide
        footer={<>
          <button className="btn btn-outline" onClick={() => setModalOpen(false)}>Batal</button>
          <button className="btn btn-primary" form="bird-form" type="submit" disabled={saving}>{saving ? 'Menyimpan…' : 'Simpan'}</button>
        </>}
      >
        <form id="bird-form" onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Ring Number (unik)</label><input required className="input" value={form.ringNumber} onChange={e => setForm(f => ({ ...f, ringNumber: e.target.value }))} placeholder="RN-2026-014" /></div>
            <div><label className="label">Nama (opsional)</label><input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Kirana" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Spesies</label>
              <select required className="input" value={form.speciesId} onChange={e => setForm(f => ({ ...f, speciesId: e.target.value }))}>
                <option value="">— pilih spesies —</option>
                {species.map(s => <option key={s.id} value={s.id}>{s.localName}</option>)}
              </select>
            </div>
          <div><label className="label">Zona Kandang</label>
              <select required className="input" value={form.habitatId} onChange={e => setForm(f => ({ ...f, habitatId: e.target.value }))}>
                <option value="">— pilih habitat —</option>
                {habitats.map(h => <option key={h.id} value={h.id}>{h.name} ({h.dome?.name})</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Tanggal Lahir</label><input type="date" className="input" value={form.birthDate} onChange={e => setForm(f => ({ ...f, birthDate: e.target.value }))} /></div>
            <div><label className="label">Gender</label>
              <select className="input" value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}>
                <option value="">— pilih —</option><option value="male">Jantan</option><option value="female">Betina</option><option value="unknown">Belum diketahui</option>
              </select>
            </div>
          </div>
          <div><label className="label">Ciri Khusus (uniqueMark)</label><input className="input" value={form.uniqueMark} onChange={e => setForm(f => ({ ...f, uniqueMark: e.target.value }))} placeholder="Bercak putih di sayap kiri" /></div>
          <div><label className="label">Foto burung</label><input type="file" accept="image/jpeg,image/png,image/webp" className="input" onChange={e => setForm(f => ({ ...f, file: e.target.files?.[0] || null }))} />{form.photoUrl && <p className="text-xs text-inksoft mt-1">Foto saat ini tetap digunakan jika tidak memilih file baru.</p>}</div>
        </form>
      </Modal>}
    </div>
  )
}
