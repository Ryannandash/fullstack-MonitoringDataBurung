import { useEffect, useMemo, useState } from 'react'
import { FileImage, Image, Video } from 'lucide-react'
import * as uploadApi from '../api/upload.api'
import * as birdApi from '../api/bird.api'
import Modal from '../components/ui/Modal'
import { EmptyState, ErrorState, TableSkeleton } from '../components/ui/Misc'
import { formatDateTime } from '../utils/format'
import { resolveMediaUrl } from '../utils/media'

const CATEGORIES = [
  ['feeding', 'Pemberian pakan'],
  ['training', 'Pelatihan'],
  ['cleaning', 'Kebersihan'],
  ['health', 'Kesehatan'],
  ['activity', 'Aktivitas lainnya'],
  ['bird', 'Data burung'],
  ['general', 'Lainnya']
]

export default function DocumentsPage() {
  const [documents, setDocuments] = useState([])
  const [userDocuments, setUserDocuments] = useState([])
  const [birds, setBirds] = useState([])
  const [filters, setFilters] = useState({ date: '', category: '', birdId: '', userId: '' })
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([, value]) => value))
      setDocuments(await uploadApi.getDocuments(params))
      setError(null)
    } catch (requestError) {
      setError(requestError?.response?.data?.message || requestError?.response?.data?.error || requestError.message)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [filters])
  useEffect(() => {
    Promise.all([birdApi.getBirds(), uploadApi.getDocuments()])
      .then(([birdList, documentList]) => {
        setBirds(birdList)
        setUserDocuments(documentList)
      })
      .catch((requestError) => setError(requestError?.response?.data?.message || 'Gagal memuat filter dokumentasi.'))
  }, [])

  const users = useMemo(() => {
    const unique = new Map()
    userDocuments.forEach((document) => {
      if (document.user) unique.set(document.userId, document.user)
    })
    return [...unique.entries()]
  }, [userDocuments])

  const preview = (document) => {
    const url = resolveMediaUrl(document.fileUrl)
    if (document.mimeType?.startsWith('image/')) {
      return <img src={url} alt={document.fileName} className="max-h-[68vh] max-w-full rounded-xl object-contain mx-auto" />
    }
    if (document.mimeType?.startsWith('video/')) {
      return <video src={url} controls className="max-h-[68vh] max-w-full rounded-xl mx-auto" />
    }
    return <a className="btn btn-primary" href={url} target="_blank" rel="noreferrer">Buka dokumen</a>
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[22px] font-bold font-display tracking-tight">Dokumentasi</h1>
        <p className="text-[13.5px] text-inksoft mt-0.5">Galeri terpusat dari bukti yang diunggah pada aktivitas. Tambahkan dokumentasi melalui formulir aktivitas asal.</p>
      </div>
      <div className="flex gap-3 mb-4 flex-wrap">
        <input aria-label="Filter tanggal" type="date" className="input !w-auto" value={filters.date} onChange={(event) => setFilters({ ...filters, date: event.target.value })} />
        <select aria-label="Filter kategori" className="input !w-auto" value={filters.category} onChange={(event) => setFilters({ ...filters, category: event.target.value })}>
          <option value="">Semua kategori</option>{CATEGORIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <select aria-label="Filter burung" className="input !w-auto" value={filters.birdId} onChange={(event) => setFilters({ ...filters, birdId: event.target.value })}>
          <option value="">Semua burung</option>{birds.map((bird) => <option key={bird.id} value={bird.id}>{bird.name || bird.ringNumber}</option>)}
        </select>
        <select aria-label="Filter pengguna" className="input !w-auto" value={filters.userId} onChange={(event) => setFilters({ ...filters, userId: event.target.value })}>
          <option value="">Semua pengguna</option>{users.map(([id, person]) => <option key={id} value={id}>{person.fullName || person.username}</option>)}
        </select>
      </div>
      <div className="card">
        {error ? <ErrorState message={error} /> : loading ? <TableSkeleton cols={4} /> : !documents.length ? (
          <EmptyState icon={FileImage} title="Belum ada dokumentasi" subtitle="Foto atau video dari aktivitas yang sudah dicatat akan tampil di galeri ini." />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 p-4">
            {documents.map((document) => {
              const isImage = document.mimeType?.startsWith('image/')
              const isVideo = document.mimeType?.startsWith('video/')
              const url = resolveMediaUrl(document.fileUrl)
              return <button key={document.id} type="button" onClick={() => setSelected(document)} className="text-left border border-border rounded-xl overflow-hidden hover:border-primary transition-colors">
                <div className="h-48 bg-bg flex items-center justify-center overflow-hidden">
                  {isImage ? <img src={url} alt={document.fileName} loading="lazy" className="w-full h-full object-cover" /> : isVideo ? <div className="flex flex-col items-center gap-2 text-primary"><Video size={36} /><span className="text-xs">Video</span></div> : <div className="flex flex-col items-center gap-2 text-inksoft"><Image size={36} /><span className="text-xs">Dokumen</span></div>}
                </div>
                <div className="p-3">
                  <div className="font-semibold text-sm truncate">{document.description || document.fileName}</div>
                  <div className="text-[11px] text-inksoft mt-1">{document.category} · {formatDateTime(document.createdAt)}</div>
                  <div className="text-[11px] text-inksoft mt-1">{document.bird?.name || document.bird?.ringNumber || 'Tanpa burung'} · {document.user?.fullName || document.user?.username || 'Pengguna'}</div>
                </div>
              </button>
            })}
          </div>
        )}
      </div>
      <Modal open={Boolean(selected)} onClose={() => setSelected(null)} title={selected?.description || selected?.fileName} wide>
        {selected && <div>
          <div className="mb-4">{preview(selected)}</div>
          <div className="text-sm space-y-1">
            <div><span className="font-semibold">Aktivitas asal:</span> {selected.description || CATEGORIES.find(([key]) => key === selected.category)?.[1] || selected.category}</div>
            <div><span className="font-semibold">Burung:</span> {selected.bird?.name || selected.bird?.ringNumber || '—'}</div>
            <div><span className="font-semibold">Pengguna:</span> {selected.user?.fullName || selected.user?.username || '—'}</div>
            <div><span className="font-semibold">Waktu unggah:</span> {formatDateTime(selected.createdAt)}</div>
            <div><span className="font-semibold">File:</span> {selected.fileName}</div>
          </div>
        </div>}
      </Modal>
    </div>
  )
}
