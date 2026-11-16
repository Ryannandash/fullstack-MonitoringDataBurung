import { useMemo } from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Feather, Dna, HeartHandshake, Utensils,
  Globe2, MapPinned, BarChart3, Settings, LogOut, PanelLeftClose, Stethoscope,
  ArrowRightLeft, Bell, FileImage, History, Users, Dumbbell, Brush,
  ClipboardCheck, ListChecks, Pill
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { getRoleLabel, initials, normalizeRole } from '../../utils/format'

const NAV = [
  { section: 'Ringkasan', items: [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true }
  ]},
  { section: 'Data Burung', items: [
    { to: '/birds', label: 'Bird Management', icon: Feather },
    { to: '/species', label: 'Species', icon: Dna }
  ]},
  { section: 'Lokasi', items: [
    { to: '/domes', label: 'Dome', icon: Globe2 },
    { to: '/habitats', label: 'Habitat', icon: MapPinned }
  ]},
  { section: 'Reproduksi', items: [
    { to: '/breeding', label: 'Breeding Record', icon: HeartHandshake }
  ]},
  { section: 'Perawatan Harian', items: [
    { to: '/feeding', label: 'Feeding Schedule', icon: Utensils, end: true },
    { to: '/training', label: 'Pelatihan Burung', icon: Dumbbell },
    { to: '/cleaning', label: 'Kebersihan Kandang', icon: Brush },
    { to: '/health', label: 'Monitoring Kesehatan', icon: Stethoscope },
    { to: '/medications', label: 'Pemberian Obat', icon: Pill },
    { to: '/medication-reports', label: 'Laporan Pemberian Obat', icon: ClipboardCheck },
    { to: '/transfers', label: 'Perpindahan', icon: ArrowRightLeft },
    { to: '/reminders', label: 'Pengingat', icon: Bell },
    { to: '/tasks', label: 'Penugasan', icon: ListChecks },
    { to: '/documents', label: 'Dokumentasi', icon: FileImage }
  ]},
  { section: 'Pelaporan', items: [
    { to: '/daily-reports', label: 'Laporan Harian', icon: ClipboardCheck },
    { to: '/reports', label: 'Reports', icon: BarChart3 }
  ]},
  { section: 'Sistem', items: [
    { to: '/audit', label: 'Audit Trail', icon: History },
    { to: '/users', label: 'Manajemen Pengguna', icon: Users },
    { to: '/settings', label: 'Settings', icon: Settings }
  ]}
]

const ACCESS_BY_ROLE = {
  super_admin: new Set([
    '/', '/birds', '/species', '/domes', '/habitats', '/breeding', '/feeding',
    '/training', '/cleaning', '/health',
    '/transfers', '/medication-reports', '/documents', '/reminders',
    '/tasks', '/daily-reports', '/reports', '/audit', '/users', '/settings'
  ]),
  head_keeper: new Set([
    '/', '/birds', '/species', '/domes', '/habitats', '/breeding', '/feeding',
    '/training', '/cleaning', '/health',
    '/transfers', '/medication-reports', '/documents', '/reminders',
    '/tasks', '/daily-reports', '/reports', '/settings'
  ]),
  keeper: new Set([
    '/', '/birds', '/species', '/domes', '/habitats', '/breeding', '/feeding',
    '/training', '/cleaning', '/health', '/medication-reports', '/transfers',
    '/documents', '/reminders', '/tasks', '/daily-reports',
    '/reports', '/settings'
  ]),
  dokter_hewan: new Set([
    '/', '/birds', '/species', '/breeding', '/health', '/medications', '/reminders',
    '/reports', '/settings'
  ])
}

export default function Sidebar({ collapsed, onToggle, mobileOpen }) {
  const { user, signOut } = useAuth()
  const role = normalizeRole(user?.role)

  const visibleNav = useMemo(() => (
    NAV.map((group) => ({
      ...group,
      items: group.items.filter((item) => ACCESS_BY_ROLE[role]?.has(item.to))
    })).filter((group) => group.items.length > 0)
  ), [role])

  return (
    <aside className={`
      ${collapsed ? 'w-[72px]' : 'w-[216px]'}
      ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      fixed lg:sticky top-0 h-screen flex-shrink-0 bg-gradient-to-b from-white to-[#FFFBF5]
      border-r border-border flex flex-col transition-all duration-300 z-40
    `}>
      <div className="flex items-center gap-3 px-4 py-[10px] border-b border-border min-h-[58px]">
        <img src="/images.jpg" alt="Jagat Satwa Logo" className="w-[38px] h-[38px] rounded-[11px] flex-shrink-0 object-cover shadow-[0_6px_16px_-4px_rgba(249,115,22,0.45)] bg-white" />
        {!collapsed && (
          <div className="overflow-hidden whitespace-nowrap">
            <div className="font-bold text-[14.5px] leading-tight font-display">Jagat Satwa</div>
            <div className="text-[11.5px] text-inksoft tracking-wide">Bird Dome · TMII</div>
          </div>
        )}
        <button onClick={onToggle} className={`${collapsed ? '' : 'ml-auto'} w-7 h-7 rounded-lg border border-border bg-white flex items-center justify-center text-inksoft hover:bg-bg hover:text-primary transition-colors flex-shrink-0 hidden lg:flex`}>
          <PanelLeftClose size={15} />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-3.5 flex flex-col gap-0.5">
        {visibleNav.map((group) => (
          <div key={group.section}>
            {!collapsed && (
              <div className="text-[11px] font-bold text-[#C2846B] uppercase tracking-wide px-3 pt-3.5 pb-1.5 whitespace-nowrap">
                {group.section}
              </div>
            )}
            {group.items.map((item) => (
              <NavLink
                key={`${item.to}-${item.label}`}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `
                  relative flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-[14px] font-medium
                  transition-colors whitespace-nowrap mb-0.5
                  ${collapsed ? 'justify-center' : ''}
                  ${isActive
                    ? 'bg-gradient-to-r from-orange-100 to-orange-50 text-primary-600 font-semibold before:content-[""] before:absolute before:-left-3 before:top-2 before:bottom-2 before:w-1 before:rounded-r-[4px] before:bg-primary'
                    : 'text-gray-600 hover:bg-orange-50 hover:text-primary-600'}
                `}
              >
                <item.icon size={18} className="flex-shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="border-t border-border p-3 flex flex-col gap-0.5">
        <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl2 hover:bg-bg transition-colors cursor-pointer">
          <div 
            className="w-9 h-9 rounded-full flex-shrink-0 bg-gradient-to-br from-orange-300 to-primary flex items-center justify-center text-white font-bold text-[13px] border-2 border-white shadow-[0_0_0_1px_#E5E7EB] bg-cover bg-center overflow-hidden"
            style={{ backgroundImage: user?.profileUrl ? `url(${user.profileUrl})` : 'none' }}
          >
            {!user?.profileUrl && initials(user?.fullName || user?.username)}
          </div>
          {!collapsed && (
            <div className="overflow-hidden whitespace-nowrap">
              <div className="text-[13.5px] font-semibold text-ink">{user?.fullName || user?.username || 'Pengguna'}</div>
              <div className="text-[11.5px] text-inksoft capitalize">{getRoleLabel(user?.role)}</div>
            </div>
          )}
        </div>
        <button
          onClick={signOut}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-[14px] font-medium text-red-500 hover:bg-red-50 transition-colors ${collapsed ? 'justify-center' : ''}`}
        >
          <LogOut size={18} />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  )
}
