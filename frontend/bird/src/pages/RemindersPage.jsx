import { useEffect, useState } from 'react'
import { Bell, CalendarClock } from 'lucide-react'
import * as reminderApi from '../api/reminder.api'
import { EmptyState, ErrorState, TableSkeleton } from '../components/ui/Misc'
import { formatDateTime, formatReminderBirds } from '../utils/format'
import { useAuth } from '../context/AuthContext'

const typeLabels = { feeding: 'Pakan', health: 'Kesehatan', hatching: 'Penetasan' }

export default function RemindersPage() {
  const { role } = useAuth()
  const isVeterinarian = role === 'dokter_hewan'
  const [reminders, setReminders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    reminderApi.getReminders(30)
      .then(setReminders)
      .catch((requestError) => setError(requestError?.response?.data?.error || requestError.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <div className="mb-6"><h1 className="text-[22px] font-bold font-display tracking-tight">Pengingat</h1><p className="text-[13.5px] text-inksoft mt-0.5">{isVeterinarian ? 'Kontrol kesehatan dan perkiraan penetasan dalam 30 hari.' : 'Jadwal pakan harian, kontrol kesehatan, dan perkiraan penetasan dalam 30 hari.'}</p></div>
      <div className="card">
        {error ? <ErrorState message={error} /> : loading ? <TableSkeleton cols={4} /> : reminders.length === 0 ? (
          <EmptyState icon={Bell} title="Belum ada pengingat" subtitle={isVeterinarian ? 'Pengingat kesehatan dan penetasan akan muncul di sini.' : 'Pengingat akan muncul saat ada jadwal pakan atau tanggal kontrol/penetasan.'} />
        ) : (
          <div className="divide-y divide-border">{reminders.map((item) => (
            <div key={item.id} className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-orange-100 text-primary-700 flex items-center justify-center"><CalendarClock size={18} /></div>
              <div className="flex-1 min-w-0"><div className="font-semibold text-[13.5px]">{item.title}</div><div className="text-[12px] text-inksoft">{formatReminderBirds(item)}</div></div>
              <span className="badge badge-orange">{typeLabels[item.type] || item.type}</span>
              <span className="text-[12px] text-inksoft whitespace-nowrap">{item.type === 'feeding' ? item.dueAt : formatDateTime(item.dueAt)}</span>
            </div>
          ))}</div>
        )}
      </div>
    </div>
  )
}
