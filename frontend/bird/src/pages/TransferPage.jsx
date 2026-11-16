import { useEffect, useState } from 'react'
import { ArrowRightLeft } from 'lucide-react'
import * as transferApi from '../api/transfer.api'
import * as birdApi from '../api/bird.api'
import * as habitatApi from '../api/habitat.api'
import { EmptyState, ErrorState, TableSkeleton } from '../components/ui/Misc'
import { formatDateTime } from '../utils/format'
import { useAuth } from '../context/AuthContext'

export default function TransferPage() {
  const { role } = useAuth()
  const canRequest = ['super_admin', 'keeper'].includes(role)
  const canReview = role === 'head_keeper'
  const [transfers, setTransfers] = useState([])
  const [birds, setBirds] = useState([])
  const [habitats, setHabitats] = useState([])
  const [birdId, setBirdId] = useState('')
  const [toHabitatId, setToHabitatId] = useState('')
  const [movedAt, setMovedAt] = useState(new Date().toISOString().slice(0, 16))
  const [reason, setReason] = useState('')
  const [reviewNotes, setReviewNotes] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const [history, birdList, habitatList] = await Promise.all([
        transferApi.getTransfers(), birdApi.getBirds(), habitatApi.getHabitats()
      ])
      setTransfers(history)
      setBirds(birdList)
      setHabitats(habitatList)
      setError(null)
    } catch (requestError) {
      setError(requestError?.response?.data?.message || requestError?.response?.data?.error || requestError.message)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  const selectedBird = birds.find((bird) => bird.id === Number(birdId))
  const destinations = habitats.filter((habitat) => habitat.id !== selectedBird?.habitatId)

  const submit = async (event) => {
    event.preventDefault()
    setSaving(true)
    try {
      await transferApi.createTransfer({
        birdId: Number(birdId),
        toHabitatId: Number(toHabitatId),
        movedAt: new Date(movedAt).toISOString(),
        reason: reason || null
      })
      setReason('')
      setToHabitatId('')
      await load()
    } catch (saveError) {
      alert(saveError?.response?.data?.message || saveError?.response?.data?.error || 'Gagal mencatat perpindahan.')
    } finally {
      setSaving(false)
    }
  }

  const review = async (transfer, action) => {
    try {
      await transferApi.reviewTransfer(transfer.id, { action, note: reviewNotes[transfer.id] || '' })
      await load()
    } catch (reviewError) {
      alert(reviewError?.response?.data?.message || reviewError?.response?.data?.error || 'Gagal memverifikasi perpindahan.')
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[22px] font-bold font-display tracking-tight">Riwayat Perpindahan</h1>
        <p className="text-[13.5px] text-inksoft mt-0.5">Habitat asal mengikuti habitat burung. Pilih habitat lain sebagai tujuan perpindahan.</p>
      </div>

      {canRequest && <form className="card p-5 mb-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3 items-end" onSubmit={submit}>
        <div><label className="label">Burung</label><select required className="input" value={birdId} onChange={(e) => { setBirdId(e.target.value); setToHabitatId('') }}>
          <option value="">Pilih burung</option>{birds.map((bird) => <option key={bird.id} value={bird.id}>{bird.name || bird.ringNumber}</option>)}
        </select></div>
        <div><label className="label">Habitat Asal</label><input className="input" readOnly value={selectedBird?.habitat?.name || habitats.find((habitat) => habitat.id === selectedBird?.habitatId)?.name || ''} placeholder="Pilih burung dahulu" /></div>
        <div>
          <label className="label">Habitat Tujuan</label>
          <select
            required
            className="input"
            value={toHabitatId}
            disabled={!selectedBird || destinations.length === 0}
            onChange={(e) => setToHabitatId(e.target.value)}
          >
            <option value="">Pilih habitat</option>{destinations.map((habitat) => <option key={habitat.id} value={habitat.id}>{habitat.name} — {habitat.dome?.name}</option>)}
          </select>
          {selectedBird && destinations.length === 0 && (
            <p className="text-[11px] text-amber-700 mt-1">
              Belum ada habitat tujuan lain. Tambahkan habitat baru sebelum mencatat perpindahan.
            </p>
          )}
        </div>
        <div><label className="label">Tanggal Perpindahan</label><input required type="datetime-local" className="input" value={movedAt} onChange={(e) => setMovedAt(e.target.value)} /></div>
        <div><label className="label">Alasan</label><input className="input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Opsional" /></div>
        <button className="btn btn-primary md:col-span-2 xl:col-span-5 justify-center" disabled={saving || !selectedBird || !toHabitatId}><ArrowRightLeft size={15} />{saving ? 'Menyimpan…' : 'Catat Perpindahan'}</button>
      </form>}

      <div className="card">
        {error ? <ErrorState message={error} /> : loading ? <TableSkeleton cols={6} /> : transfers.length === 0 ? (
          <EmptyState icon={ArrowRightLeft} title="Belum ada perpindahan" subtitle="Riwayat perpindahan burung akan muncul di sini." />
        ) : (
          <div className="overflow-x-auto"><table className="w-full border-collapse text-[13px]">
            <thead><tr><th className="th">Tanggal</th><th className="th">Burung</th><th className="th">Dari</th><th className="th">Ke</th><th className="th">Alasan</th><th className="th">Petugas</th><th className="th">Status</th>{canReview && <th className="th">Verifikasi</th>}</tr></thead>
            <tbody>{transfers.map((transfer) => <tr key={transfer.id}>
              <td className="td whitespace-nowrap">{formatDateTime(transfer.movedAt)}</td>
              <td className="td font-semibold">{transfer.bird?.name || transfer.bird?.ringNumber}</td>
              <td className="td">{transfer.fromHabitat?.name}</td><td className="td">{transfer.toHabitat?.name}</td>
              <td className="td">{transfer.reason || '—'}</td>
              <td className="td">{transfer.responsible?.fullName || transfer.responsible?.username}</td>
              <td className="td"><span className={`badge ${transfer.approvalStatus === 'approved' ? 'badge-success' : transfer.approvalStatus === 'rejected' ? 'badge-danger' : 'badge-warning'}`}>{transfer.approvalStatus}</span>{transfer.reviewNote && <div className="text-[11px] text-inksoft mt-1">{transfer.reviewNote}</div>}</td>
              {canReview && <td className="td min-w-[240px]">
                {transfer.approvalStatus === 'pending' && <div className="flex flex-col gap-2">
                  <input className="input !py-2" placeholder="Catatan (opsional)" value={reviewNotes[transfer.id] || ''} onChange={(event) => setReviewNotes({ ...reviewNotes, [transfer.id]: event.target.value })} />
                  <div className="flex gap-2"><button className="btn btn-primary !py-2" onClick={() => review(transfer, 'approve')}>Setujui</button><button className="btn btn-outline !py-2" onClick={() => review(transfer, 'reject')}>Tolak</button></div>
                </div>}
              </td>}
            </tr>)}            </tbody>
          </table></div>
        )}
      </div>
    </div>
  )
}
