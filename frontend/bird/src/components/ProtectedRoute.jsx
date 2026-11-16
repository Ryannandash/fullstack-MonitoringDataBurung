import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children }) {
  const { token, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="w-8 h-8 border-[3px] border-orange-200 border-t-primary rounded-full animate-spin" />
      </div>
    )
  }
  if (!token) return <Navigate to="/login" replace />
  return children
}
