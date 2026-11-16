import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Feather, Utensils, HeartHandshake, Pencil } from 'lucide-react'
import * as birdApi from '../api/bird.api'
import * as feedingApi from '../api/feeding.api'
import * as breedingApi from '../api/breeding.api'
import * as speciesApi from '../api/species.api'
import * as habitatApi from '../api/habitat.api'
import * as uploadApi from '../api/upload.api'
import Modal from '../components/ui/Modal'
import { BreedingBadge } from '../components/ui/Badge'
import { ErrorState, EmptyState } from '../components/ui/Misc'
import { ageFromBirthDate, formatDate } from '../utils/format'
import { useAuth } from '../context/AuthContext'
import { resolveMediaUrl } from '../utils/media'
import { formatDietType } from '../utils/species'

const TABS = [
  { key: 'overview', label: 'Overview', icon: Feather },
  { key: 'feeding', label: 'Pemberian Pakan', icon: Utensils },
  { key: 'breeding', label: 'Reproduksi', icon: HeartHandshake }
]

export default function BirdDetailPage() {
  const { role } = useAuth()
  const { id } = useParams()
  const navigate = useNavigate()
  const [bird, setBird] = useState(null)
  const [feeding, setFeeding] = useState([])
  const [breeding, setBreeding] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [tab, setTab] = useState('overview')
  const [species, setSpecies] = useState([])
  const [habitats, setHabitats] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true); setError(null)
      try {
        const [b, feeds, breeds, s, h] = await Promise.all([
          birdApi.getBird(id),
          feedingApi.getFeedingSchedules(),
          breedingApi.getBreedingRecords(),
          speciesApi.getSpeciesList(),
          habitatApi.getHabitats()
        ])
        if (cancelled) return
        setBird(b)
        setFeeding(feeds.filter(f => f.birdId === parseInt(id)))
        setBreeding(breeds.filter(r => r.birdId === parseInt(id) || r.mateBirdId === parseInt(id)))
        setSpecies(s)
        setHabitats(h)
      } catch (e) {
        if (!cancelled) setError(e?.response?.data?.error || e.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [id])

  if (error) return <ErrorState message={error} />
  if (loading || !bird) {
    return <div className="space-y-4"><div className="skeleton h-40 rounded-[20px]" /><div className="skeleton h-10 w-full" /><div className="skeleton h-64" /></div>
  }

  const openEdit = () => {
    setForm({
      speciesId: bird.speciesId, habitatId: bird.habitatId, ringNumber: bird.ringNumber, name: bird.name || '',
      birthDate: bird.birthDate ? bird.birthDate.slice(0, 10) : '', gender: bird.gender || '',
      uniqueMark: bird.uniqueMark || '', photoUrl: bird.photoUrl || '', file: null
    })
    setModalOpen(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      let photoUrl = form.photoUrl || null
      if (form.file) {
        const document = await uploadApi.uploadDocument({ file: form.file, category: 'bird', birdId: bird.id, description: `Foto burung ${form.name || form.ringNumber}` })
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
      const updated = await birdApi.updateBird(bird.id, payload)
      setBird(updated)
      setModalOpen(false)
    } catch (err) { alert(err?.response?.data?.error || 'Gagal menyimpan data burung.') }
    finally { setSaving(false) }
  }

  return (
    <div>
      <button onClick={() => navigate('/birds')} className="btn btn-outline !py-2 mb-5"><ArrowLeft size={15} />Kembali ke Bird Management</button>

      <div className="rounded-[20px] p-6 bg-gradient-to-br from-orange-100 to-white border border-border flex gap-6 flex-wrap mb-5">
        <div className="w-[132px] h-[132px] rounded-[20px] flex-shrink-0 bg-gradient-to-br from-orange-300 to-primary flex items-center justify-center text-white shadow-lg2 overflow-hidden relative group">
          {bird.photoUrl ? (
            <img 
              src={resolveMediaUrl(bird.photoUrl)} 
              alt={bird.name} 
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextElementSibling.style.display = 'flex';
              }}
            />
          ) : null}
          <div className="absolute inset-0 flex items-center justify-center" style={{ display: bird.photoUrl ? 'none' : 'flex' }}>
            <Feather size={48} />
          </div>
        </div>
        <div className="flex-1 min-w-[240px]">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="m-0 text-[22px] font-bold font-display">{bird.name || bird.ringNumber}</h2>
            <span className="badge badge-orange font-mono">{bird.ringNumber}</span>
          </div>
          <div className="text-[13.5px] text-inksoft italic mt-0.5">{bird.species?.scientificName} ({bird.species?.localName})</div>
          <div className="flex gap-6 mt-4 flex-wrap">
            <QuickStat label="Umur" value={ageFromBirthDate(bird.birthDate)} />
            <QuickStat label="Gender" value={bird.gender || '—'} capitalize />
            <QuickStat label="Zona Kandang" value={`${bird.habitat?.name || '—'}`} />
            <QuickStat label="Dome" value={bird.habitat?.dome?.name || '—'} />
            <QuickStat label="Terdaftar Sejak" value={formatDate(bird.createdAt)} />
          </div>
        </div>
        {['super_admin', 'keeper'].includes(role) && <button type="button" onClick={openEdit} className="btn btn-primary self-start"><Pencil size={15} />Edit Burung</button>}
      </div>

      <div className="flex gap-1 border-b border-border mb-5 overflow-x-auto">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-[13px] font-semibold whitespace-nowrap border-b-2 transition-colors ${tab === t.key ? 'text-primary border-primary' : 'text-inksoft border-transparent hover:text-primary-600'}`}>
            <t.icon size={14} />{t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="card p-6">
            <h3 className="m-0 mb-4 text-[15px] font-bold">Informasi Umum</h3>
            <div className="grid grid-cols-2 gap-4">
              <InfoItem label="Spesies" value={bird.species?.localName} />
              <InfoItem label="Spesies Langka" value={bird.species?.conservationStatus} />
              <InfoItem label="Makanan Spesies" value={formatDietType(bird.species?.dietType)} />
              <InfoItem label="Ciri Khusus" value={bird.uniqueMark} />
              <InfoItem label="Zona Kandang" value={bird.habitat?.name} />
              <InfoItem label="Vegetasi" value={bird.habitat?.vegetationType} />
            </div>
          </div>
          <div className="card p-6">
            <h3 className="m-0 mb-4 text-[15px] font-bold">Deskripsi Spesies</h3>
            <p className="text-[13px] text-inksoft leading-relaxed m-0">{bird.species?.description || 'Belum ada deskripsi untuk spesies ini.'}</p>
          </div>
        </div>
      )}

      {tab === 'feeding' && (
        <div className="card p-6">
          {feeding.length === 0 ? <EmptyState icon={Utensils} title="Belum ada jadwal pakan" subtitle="Jadwal pakan untuk burung ini akan muncul di sini." /> : (
            <div className="divide-y divide-[#F3F1EC]">
              {feeding.map(f => (
                <div key={f.id} className="flex items-center gap-4 py-3.5 first:pt-0 last:pb-0">
                  <div className="w-14 flex-shrink-0 text-[13px] font-bold text-ink">{f.feedingTime}</div>
                  <div className="w-9 h-9 rounded-xl2 bg-orange-100 text-primary-700 flex items-center justify-center flex-shrink-0"><Utensils size={15} /></div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13.5px] font-semibold text-ink">{f.feedType}</div>
                    <div className="text-[12px] text-inksoft">{f.amountKg ? `${f.amountKg} kg · ` : ''}{f.frequency || 'sekali'}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'breeding' && (
        <div className="card p-6">
          {breeding.length === 0 ? <EmptyState icon={HeartHandshake} title="Belum ada catatan breeding" subtitle="Riwayat perkawinan dan penetasan burung ini akan muncul di sini." /> : (
            <div className="space-y-4">
              {breeding.map(r => (
                <div key={r.id} className="border border-border rounded-xl2 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <BreedingBadge status={r.status} />
                    <span className="text-[11.5px] text-inksoft">Record #{r.id}</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <InfoItem label="Tgl Kawin" value={formatDate(r.matingDate)} small />
                    <InfoItem label="Tgl Bertelur" value={formatDate(r.eggLayingDate)} small />
                    <InfoItem label="Jumlah Telur" value={r.eggCount ?? '—'} small />
                    <InfoItem label="Tgl Menetas" value={formatDate(r.hatchingDate)} small />
                    <InfoItem label="Jumlah Anakan" value={r.chickCount ?? '—'} small />
                  </div>
                  {r.notes && <p className="text-[12.5px] text-inksoft mt-3 mb-0">{r.notes}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {['super_admin', 'keeper'].includes(role) && <Modal
        open={modalOpen} onClose={() => setModalOpen(false)} title="Edit Burung" wide
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

function QuickStat({ label, value, capitalize }) {
  return (
    <div>
      <div className={`text-[16px] font-extrabold font-display text-ink ${capitalize ? 'capitalize' : ''}`}>{value || '—'}</div>
      <div className="text-[11px] text-inksoft font-semibold uppercase tracking-wide">{label}</div>
    </div>
  )
}

function InfoItem({ label, value, small }) {
  return (
    <div>
      <div className="text-[11px] text-inksoft font-semibold uppercase tracking-wide">{label}</div>
      <div className={`${small ? 'text-[12.5px]' : 'text-[13.5px]'} font-semibold text-ink mt-0.5`}>{value || '—'}</div>
    </div>
  )
}
