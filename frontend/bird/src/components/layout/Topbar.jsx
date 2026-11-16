import { useState, useRef, useEffect } from 'react'
import { Search, Menu, CalendarDays, ChevronDown, LogOut, CheckCircle2, AlertCircle } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { getRoleLabel } from '../../utils/format'
import { useNavigate } from 'react-router-dom'

export default function Topbar({ onMobileMenu }) {
  const { user, signOut } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [today] = useState(() => new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }))
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)
  const searchRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleLogout = () => {
    signOut()
    navigate('/login')
  }

  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-border flex items-center gap-4 px-5 lg:px-6 py-2 min-h-[58px]">
      <button onClick={onMobileMenu} className="lg:hidden w-10 h-10 rounded-xl2 border border-border bg-white flex items-center justify-center text-gray-600">
        <Menu size={18} />
      </button>

      {/* Search bar + popup anchor */}
      <div className="relative flex-1 max-w-[420px] hidden md:block" ref={searchRef}>
        <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          className="input pl-10"
          placeholder="Cari burung, spesies, dome…"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.target.value.trim()) {
              navigate(`/birds?search=${encodeURIComponent(e.target.value.trim())}`)
            }
          }}
        />

        {/* Toast popup — muncul tepat di bawah search bar */}
        {toast && (
          <div className="absolute top-[calc(100%+8px)] left-0 z-[200] animate-[fadeUp_.2s_ease_both] w-max max-w-[340px]">
            <div className={`flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border ${toast.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
              {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
              <span className="font-semibold text-[13.5px]">{toast.message}</span>
            </div>
          </div>
        )}
      </div>

      <div className="ml-auto flex items-center gap-2.5">
        <div className="hidden md:flex items-center gap-2 px-3.5 py-2.5 rounded-xl2 border border-border bg-white text-[13px] text-inksoft font-medium whitespace-nowrap">
          <CalendarDays size={15} className="text-primary" />
          <span>{today}</span>
        </div>
        
        <div className="relative" ref={dropdownRef}>
          <div 
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="w-10 h-10 flex items-center justify-center rounded-2xl border border-border bg-white cursor-pointer hover:border-primary transition-colors select-none"
          >
            <ChevronDown size={14} className="text-gray-400" />
          </div>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-border py-2 animate-[fadeUp_.2s_ease_both] origin-top-right">
              <div className="px-4 py-2 border-b border-border mb-2">
                <p className="text-[13.5px] font-bold text-ink truncate">{user?.fullName || user?.username || 'User'}</p>
                <p className="text-[12px] text-inksoft truncate">{getRoleLabel(user?.role)}</p>
              </div>
              <button 
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 text-[13px] text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
              >
                <LogOut size={14} />
                <span>Keluar Akun</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
