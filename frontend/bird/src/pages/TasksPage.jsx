import { useEffect, useMemo, useState } from 'react'
import { ListChecks, Pencil, Plus, Send, Trash2 } from 'lucide-react'
import * as workflowApi from '../api/workflows.api'
import * as birdApi from '../api/bird.api'
import * as habitatApi from '../api/habitat.api'
import { useAuth } from '../context/AuthContext'
import Modal from '../components/ui/Modal'
import { EmptyState, ErrorState, TableSkeleton } from '../components/ui/Misc'
import { formatDateTime } from '../utils/format'

const STATUSES = ['DITUGASKAN', 'DIKERJAKAN', 'SELESAI']

export default function TasksPage() {
  const { role, user } = useAuth()
  const canAssign = ['super_admin', 'head_keeper'].includes(role)
  const [tasks, setTasks] = useState([])
  const [keepers, setKeepers] = useState([])
  const [birds, setBirds] = useState([])
  const [habitats, setHabitats] = useState([])
  const [form, setForm] = useState({ assignedToId: '', title: '', activityType: 'Aktivitas lainnya', birdId: '', habitatId: '', details: '', dueAt: '' })
  const [statusForms, setStatusForms] = useState({})
  const [editing, setEditing] = useState(null)
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const [taskList, keeperList, birdList, habitatList] = await Promise.all([
        workflowApi.getTasks(),
        canAssign ? workflowApi.getTaskKeepers() : Promise.resolve([]),
        birdApi.getBirds(),
        habitatApi.getHabitats()
      ])
      setTasks(taskList)
      setKeepers(keeperList)
      setBirds(birdList)
      setHabitats(habitatList)
      setError(null)
    } catch (requestError) {
      setError(requestError?.response?.data?.message || requestError.message)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [role])

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase()
    return query ? tasks.filter((task) => `${task.title} ${task.activityType} ${task.assignedTo?.fullName || task.assignedTo?.username || ''}`.toLowerCase().includes(query)) : tasks
  }, [tasks, search])

  const save = async (event) => {
    event.preventDefault()
    setSaving(true)
    try {
      const payload = {
        ...form,
        assignedToId: Number(form.assignedToId),
        birdId: form.birdId ? Number(form.birdId) : null,
        habitatId: form.habitatId ? Number(form.habitatId) : null,
        dueAt: form.dueAt ? new Date(form.dueAt).toISOString() : null
      }
      if (editing) await workflowApi.updateTask(editing.id, payload)
      else await workflowApi.createTask(payload)
      setOpen(false)
      setEditing(null)
      setForm({ assignedToId: '', title: '', activityType: 'Aktivitas lainnya', birdId: '', habitatId: '', details: '', dueAt: '' })
      await load()
    } catch (saveError) {
      alert(saveError?.response?.data?.message || 'Gagal membuat penugasan.')
    } finally {
      setSaving(false)
    }
  }

  const editTask = (task) => {
    setEditing(task)
    setForm({
      assignedToId: String(task.assignedToId),
      title: task.title,
      activityType: task.activityType,
      birdId: task.birdId ? String(task.birdId) : '',
      habitatId: task.habitatId ? String(task.habitatId) : '',
      details: task.details || '',
      dueAt: task.dueAt ? new Date(new Date(task.dueAt).getTime() - new Date(task.dueAt).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''
    })
    setOpen(true)
  }

  const removeTask = async (task) => {
    if (!window.confirm(`Hapus penugasan "${task.title}"?`)) return
    try {
      await workflowApi.deleteTask(task.id)
      await load()
    } catch (deleteError) {
      alert(deleteError?.response?.data?.message || 'Gagal menghapus penugasan.')
    }
  }

  const updateStatus = async (task) => {
    const data = statusForms[task.id] || { status: task.status, completionNote: task.completionNote || '' }
    setSaving(true)
    try {
      await workflowApi.updateTaskStatus(task.id, data)
      await load()
    } catch (updateError) {
      alert(updateError?.response?.data?.message || 'Gagal memperbarui penugasan.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="flex items-end justify-between gap-4 mb-6 flex-wrap">
        <div><h1 className="text-[22px] font-bold font-display tracking-tight">Penugasan</h1><p className="text-[13.5px] text-inksoft mt-0.5">Head Keeper membagikan tugas; Keeper memperbarui progres pekerjaannya.</p></div>
        {canAssign && <button className="btn btn-primary" onClick={() => {
          setEditing(null)
          setForm({ assignedToId: '', title: '', activityType: 'Aktivitas lainnya', birdId: '', habitatId: '', details: '', dueAt: '' })
          setOpen(true)
        }}><Plus size={16} />Buat Penugasan</button>}
      </div>
      <input className="input !w-full sm:!w-72 mb-4" aria-label="Cari tugas" placeholder="Cari tugas atau Keeper…" value={search} onChange={(event) => setSearch(event.target.value)} />
      <div className="card">
        {error ? <ErrorState message={error} /> : loading ? <TableSkeleton cols={6} /> : !visible.length ? (
          <EmptyState icon={ListChecks} title="Belum ada penugasan" subtitle={role === 'keeper' ? 'Tugas yang diberikan kepada Anda akan muncul di sini.' : 'Buat penugasan untuk Keeper.'} />
        ) : (
          <div className="overflow-x-auto"><table className="w-full border-collapse text-[13px]">
            <thead><tr><th className="th">Tugas</th><th className="th">Keeper</th><th className="th">Burung / habitat</th><th className="th">Tenggat</th><th className="th">Status</th><th className="th">Progres</th>{canAssign && <th className="th">Aksi</th>}</tr></thead>
            <tbody>{visible.map((task) => {
              const statusForm = statusForms[task.id] || { status: task.status, completionNote: task.completionNote || '' }
              const isAssignedKeeper = role === 'keeper' && task.assignedToId === user?.id
              return <tr key={task.id}>
                <td className="td"><div className="font-semibold">{task.title}</div><div className="text-[11px] text-inksoft">{task.activityType}{task.details ? ` · ${task.details}` : ''}</div></td>
                <td className="td">{task.assignedTo?.fullName || task.assignedTo?.username}</td>
                <td className="td">{task.bird?.name || task.bird?.ringNumber || task.habitat?.name || '—'}</td>
                <td className="td whitespace-nowrap">{formatDateTime(task.dueAt)}</td>
                <td className="td"><span className="badge badge-orange">{task.status}</span></td>
                <td className="td min-w-[240px]">
                  {(isAssignedKeeper || canAssign) && <div className="flex flex-col gap-2">
                    <select className="input !py-2" value={statusForm.status} onChange={(event) => setStatusForms({ ...statusForms, [task.id]: { ...statusForm, status: event.target.value } })}>
                      {STATUSES.filter((item) => !isAssignedKeeper || item !== 'DITUGASKAN').map((item) => <option key={item}>{item}</option>)}
                    </select>
                    <input className="input !py-2" placeholder="Catatan progres" value={statusForm.completionNote} onChange={(event) => setStatusForms({ ...statusForms, [task.id]: { ...statusForm, completionNote: event.target.value } })} />
                    <button className="btn btn-outline !py-2" disabled={saving} onClick={() => updateStatus(task)}><Send size={14} />Simpan</button>
                  </div>}
                </td>
                {canAssign && <td className="td whitespace-nowrap">
                  <button className="inline-flex w-8 h-8 rounded-lg border border-border items-center justify-center mr-1" aria-label="Edit penugasan" onClick={() => editTask(task)}><Pencil size={14} /></button>
                  <button className="inline-flex w-8 h-8 rounded-lg border border-border text-danger items-center justify-center" aria-label="Hapus penugasan" onClick={() => removeTask(task)}><Trash2 size={14} /></button>
                </td>}
              </tr>
            })}</tbody>
          </table></div>
        )}
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit Penugasan' : 'Buat Penugasan'} wide footer={<>
        <button className="btn btn-outline" onClick={() => setOpen(false)}>Batal</button>
        <button className="btn btn-primary" form="task-form" type="submit" disabled={saving}>Simpan Tugas</button>
      </>}>
        <form id="task-form" onSubmit={save} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label className="label">Keeper</label><select required className="input" value={form.assignedToId} onChange={(event) => setForm({ ...form, assignedToId: event.target.value })}><option value="">Pilih Keeper</option>{keepers.map((item) => <option key={item.id} value={item.id}>{item.fullName} · {item.username}</option>)}</select></div>
          <div><label className="label">Jenis aktivitas</label><select className="input" value={form.activityType} onChange={(event) => setForm({ ...form, activityType: event.target.value })}>{['Pakan', 'Breeding', 'Pelatihan', 'Kebersihan', 'Pengamatan', 'Aktivitas lainnya'].map((item) => <option key={item}>{item}</option>)}</select></div>
          <div className="md:col-span-2"><label className="label">Judul tugas</label><input required maxLength={150} className="input" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></div>
          <div><label className="label">Burung (opsional)</label><select className="input" value={form.birdId} onChange={(event) => setForm({ ...form, birdId: event.target.value })}><option value="">Tidak ditentukan</option>{birds.map((bird) => <option key={bird.id} value={bird.id}>{bird.name || bird.ringNumber}</option>)}</select></div>
          <div><label className="label">Habitat (opsional)</label><select className="input" value={form.habitatId} onChange={(event) => setForm({ ...form, habitatId: event.target.value })}><option value="">Tidak ditentukan</option>{habitats.map((habitat) => <option key={habitat.id} value={habitat.id}>{habitat.name}</option>)}</select></div>
          <div><label className="label">Tenggat</label><input type="datetime-local" className="input" value={form.dueAt} onChange={(event) => setForm({ ...form, dueAt: event.target.value })} /></div>
          <div><label className="label">Instruksi</label><textarea rows={2} className="input" value={form.details} onChange={(event) => setForm({ ...form, details: event.target.value })} /></div>
        </form>
      </Modal>
    </div>
  )
}
