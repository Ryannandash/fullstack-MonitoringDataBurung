import { useState } from 'react'
import { useNavigate, useLocation, Navigate } from 'react-router-dom'
import { Bird, Lock, User, ArrowRight, AlertCircle, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const { signIn, token } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [username, setUsername] = useState(location.state?.registeredUsername || localStorage.getItem('rememberUsername') || '')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(!!localStorage.getItem('rememberUsername'))
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (token) return <Navigate to="/" replace />

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signIn(username, password)
      if (rememberMe) {
        localStorage.setItem('rememberUsername', username)
      } else {
        localStorage.removeItem('rememberUsername')
      }
      navigate(location.state?.from || '/', { replace: true })
    } catch (err) {
      setError(err?.response?.data?.message || 'Username atau password salah.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4"
      style={{ backgroundImage: 'radial-gradient(1200px 500px at 100% -10%, rgba(251,146,60,0.14), transparent 60%)' }}>
      <div className="w-full max-w-[400px]">
        <div className="flex flex-col items-center mb-7">
          <img src="/images.jpg" alt="Jagat Satwa Logo" className="w-14 h-14 rounded-2xl object-cover shadow-[0_8px_20px_-4px_rgba(249,115,22,0.5)] mb-4 bg-white" />
          <h1 className="font-display font-bold text-[20px] text-ink">Jagat Satwa</h1>
          <p className="text-[13px] text-inksoft mt-0.5">Bird Activity Monitoring System · TMII</p>
        </div>

        <form onSubmit={handleSubmit} className="card p-7">
          <h2 className="font-display font-semibold text-[16px] mb-5">Masuk ke akun kamu</h2>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 text-red-600 text-[12.5px] font-medium px-3.5 py-2.5 rounded-xl2 mb-4">
              <AlertCircle size={15} className="flex-shrink-0" />{error}
            </div>
          )}

          <div className="mb-4">
            <label className="label">Username</label>
            <div className="relative">
              <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input className="input pl-10" value={username} onChange={e => setUsername(e.target.value)} placeholder="keeper.raka" required autoFocus />
            </div>
          </div>

          <div className="mb-6">
            <label className="label">Password</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type={showPassword ? "text" : "password"} className="input pl-10 pr-10" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none">
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="flex items-center mb-6">
            <label className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500 cursor-pointer"
              />
              <span className="text-[13px] text-inksoft group-hover:text-ink transition-colors duration-200">Ingat username saya</span>
            </label>
          </div>

          <button type="submit" disabled={loading} className="btn btn-primary w-full justify-center disabled:opacity-60 shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30 hover:-translate-y-0.5 transition-all duration-200">
            {loading ? 'Memproses…' : <>Masuk<ArrowRight size={16} /></>}
          </button>
        </form>

        <p className="text-center text-[13px] text-inksoft mt-6">
          Akun pengguna dibuat oleh Admin melalui menu Settings.
        </p>
      </div>
    </div>
  )
}
