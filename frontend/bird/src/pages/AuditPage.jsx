import { useEffect, useState } from 'react'
import { History } from 'lucide-react'
import * as auditApi from '../api/audit.api'
import { EmptyState, ErrorState, TableSkeleton } from '../components/ui/Misc'
import { formatDateTime } from '../utils/format'

const actionLabels = { CREATE: 'Tambah', UPDATE: 'Ubah', DELETE: 'Hapus' }

export default function AuditPage() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    auditApi.getAuditLogs()
      .then(setLogs)
      .catch((requestError) => setError(requestError?.response?.data?.error || requestError.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <div className="mb-6"><h1 className="text-[22px] font-bold font-display tracking-tight">Audit Trail</h1><p className="text-[13.5px] text-inksoft mt-0.5">Riwayat hingga 200 perubahan data terakhir dan pengguna yang melakukannya.</p></div>
      <div className="card">
        {error ? <ErrorState message={error} /> : loading ? <TableSkeleton cols={5} /> : logs.length === 0 ? (
          <EmptyState icon={History} title="Belum ada riwayat perubahan" subtitle="Aktivitas tambah, ubah, dan hapus yang berhasil akan dicatat di sini." />
        ) : (
          <div className="overflow-x-auto"><table className="w-full border-collapse text-[13px]">
            <thead><tr><th className="th">Waktu</th><th className="th">Pengguna</th><th className="th">Aksi</th><th className="th">Data</th><th className="th">Endpoint</th></tr></thead>
            <tbody>{logs.map((log) => <tr key={log.id}>
              <td className="td whitespace-nowrap">{formatDateTime(log.createdAt)}</td>
              <td className="td">{log.user?.fullName || log.user?.username || '—'}</td>
              <td className="td"><span className="badge badge-orange">{actionLabels[log.action] || log.action}</span></td>
              <td className="td">{log.entity}{log.entityId ? ` #${log.entityId}` : ''}</td>
              <td className="td font-mono text-[11px]">{log.path}</td>
            </tr>)}</tbody>
          </table></div>
        )}
      </div>
    </div>
  )
}
