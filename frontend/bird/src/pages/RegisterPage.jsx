import { useState } from 'react'
import { useNavigate, Navigate, Link } from 'react-router-dom'
import { Bird, Lock, User, ArrowRight, AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { register } from '../api/auth.api'

export default function RegisterPage() {
  const { token } = useAuth()
  const navigate = useNavigate()
  
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  if (token) return <Navigate to="/" replace />

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)
    try {
      await register({ fullName, username, password })
      setSuccess('Akun berhasil dibuat! Mengalihkan ke login...')
      setTimeout(() => {
        navigate('/login', { state: { registeredUsername: username } })
      }, 2000)
    } catch (err) {
      setError(err?.response?.data?.error || 'Gagal membuat akun. Username mungkin sudah dipakai.')
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
          <p className="text-[13px] text-inksoft mt-0.5">Pendaftaran Akun Baru</p>
        </div>

        <form onSubmit={handleSubmit} className="card p-8 shadow-xl shadow-orange-900/5">
          <h2 className="font-display font-semibold text-[16px] mb-5">Buat akun kamu</h2>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 text-red-600 text-[12.5px] font-medium px-3.5 py-2.5 rounded-xl2 mb-4">
              <AlertCircle size={15} className="flex-shrink-0" />{error}
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 bg-green-50 text-green-600 text-[12.5px] font-medium px-3.5 py-2.5 rounded-xl2 mb-4">
              <CheckCircle size={15} className="flex-shrink-0" />{success}
            </div>
          )}

          <div className="mb-4">
            <label className="label">Nama Lengkap</label>
            <div className="relative">
              <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input className="input pl-10" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Nama Lengkap" required autoFocus />
            </div>
          </div>

          <div className="mb-4">
            <label className="label">Username</label>
            <div className="relative">
              <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input className="input pl-10" value={username} onChange={e => setUsername(e.target.value)} placeholder="username_kamu" required />
            </div>
          </div>
          
          <div className="mb-6">
            <label className="label">Password</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type={showPassword ? "text" : "password"} className="input pl-10 pr-10" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none">
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn btn-primary w-full justify-center disabled:opacity-60 shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30 hover:-translate-y-0.5 transition-all duration-200">
            {loading ? 'Memproses…' : <>Daftar<ArrowRight size={16} /></>}
          </button>
        </form>

        <p className="text-center text-[13px] text-inksoft mt-6">
          Sudah punya akun? <Link to="/login" className="text-primary font-medium hover:underline">Masuk</Link>
        </p>
      </div>
    </div>
  )
}
