import { useEffect, useState } from 'react'
import { Plus, PackageOpen, Pencil, Trash2 } from 'lucide-react'
import * as inventoryApi from '../api/inventory.api'
import Modal from '../components/ui/Modal'
import { EmptyState, ErrorState, TableSkeleton } from '../components/ui/Misc'
import { formatDateTime } from '../utils/format'

const emptyItem = {
  name: '',
  containerUnit: 'container',
  containerCapacityKg: '40',
  currentContainers: '',
  minimumContainers: '0',
  maximumContainers: ''
}
const formatQuantity = (value) => Number(value || 0).toLocaleString('id-ID', { maximumFractionDigits: 2 })

export default function InventoryPage() {
  const [items, setItems] = useState([])
  const [form, setForm] = useState(emptyItem)
  const [editingItem, setEditingItem] = useState(null)
  const [adjustments, setAdjustments] = useState({})
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      setItems(await inventoryApi.getInventory())
      setError(null)
    } catch (requestError) {
      setError(requestError?.response?.data?.error || requestError.message)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  const openCreate = () => {
    setEditingItem(null)
    setForm(emptyItem)
    setOpen(true)
  }

  const openEdit = (item) => {
    setEditingItem(item)
    setForm({
      name: item.name,
      containerUnit: item.containerUnit,
      containerCapacityKg: String(item.containerCapacityKg),
      currentContainers: '',
      minimumContainers: String(item.minimumContainers),
      maximumContainers: item.maximumContainers === null ? '' : String(item.maximumContainers)
    })
    setOpen(true)
  }

  const saveItem = async (event) => {
    event.preventDefault()
    setSaving(true)
    try {
      if (editingItem) {
        await inventoryApi.updateInventoryItem(editingItem.id, {
          name: form.name,
          containerUnit: form.containerUnit,
          containerCapacityKg: Number(form.containerCapacityKg),
          minimumContainers: Number(form.minimumContainers || 0),
          maximumContainers: form.maximumContainers === '' ? null : Number(form.maximumContainers)
        })
      } else {
        await inventoryApi.createInventoryItem({
          name: form.name,
          containerUnit: form.containerUnit,
          containerCapacityKg: Number(form.containerCapacityKg),
          currentContainers: Number(form.currentContainers || 0),
          minimumContainers: Number(form.minimumContainers || 0),
          maximumContainers: form.maximumContainers === '' ? null : Number(form.maximumContainers)
        })
      }
      setForm(emptyItem)
      setOpen(false)
      setEditingItem(null)
      await load()
    } catch (saveError) {
      alert(saveError?.response?.data?.error || saveError?.response?.data?.message || 'Gagal menyimpan stok pakan.')
    } finally {
      setSaving(false)
    }
  }

  const removeItem = async (item) => {
    if (!window.confirm(`Hapus jenis pakan "${item.name}" beserta riwayat pergerakan stoknya?`)) return
    try {
      await inventoryApi.deleteInventoryItem(item.id)
      await load()
    } catch (deleteError) {
      alert(deleteError?.response?.data?.error || deleteError?.response?.data?.message || 'Gagal menghapus jenis pakan.')
    }
  }

  const adjust = async (item) => {
    const formValue = adjustments[item.id] || {}
    const quantity = Number(formValue.quantity)
    if (!Number.isFinite(quantity) || quantity <= 0) {
      alert('Masukkan jumlah stok yang lebih besar dari nol.')
      return
    }
    setSaving(true)
    try {
      await inventoryApi.adjustInventory(item.id, {
        changeContainers: formValue.action === 'remove' ? -quantity : quantity,
        note: formValue.note || null
      })
      setAdjustments((current) => ({ ...current, [item.id]: {} }))
      await load()
    } catch (saveError) {
      alert(saveError?.response?.data?.error || 'Gagal memperbarui stok.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="flex items-end justify-between gap-4 mb-6 flex-wrap">
        <div><h1 className="text-[22px] font-bold font-display tracking-tight">Stok Pakan</h1><p className="text-[13.5px] text-inksoft mt-0.5">Catat jumlah container, takaran tiap container, serta batas minimum dan maksimum.</p></div>
        <button className="btn btn-primary" onClick={openCreate}><Plus size={16} />Tambah Jenis Pakan</button>
      </div>
      <div className="card">
        {error ? <ErrorState message={error} /> : loading ? <TableSkeleton cols={8} /> : items.length === 0 ? (
          <EmptyState icon={PackageOpen} title="Belum ada stok pakan" subtitle="Tambahkan jenis pakan dan tentukan batas stok minimumnya." />
        ) : (
          <div className="overflow-x-auto"><table className="w-full border-collapse text-[13px]">
            <thead><tr><th className="th">Jenis Pakan</th><th className="th">Stok Saat Ini</th><th className="th">Takaran / Container</th><th className="th">Batas Minimum</th><th className="th">Batas Maksimum</th><th className="th">Status</th><th className="th">Perbarui Stok</th><th className="th">Aksi</th></tr></thead>
            <tbody>{items.map((item) => {
              const low = item.currentContainers <= item.minimumContainers
              const overMaximum = item.maximumContainers !== null && item.currentContainers > item.maximumContainers
              const full = item.maximumContainers !== null && item.currentContainers >= item.maximumContainers
              const adjustment = adjustments[item.id] || {}
              return <tr key={item.id}>
                <td className="td font-semibold">{item.name}</td>
                <td className="td">
                  {formatQuantity(item.currentContainers)} {item.containerUnit}
                  <div className="text-[11px] text-inksoft mt-1">{formatQuantity(item.currentStock)} kg total</div>
                </td>
                <td className="td">{formatQuantity(item.containerCapacityKg)} kg / {item.containerUnit}</td>
                <td className="td">{formatQuantity(item.minimumContainers)} {item.containerUnit}</td>
                <td className="td">{item.maximumContainers === null ? '—' : `${formatQuantity(item.maximumContainers)} ${item.containerUnit}`}</td>
                <td className="td"><span className={`badge ${low ? 'badge-danger' : full ? 'badge-warning' : 'badge-success'}`}>{low ? 'Stok menipis' : overMaximum ? 'Melebihi batas' : full ? 'Batas maksimum' : 'Aman'}</span></td>
                <td className="td min-w-[330px]">
                  <div className="flex gap-2 items-center">
                    <select className="input !w-24" value={adjustment.action || 'add'} onChange={(e) => setAdjustments({ ...adjustments, [item.id]: { ...adjustment, action: e.target.value } })}>
                      <option value="add">Tambah</option><option value="remove">Pakai</option>
                    </select>
                    <input type="number" min="0.01" step="0.01" className="input !w-24" placeholder={item.containerUnit} aria-label={`Jumlah ${item.containerUnit} untuk ${item.name}`} value={adjustment.quantity || ''} onChange={(e) => setAdjustments({ ...adjustments, [item.id]: { ...adjustment, quantity: e.target.value } })} />
                    <input className="input !w-36" placeholder="Catatan" value={adjustment.note || ''} onChange={(e) => setAdjustments({ ...adjustments, [item.id]: { ...adjustment, note: e.target.value } })} />
                    <button className="btn btn-outline !py-2" onClick={() => adjust(item)} disabled={saving}>Simpan</button>
                  </div>
                  {item.movements?.[0] && <div className="text-[11px] text-inksoft mt-1">Perubahan terakhir {formatDateTime(item.movements[0].createdAt)} · oleh {item.movements[0].user?.fullName || '—'}</div>}
                </td>
                <td className="td whitespace-nowrap">
                  <button type="button" onClick={() => openEdit(item)} aria-label={`Edit ${item.name}`} className="inline-flex w-8 h-8 rounded-lg border border-border items-center justify-center text-inksoft hover:border-primary hover:text-primary mr-1"><Pencil size={14} /></button>
                  <button type="button" onClick={() => removeItem(item)} aria-label={`Hapus ${item.name}`} className="inline-flex w-8 h-8 rounded-lg border border-border items-center justify-center text-danger hover:bg-red-50"><Trash2 size={14} /></button>
                </td>
              </tr>
            })}</tbody>
          </table></div>
        )}
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title={editingItem ? 'Edit Jenis Pakan' : 'Tambah Jenis Pakan'} footer={<>
        <button className="btn btn-outline" onClick={() => setOpen(false)}>Batal</button>
        <button className="btn btn-primary" form="inventory-form" type="submit" disabled={saving}>{saving ? 'Menyimpan…' : editingItem ? 'Simpan Perubahan' : 'Simpan'}</button>
      </>}>
        <form id="inventory-form" onSubmit={saveItem} className="space-y-4">
          <div><label className="label">Nama Pakan</label><input required className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Satuan wadah</label><input required className="input" placeholder="container, ember, atau drum" value={form.containerUnit} onChange={(e) => setForm({ ...form, containerUnit: e.target.value })} /><p className="text-[11px] text-inksoft mt-1">Isi dengan jenis wadah, bukan jenis kemasan.</p></div>
            <div><label className="label">Takaran per container (kg)</label><input required type="number" min="0.01" step="0.01" className="input" value={form.containerCapacityKg} onChange={(e) => setForm({ ...form, containerCapacityKg: e.target.value })} /></div>
            {!editingItem && <div><label className="label">Stok awal (jumlah container)</label><input type="number" min="0" step="0.01" className="input" value={form.currentContainers} onChange={(e) => setForm({ ...form, currentContainers: e.target.value })} /></div>}
            <div><label className="label">Batas minimum (container)</label><input type="number" min="0" step="0.01" className="input" value={form.minimumContainers} onChange={(e) => setForm({ ...form, minimumContainers: e.target.value })} /></div>
            <div><label className="label">Batas maksimum (container)</label><input type="number" min="0" step="0.01" className="input" placeholder="Tidak dibatasi" value={form.maximumContainers} onChange={(e) => setForm({ ...form, maximumContainers: e.target.value })} /></div>
          </div>
        </form>
      </Modal>
    </div>
  )
}
