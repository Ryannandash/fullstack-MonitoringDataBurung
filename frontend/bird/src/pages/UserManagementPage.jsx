import { useEffect, useMemo, useState } from 'react'
import { Plus, Search, Shield, UserCog, UserX, Pencil } from 'lucide-react'
import * as usersApi from '../api/users.api'
import Modal from '../components/ui/Modal'
import { EmptyState, ErrorState, TableSkeleton } from '../components/ui/Misc'
import { getRoleLabel } from '../utils/format'

const ROLES = ['super_admin', 'head_keeper', 'keeper', 'dokter_hewan']
const EMPTY = { username: '', fullName: '', email: '', phone: '', role: 'keeper', password: '' }

export default function UserManagementPage() {
  const [users, setUsers] = useState([])
  const [form, setForm] = useState(EMPTY)
  const [editing, setEditing] = useState(null)
  const [roleFilter, setRoleFilter] = useState('')
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const result = await usersApi.getUsers({ pageSize: 100, ...(roleFilter ? { role: roleFilter } : {}) })
      setUsers(result.data)
      setError(null)
    } catch (requestError) {
      setError(requestError?.response?.data?.message || requestError.message)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [roleFilter])

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase()
    return query ? users.filter((item) => `${item.fullName} ${item.username} ${item.email}`.toLowerCase().includes(query)) : users
  }, [users, search])

  const edit = (item) => {
    setEditing(item)
    setForm({ username: item.username, fullName: item.fullName, email: item.email, phone: item.phone || '', role: item.role, password: '' })
    setOpen(true)
  }

  const save = async (event) => {
    event.preventDefault()
    setSaving(true)
    try {
      const payload = { ...form }
      if (editing && !payload.password) delete payload.password
      if (editing) await usersApi.updateUser(editing.id, payload)
      else await usersApi.createUser(payload)
      setOpen(false)
      setForm(EMPTY)
      setEditing(null)
      await load()
    } catch (saveError) {
      alert(saveError?.response?.data?.message || 'Gagal menyimpan pengguna.')
    } finally {
      setSaving(false)
    }
  }

  const deactivate = async (item) => {
    if (!window.confirm(`Nonaktifkan akun ${item.username}? Riwayat dan data terkait tidak akan dihapus.`)) return
    try {
      await usersApi.deactivateUser(item.id)
      await load()
    } catch (requestError) {
      alert(requestError?.response?.data?.message || 'Gagal menonaktifkan pengguna.')
    }
  }

  return (
    <div>
      <div className="flex items-end justify-between gap-4 mb-6 flex-wrap">
        <div><h1 className="text-[22px] font-bold font-display tracking-tight">Manajemen Pengguna</h1><p className="text-[13.5px] text-inksoft mt-0.5">Kelola akun dan role; akun dinonaktifkan agar jejak aktivitas tetap tersimpan.</p></div>
        <button className="btn btn-primary" onClick={() => { setEditing(null); setForm(EMPTY); setOpen(true) }}><Plus size={16} />Tambah Pengguna</button>
      </div>
      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="relative"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-inksoft" /><input className="input !pl-9 !w-full sm:!w-72" placeholder="Cari nama, username, email…" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
        <select className="input !w-auto" aria-label="Filter role" value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}><option value="">Semua role</option>{ROLES.map((role) => <option key={role} value={role}>{getRoleLabel(role)}</option>)}</select>
      </div>
      <div className="card">
        {error ? <ErrorState message={error} /> : loading ? <TableSkeleton cols={6} /> : !visible.length ? (
          <EmptyState icon={UserCog} title="Belum ada pengguna" subtitle="Tambahkan akun baru sesuai tanggung jawabnya." />
        ) : (
          <div className="overflow-x-auto"><table className="w-full border-collapse text-[13px]">
            <thead><tr><th className="th">Nama</th><th className="th">Username / Email</th><th className="th">Role</th><th className="th">Status</th><th className="th">Dibuat</th><th className="th">Aksi</th></tr></thead>
            <tbody>{visible.map((item) => <tr key={item.id}>
              <td className="td font-semibold">{item.fullName}</td><td className="td">{item.username}<div className="text-[11px] text-inksoft">{item.email}</div></td>
              <td className="td"><span className="badge badge-orange"><Shield size={12} />{getRoleLabel(item.role)}</span></td>
              <td className="td"><span className={`badge ${item.isActive ? 'badge-success' : 'badge-danger'}`}>{item.isActive ? 'Aktif' : 'Nonaktif'}</span></td>
              <td className="td whitespace-nowrap">{new Date(item.createdAt).toLocaleDateString('id-ID')}</td>
              <td className="td whitespace-nowrap"><button className="inline-flex w-8 h-8 rounded-lg border border-border items-center justify-center mr-1" aria-label="Edit pengguna" onClick={() => edit(item)}><Pencil size={14} /></button>{item.isActive && <button className="inline-flex w-8 h-8 rounded-lg border border-border text-danger items-center justify-center" aria-label="Nonaktifkan pengguna" onClick={() => deactivate(item)}><UserX size={14} /></button>}</td>
            </tr>)}</tbody>
          </table></div>
        )}
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit Pengguna' : 'Buat Akun Pengguna'} footer={<>
        <button className="btn btn-outline" onClick={() => setOpen(false)}>Batal</button>
        <button className="btn btn-primary" type="submit" form="user-form" disabled={saving}>{saving ? 'Menyimpan…' : 'Simpan Akun'}</button>
      </>}>
        <form id="user-form" onSubmit={save} className="space-y-4">
          <div><label className="label">Nama lengkap</label><input required className="input" value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3"><div><label className="label">Username</label><input required className="input" value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} /></div><div><label className="label">Role</label><select className="input" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>{ROLES.map((role) => <option key={role} value={role}>{getRoleLabel(role)}</option>)}</select></div></div>
          <div className="grid grid-cols-2 gap-3"><div><label className="label">Email</label><input required type="email" className="input" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></div><div><label className="label">No. HP (opsional)</label><input className="input" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></div></div>
          <div><label className="label">{editing ? 'Password baru (opsional)' : 'Password awal'}</label><input required={!editing} minLength={8} type="password" className="input" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /><p className="text-[11px] text-inksoft mt-1">Minimal 8 karakter. Password lama tidak dapat dibaca atau ditampilkan.</p></div>
        </form>
      </Modal>
    </div>
  )
}
