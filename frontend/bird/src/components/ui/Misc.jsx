import { TrendingUp, TrendingDown, Inbox, AlertTriangle } from 'lucide-react'

export function StatCard({ icon: Icon, label, value, trend, up, iconBg, iconFg }) {
  return (
    <div className="card card-hover p-5">
      <div className="flex items-center justify-between mb-3.5">
        <div className="w-10 h-10 rounded-xl2 flex items-center justify-center" style={{ background: iconBg, color: iconFg }}>
          <Icon size={19} />
        </div>
        {trend && (
          <span className={`text-[11.5px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${up ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {up ? <TrendingUp size={11} /> : <TrendingDown size={11} />}{trend}
          </span>
        )}
      </div>
      <div className="text-[26px] font-extrabold font-display tracking-tight text-ink">{value}</div>
      <div className="text-[12.5px] text-inksoft font-medium mt-0.5">{label}</div>
    </div>
  )
}

export function EmptyState({ title, subtitle, icon: Icon = Inbox }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-orange-100 text-primary flex items-center justify-center mb-4">
        <Icon size={28} />
      </div>
      <h4 className="m-0 mb-1 text-[15px] font-semibold">{title}</h4>
      <p className="m-0 text-[12.5px] text-inksoft max-w-[280px]">{subtitle}</p>
    </div>
  )
}

export function ErrorState({ message }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-red-100 text-red-500 flex items-center justify-center mb-4">
        <AlertTriangle size={28} />
      </div>
      <h4 className="m-0 mb-1 text-[15px] font-semibold">Gagal memuat data</h4>
      <p className="m-0 text-[12.5px] text-inksoft max-w-[360px]">{message || 'Periksa apakah backend API sedang berjalan dan VITE_API_URL sudah benar.'}</p>
    </div>
  )
}

export function TableSkeleton({ rows = 5, cols = 5 }) {
  return (
    <div className="p-5 space-y-3">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4">
          {Array.from({ length: cols }).map((_, c) => (
            <div key={c} className="skeleton h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  )
}

export function KpiSkeleton({ count = 4 }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card p-5">
          <div className="skeleton w-10 h-10 rounded-xl2 mb-4" />
          <div className="skeleton h-6 w-16 mb-2" />
          <div className="skeleton h-3 w-24" />
        </div>
      ))}
    </div>
  )
}
