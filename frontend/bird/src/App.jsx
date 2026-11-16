import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import AppLayout from './components/layout/AppLayout'
import ProtectedRoute from './components/ProtectedRoute'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import BirdsPage from './pages/BirdsPage'
import BirdDetailPage from './pages/BirdDetailPage'
import SpeciesPage from './pages/SpeciesPage'
import DomesPage from './pages/DomesPage'
import HabitatsPage from './pages/HabitatsPage'
import BreedingPage from './pages/BreedingPage'
import FeedingPage from './pages/FeedingPage'
import CareRecordsPage from './pages/CareRecordsPage'
import ReportsPage from './pages/ReportsPage'
import SettingsPage from './pages/SettingsPage'
import HealthPage from './pages/HealthPage'
import MedicationPage from './pages/MedicationPage'
import TransferPage from './pages/TransferPage'
import RemindersPage from './pages/RemindersPage'
import AuditPage from './pages/AuditPage'
import DocumentsPage from './pages/DocumentsPage'
import DailyReportsPage from './pages/DailyReportsPage'
import TasksPage from './pages/TasksPage'
import UserManagementPage from './pages/UserManagementPage'
import { normalizeRole } from './utils/format'
import { useAuth } from './context/AuthContext'

function RoleRoute({ allowedRoles, children }) {
  const { token, user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="w-8 h-8 border-[3px] border-orange-200 border-t-primary rounded-full animate-spin" />
      </div>
    )
  }

  if (!token) return <Navigate to="/login" replace />

  const role = normalizeRole(user?.role || localStorage.getItem('jsn_role'))
  if (!allowedRoles.includes(role)) return <Navigate to="/" replace />

  return children
}

export default function App() {
  useEffect(() => {
    if (localStorage.getItem('jsn_theme') === 'dark') {
      document.documentElement.classList.add('dark')
    }
  }, [])

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<Navigate to="/login" replace />} />
      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/birds" element={<RoleRoute allowedRoles={['super_admin', 'head_keeper', 'keeper', 'dokter_hewan']}><BirdsPage /></RoleRoute>} />
        <Route path="/birds/:id" element={<RoleRoute allowedRoles={['super_admin', 'head_keeper', 'keeper', 'dokter_hewan']}><BirdDetailPage /></RoleRoute>} />
        <Route path="/species" element={<RoleRoute allowedRoles={['super_admin', 'head_keeper', 'keeper', 'dokter_hewan']}><SpeciesPage /></RoleRoute>} />
        <Route path="/domes" element={<RoleRoute allowedRoles={['super_admin', 'head_keeper', 'keeper']}><DomesPage /></RoleRoute>} />
        <Route path="/habitats" element={<RoleRoute allowedRoles={['super_admin', 'head_keeper', 'keeper']}><HabitatsPage /></RoleRoute>} />
        <Route path="/breeding" element={<RoleRoute allowedRoles={['super_admin', 'head_keeper', 'keeper', 'dokter_hewan']}><BreedingPage /></RoleRoute>} />
        <Route path="/feeding" element={<RoleRoute allowedRoles={['super_admin', 'head_keeper', 'keeper']}><FeedingPage /></RoleRoute>} />
        <Route path="/training" element={<RoleRoute allowedRoles={['super_admin', 'head_keeper', 'keeper']}><CareRecordsPage kind="training" /></RoleRoute>} />
        <Route path="/cleaning" element={<RoleRoute allowedRoles={['super_admin', 'head_keeper', 'keeper']}><CareRecordsPage kind="cleaning" /></RoleRoute>} />
        <Route path="/health" element={<RoleRoute allowedRoles={['super_admin', 'head_keeper', 'keeper', 'dokter_hewan']}><HealthPage /></RoleRoute>} />
        <Route path="/medications" element={<RoleRoute allowedRoles={['dokter_hewan']}><MedicationPage /></RoleRoute>} />
        <Route path="/medication-reports" element={<RoleRoute allowedRoles={['super_admin', 'head_keeper', 'keeper']}><MedicationPage reportOnly /></RoleRoute>} />
        <Route path="/transfers" element={<RoleRoute allowedRoles={['super_admin', 'head_keeper', 'keeper']}><TransferPage /></RoleRoute>} />
        <Route path="/reminders" element={<RoleRoute allowedRoles={['super_admin', 'head_keeper', 'keeper', 'dokter_hewan']}><RemindersPage /></RoleRoute>} />
        <Route path="/tasks" element={<RoleRoute allowedRoles={['super_admin', 'head_keeper', 'keeper']}><TasksPage /></RoleRoute>} />
        <Route path="/daily-reports" element={<RoleRoute allowedRoles={['super_admin', 'head_keeper', 'keeper', 'dokter_hewan']}><DailyReportsPage /></RoleRoute>} />
        <Route path="/inventory" element={<Navigate to="/" replace />} />
        <Route path="/documents" element={<RoleRoute allowedRoles={['super_admin', 'head_keeper', 'keeper', 'dokter_hewan']}><DocumentsPage /></RoleRoute>} />
        <Route path="/reports" element={<RoleRoute allowedRoles={['super_admin', 'head_keeper', 'keeper', 'dokter_hewan']}><ReportsPage /></RoleRoute>} />
        <Route path="/audit" element={<RoleRoute allowedRoles={['super_admin']}><AuditPage /></RoleRoute>} />
        <Route path="/users" element={<RoleRoute allowedRoles={['super_admin']}><UserManagementPage /></RoleRoute>} />
        <Route path="/settings" element={<RoleRoute allowedRoles={['super_admin', 'head_keeper', 'keeper', 'dokter_hewan']}><SettingsPage /></RoleRoute>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

