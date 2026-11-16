import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex min-h-screen">
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/30 z-30 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(v => !v)} mobileOpen={mobileOpen} />
      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar onMobileMenu={() => setMobileOpen(v => !v)} />
        <main className="px-5 lg:px-7 py-4 pb-16 max-w-[1500px] w-full mx-auto">
          <div className="page-enter" key={location.pathname}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
