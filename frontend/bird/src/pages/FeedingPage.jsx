import { useEffect, useState } from 'react'
import { Plus, Utensils, Pencil, Trash2 } from 'lucide-react'
import * as feedingApi from '../api/feeding.api'
import * as birdApi from '../api/bird.api'
import Modal from '../components/ui/Modal'
import { EmptyState, ErrorState, TableSkeleton } from '../components/ui/Misc'
import { useAuth } from '../context/AuthContext'

const emptyForm = { birdId: '', feedingTime: '', feedType: '', amountKg: '', frequency: 'daily' }

export default function FeedingPage() {
  const { role } = useAuth()
  const canManage = ['super_admin', 'head_keeper'].includes(role)
  const [list, setList] = useState([])
  const [birds, setBirds] = useState([])
  const [onlyToday, setOnlyToday] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [editingSchedule, setEditingSchedule] = useState(null)
  const [saving, setSaving] = useState(false)

  const load = async (today) => {
    setLoading(true); setError(null)
    try {
      const [f, b] = await Promise.all([
        today ? feedingApi.getTodayFeeding() : feedingApi.getFeedingSchedules(),
        birdApi.getBirds()
      ])
      setList(f); setBirds(b)
    } catch (e) { setError(e?.response?.data?.error || e.message) }
    finally { setLoading(false) }
  }
  useEffect(() => { load(onlyToday) }, [onlyToday])

  const openCreate = () => {
    setEditingSchedule(null)
    setForm({ ...emptyForm, birdId: birds[0]?.id || '' })
    setModalOpen(true)
  }

  const openEdit = (schedule) => {
    setEditingSchedule(schedule)
    setForm({
      birdId: String(schedule.birdId),
      feedingTime: schedule.feedingTime || '',
      feedType: schedule.feedType || '',
      amountKg: schedule.amountKg ?? '',
      frequency: schedule.frequency || 'daily'
    })
    setModalOpen(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = { ...form, birdId: parseInt(form.birdId), amountKg: form.amountKg === '' ? null : parseFloat(form.amountKg) }
      if (editingSchedule) await feedingApi.updateFeedingSchedule(editingSchedule.id, payload)
      else await feedingApi.createFeedingSchedule(payload)
      setModalOpen(false)
      await load(onlyToday)
    } catch (e) { alert(e?.response?.data?.error || 'Gagal menyimpan jadwal pakan.') }
    finally { setSaving(false) }
  }

  const handleDelete = async (schedule) => {
    if (!window.confirm('Hapus jadwal pakan ini?')) return
    try {
      await feedingApi.deleteFeedingSchedule(schedule.id)
      await load(onlyToday)
    } catch (e) {
      alert(e?.response?.data?.error || 'Gagal menghapus jadwal pakan.')
    }
  }

  return (
    <div>
      <div className="flex items-end justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-[22px] font-bold font-display tracking-tight">Feeding Schedule</h1>
          <p className="text-[13.5px] text-inksoft mt-0.5">{list.length} jadwal di tabel FeedingSchedule</p>
        </div>
        {canManage && <button onClick={openCreate} className="btn btn-primary"><Plus size={16} />Tambah Jadwal</button>}
      </div>

      <div className="flex gap-2 mb-4">
        <button onClick={() => setOnlyToday(false)} className={`filter-chip px-3.5 py-2 rounded-xl2 text-[12.5px] font-semibold border ${!onlyToday ? 'bg-primary text-white border-primary' : 'bg-white border-border text-inksoft'}`}>Semua Jadwal</button>
        <button onClick={() => setOnlyToday(true)} className={`filter-chip px-3.5 py-2 rounded-xl2 text-[12.5px] font-semibold border ${onlyToday ? 'bg-primary text-white border-primary' : 'bg-white border-border text-inksoft'}`}>Harian (Hari Ini)</button>
      </div>

      <div className="card">
        {error ? <ErrorState message={error} /> : loading ? <TableSkeleton cols={7} /> : list.length === 0 ? (
          <EmptyState icon={Utensils} title="Belum ada jadwal pakan" subtitle="Tambahkan jadwal pakan pertama untuk burung-burungmu." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr>
                  <th className="th">Burung</th><th className="th">Waktu</th><th className="th">Jenis Pakan</th>
                  <th className="th">Jumlah</th><th className="th">Frekuensi</th><th className="th">Dicatat Oleh</th>{canManage && <th className="th">Aksi</th>}
                </tr>
              </thead>
              <tbody>
                {list.map(f => (
                  <tr key={f.id} className="hover:bg-[#FFFAF3] transition-colors">
                    <td className="td font-semibold">{f.bird?.name || f.bird?.ringNumber}</td>
                    <td className="td">{f.feedingTime}</td>
                    <td className="td">{f.feedType}</td>
                    <td className="td">{f.amountKg ? `${f.amountKg} kg` : '—'}</td>
                    <td className="td capitalize">{f.frequency || '—'}</td>
                    <td className="td">{f.user?.fullName || '—'}</td>
                    {canManage && <td className="td whitespace-nowrap">
                      <button type="button" onClick={() => openEdit(f)} aria-label="Edit jadwal pakan" className="inline-flex w-8 h-8 rounded-lg border border-border items-center justify-center text-inksoft hover:border-primary hover:text-primary mr-1"><Pencil size={14} /></button>
                      <button type="button" onClick={() => handleDelete(f)} aria-label="Hapus jadwal pakan" className="inline-flex w-8 h-8 rounded-lg border border-border items-center justify-center text-danger hover:bg-red-50"><Trash2 size={14} /></button>
                    </td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {canManage && <Modal
        open={modalOpen} onClose={() => setModalOpen(false)} title={editingSchedule ? 'Edit Jadwal Pakan' : 'Tambah Jadwal Pakan'}
        footer={<>
          <button className="btn btn-outline" onClick={() => setModalOpen(false)}>Batal</button>
          <button className="btn btn-primary" form="feeding-form" type="submit" disabled={saving}>{saving ? 'Menyimpan…' : editingSchedule ? 'Simpan Perubahan' : 'Simpan'}</button>
        </>}
      >
        <form id="feeding-form" onSubmit={handleSave} className="space-y-4">
          <div><label className="label">Burung</label>
            <select required className="input" value={form.birdId} onChange={e => setForm(f => ({ ...f, birdId: e.target.value }))}>
              <option value="">— pilih burung —</option>
              {birds.map(b => <option key={b.id} value={b.id}>{b.name || b.ringNumber}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Waktu Pakan</label><input required type="time" className="input" value={form.feedingTime} onChange={e => setForm(f => ({ ...f, feedingTime: e.target.value }))} /></div>
            <div><label className="label">Jenis Pakan</label><input required className="input" value={form.feedType} onChange={e => setForm(f => ({ ...f, feedType: e.target.value }))} placeholder="Buah & biji-bijian" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Jumlah (kg)</label><input type="number" step="0.01" className="input" value={form.amountKg} onChange={e => setForm(f => ({ ...f, amountKg: e.target.value }))} /></div>
            <div><label className="label">Frekuensi</label>
              <select className="input" value={form.frequency} onChange={e => setForm(f => ({ ...f, frequency: e.target.value }))}>
                <option value="daily">Harian</option><option value="weekly">Mingguan</option><option value="once">Sekali</option>
              </select>
            </div>
          </div>
        </form>
      </Modal>}
    </div>
  )
}
