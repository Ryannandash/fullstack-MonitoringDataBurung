import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Dna } from 'lucide-react'
import * as speciesApi from '../api/species.api'
import * as uploadApi from '../api/upload.api'
import Modal from '../components/ui/Modal'
import { EmptyState, ErrorState, TableSkeleton } from '../components/ui/Misc'
import { ConservationBadge } from '../components/ui/Badge'
import { useAuth } from '../context/AuthContext'
import { resolveMediaUrl } from '../utils/media'
import { formatDietType } from '../utils/species'

const emptyForm = { scientificName: '', localName: '', conservationStatus: '', dietTypes: [], keyTrait: '', distributionStatus: '', vegetations: [], isProtected: false, avgLifespan: '', description: '', photoUrl: '', file: null }

const DIET_OPTIONS = [
  { value: 'Carnivorous', label: 'Pemakan daging (Carnivorous)' },
  { value: 'Frugivorous', label: 'Pemakan buah (Frugivorous)' },
  { value: 'Piscivorous', label: 'Pemakan ikan (Piscivorous)' },
  { value: 'Palynivorous', label: 'Pemakan serbuk sari (Palynivorous)' },
  { value: 'Molluscivorous', label: 'Pemakan moluska (Molluscivorous)' },
  { value: 'Herbivorous', label: 'Pemakan tumbuhan (Herbivorous)' },
  { value: 'Omnivorous', label: 'Pemakan segala (Omnivorous)' },
  { value: 'Avivorous', label: 'Pemakan burung (Avivorous)' },
  { value: 'Nectivorous', label: 'Pemakan nektar (Nectivorous)' },
  { value: 'Mucivorous', label: 'Pemakan lendir dan getah (Mucivorous)' },
  { value: 'Ophiophagous', label: 'Pemakan ular (Ophiophagous)' },
  { value: 'Insectivorous', label: 'Pemakan serangga (Insectivorous)' },
  { value: 'Granivorous', label: 'Pemakan biji-bijian (Granivorous)' }
]
const VEGETATION_OPTIONS = ['Hutan', 'Perkebunan / semak-semak', 'Rerumputan', 'Perkotaan / habitat buatan manusia', 'Hutan dan non-hutan', 'Danau dan kolam', 'Sungai', 'Pantai / laut', 'Hutan bakau / lahan basah / rawa']
const splitOptions = (value) => value ? value.split(',').map((item) => item.trim()).filter(Boolean) : []

export default function SpeciesPage() {
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
    try {
      setList(await speciesApi.getSpeciesList())
    } catch (e) {
      setError(e?.response?.data?.error || e.message)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  const openCreate = () => { setEditing(null); setForm(emptyForm); setModalOpen(true) }
  const openEdit = (s) => {
    setEditing(s)
    setForm({
      scientificName: s.scientificName || '', localName: s.localName || '',
      conservationStatus: s.conservationStatus || '', dietTypes: splitOptions(s.dietType),
      keyTrait: s.keyTrait || '', distributionStatus: s.distributionStatus || '', vegetations: splitOptions(s.vegetation),
      isProtected: Boolean(s.isProtected), avgLifespan: s.avgLifespan ?? '', description: s.description || '', photoUrl: s.photoUrl || '', file: null
    })
    setModalOpen(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      let photoUrl = form.photoUrl || null
      if (form.file) {
        const document = await uploadApi.uploadDocument({ file: form.file, category: 'species', description: `Foto spesies ${form.localName}` })
        photoUrl = document.fileUrl
      }
      const formData = { ...form }
      delete formData.file
      delete formData.dietTypes
      delete formData.vegetations
      const payload = {
        ...formData,
        dietType: form.dietTypes.join(', '),
        vegetation: form.vegetations.join(', '),
        photoUrl,
        avgLifespan: form.avgLifespan === '' ? null : parseFloat(form.avgLifespan)
      }
      if (editing) await speciesApi.updateSpecies(editing.id, payload)
      else await speciesApi.createSpecies(payload)
      setModalOpen(false)
      load()
    } catch (e) {
      alert(e?.response?.data?.error || 'Gagal menyimpan spesies.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (s) => {
    if (!confirm(`Hapus spesies "${s.localName}"? Ini akan gagal jika masih ada burung terhubung.`)) return
    try {
      await speciesApi.deleteSpecies(s.id)
      load()
    } catch (e) {
      alert(e?.response?.data?.error || 'Gagal menghapus spesies.')
    }
  }

  return (
    <div>
      <div className="flex items-end justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-[22px] font-bold font-display tracking-tight">Species</h1>
          <p className="text-[13.5px] text-inksoft mt-0.5">{list.length} spesies tercatat di tabel Species</p>
        </div>
        {canManage && <button onClick={openCreate} className="btn btn-primary"><Plus size={16} />Tambah Spesies</button>}
      </div>

      {error ? <ErrorState message={error} /> : loading ? (
        <div className="card"><TableSkeleton cols={4} /></div>
      ) : list.length === 0 ? (
        <div className="card"><EmptyState icon={Dna} title="Belum ada spesies" subtitle="Tambahkan spesies pertama untuk mulai mendata burung." /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {list.map(s => (
            <div key={s.id} className="card card-hover p-5">
              <div className="flex items-center gap-3.5">
                <div className="w-[52px] h-[52px] rounded-xl2 bg-gradient-to-br from-orange-300 to-primary flex items-center justify-center text-white flex-shrink-0 overflow-hidden relative">
                  {s.photoUrl ? (
                    <img 
                      src={resolveMediaUrl(s.photoUrl)} 
                      alt={s.localName} 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextElementSibling.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div className="absolute inset-0 flex items-center justify-center" style={{ display: s.photoUrl ? 'none' : 'flex' }}>
                    <Dna size={22} />
                  </div>
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-[14px] truncate">{s.localName}</div>
                  <div className="text-[11.5px] text-inksoft italic truncate">{s.scientificName}</div>
                </div>
              </div>
              <div className="flex items-center justify-between mt-4">
                <div><div className="text-[11px] text-inksoft mb-1">Spesies langka</div><ConservationBadge status={s.conservationStatus} /></div>
                <span className="text-[12.5px] font-bold text-ink">{s.birds?.length ?? '—'} burung</span>
              </div>
              {s.keyTrait && <div className="text-[12px] text-inksoft mt-3">Sifat utama: {s.keyTrait === 'Diurnal' ? 'Diurnal (aktif siang)' : 'Nocturnal (aktif malam)'}</div>}
              {s.distributionStatus && <div className="text-[12px] text-inksoft">Distribusi: {s.distributionStatus}</div>}
              {s.vegetation && <div className="text-[12px] text-inksoft">Vegetasi: {s.vegetation}</div>}
              {s.dietType && <div className="text-[12px] text-inksoft">Makanan: {formatDietType(s.dietType)}</div>}
              <div className="text-[12px] text-inksoft">Perlindungan: {s.isProtected ? 'Dilindungi' : 'Tidak dilindungi'}</div>
              {s.avgLifespan && <div className="text-[12px] text-inksoft">Umur rata-rata: {s.avgLifespan} tahun</div>}
              {canManage && <div className="flex gap-2 mt-4">
                <button onClick={() => openEdit(s)} className="btn btn-outline flex-1 justify-center !py-2 text-[12.5px]"><Pencil size={13} />Edit</button>
                <button onClick={() => handleDelete(s)} className="btn btn-danger !py-2 !px-3"><Trash2 size={13} /></button>
              </div>}
            </div>
          ))}
        </div>
      )}

      {canManage && <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Spesies' : 'Tambah Spesies'}
        footer={<>
          <button className="btn btn-outline" onClick={() => setModalOpen(false)}>Batal</button>
          <button className="btn btn-primary" form="species-form" type="submit" disabled={saving}>{saving ? 'Menyimpan…' : 'Simpan'}</button>
        </>}
      >
        <form id="species-form" onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Nama Lokal</label><input required className="input" value={form.localName} onChange={e => setForm(f => ({ ...f, localName: e.target.value }))} placeholder="Jalak Bali" /></div>
            <div><label className="label">Nama Ilmiah</label><input required className="input" value={form.scientificName} onChange={e => setForm(f => ({ ...f, scientificName: e.target.value }))} placeholder="Leucopsar rothschildi" /></div>
          </div>
          <div><label className="label">Spesies langka</label>
            <select className="input" value={form.conservationStatus} onChange={e => setForm(f => ({ ...f, conservationStatus: e.target.value }))}>
              <option value="">— pilih —</option>
              <option value="Critically Endangered">Kritis (CR)</option>
              <option value="Endangered">Terancam (EN)</option>
              <option value="Vulnerable">Rentan (VU)</option>
              <option value="Near Threatened">Hampir terancam (NT)</option>
              <option value="Least Concern">Risiko rendah (LC)</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Sifat utama</label><select className="input" value={form.keyTrait} onChange={e => setForm(f => ({ ...f, keyTrait: e.target.value }))}><option value="">Pilih sifat</option><option value="Diurnal">Diurnal (aktif siang)</option><option value="Nocturnal">Nocturnal (aktif malam)</option></select></div>
            <div><label className="label">Status distribusi</label><select className="input" value={form.distributionStatus} onChange={e => setForm(f => ({ ...f, distributionStatus: e.target.value }))}><option value="">Pilih status</option><option value="Endemic">Endemik</option><option value="Migratory">Migran</option><option value="Invasive">Jenis asing invasif</option><option value="Native">Asli</option><option value="Introduced">Diintroduksi</option></select></div>
            <div><label className="label">Umur Rata-rata (tahun)</label><input type="number" step="0.1" className="input" value={form.avgLifespan} onChange={e => setForm(f => ({ ...f, avgLifespan: e.target.value }))} /></div>
          </div>
          <fieldset><legend className="label">Makanan (pilih semua yang sesuai)</legend><div className="grid grid-cols-2 md:grid-cols-3 gap-2">{DIET_OPTIONS.map(({ value, label }) => <label key={value} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.dietTypes.includes(value)} onChange={e => setForm(f => ({ ...f, dietTypes: e.target.checked ? [...f.dietTypes, value] : f.dietTypes.filter(item => item !== value) }))} />{label}</label>)}</div></fieldset>
          <fieldset><legend className="label">Vegetasi (pilih semua yang sesuai)</legend><div className="grid grid-cols-1 md:grid-cols-2 gap-2">{VEGETATION_OPTIONS.map(option => <label key={option} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.vegetations.includes(option)} onChange={e => setForm(f => ({ ...f, vegetations: e.target.checked ? [...f.vegetations, option] : f.vegetations.filter(item => item !== option) }))} />{option}</label>)}</div></fieldset>
          <div><label className="label">Status perlindungan</label><select className="input" value={form.isProtected ? 'true' : 'false'} onChange={e => setForm(f => ({ ...f, isProtected: e.target.value === 'true' }))}><option value="false">Tidak dilindungi</option><option value="true">Dilindungi</option></select></div>
          <div><label className="label">Deskripsi</label><textarea rows={3} className="input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
          <div><label className="label">Foto spesies</label><input type="file" accept="image/jpeg,image/png,image/webp" className="input" onChange={e => setForm(f => ({ ...f, file: e.target.files?.[0] || null }))} />{form.photoUrl && <p className="text-xs text-inksoft mt-1">Foto saat ini tetap digunakan jika tidak memilih file baru.</p>}</div>
        </form>
      </Modal>}
    </div>
  )
}
