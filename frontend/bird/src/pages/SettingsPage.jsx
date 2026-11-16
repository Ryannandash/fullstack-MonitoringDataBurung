import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { formatDate, getRoleLabel, initials, normalizeRole } from '../utils/format'
import { User, Shield, Calendar, Briefcase, Mail, Lock, Bell, Monitor, Camera, Globe, Sun, Moon } from 'lucide-react'
import * as authApi from '../api/auth.api'
import Modal from '../components/ui/Modal'

const MAX_PROFILE_IMAGE_SIZE = 5 * 1024 * 1024
const MAX_PROFILE_IMAGE_DATA_URL_LENGTH = 800_000

const compressProfileImage = (source) => new Promise((resolve, reject) => {
  const image = new Image()
  const objectUrl = typeof source === 'string' ? null : URL.createObjectURL(source)
  const imageUrl = objectUrl || source
  const cleanup = () => {
    if (objectUrl) URL.revokeObjectURL(objectUrl)
  }

  image.onload = () => {
    try {
      const maxDimension = 512
      const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight))
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))

      const context = canvas.getContext('2d')
      if (!context) throw new Error('Foto profil tidak dapat diproses')
      context.fillStyle = '#fff'
      context.fillRect(0, 0, canvas.width, canvas.height)
      context.drawImage(image, 0, 0, canvas.width, canvas.height)

      for (const quality of [0.8, 0.65, 0.5]) {
        const dataUrl = canvas.toDataURL('image/jpeg', quality)
        if (dataUrl.length <= MAX_PROFILE_IMAGE_DATA_URL_LENGTH) {
          cleanup()
          resolve(dataUrl)
          return
        }
      }

      throw new Error('Foto profil terlalu besar setelah diproses. Pilih foto lain.')
    } catch (error) {
      cleanup()
      reject(error)
    }
  }

  image.onerror = () => {
    cleanup()
    reject(new Error('Foto profil tidak dapat dibaca'))
  }

  image.src = imageUrl
})

export default function SettingsPage() {
  const { user, refreshUser } = useAuth()
  const { showToast } = useToast()

  const [profileForm, setProfileForm] = useState({ fullName: '', username: '', profileUrl: '' })
  const [savingProfile, setSavingProfile] = useState(false)
  const fileInputRef = useRef(null)
  const coverInputRef = useRef(null)
  const [coverUrl, setCoverUrl] = useState(() => localStorage.getItem('jsn_cover') || '')

  const [passwordModal, setPasswordModal] = useState(false)
  const [passwordForm, setPasswordForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' })
  const [savingPassword, setSavingPassword] = useState(false)

  const [notifications, setNotifications] = useState(() => localStorage.getItem('jsn_notif') !== 'false')
  const [theme, setTheme] = useState(() => localStorage.getItem('jsn_theme') || 'light')

  useEffect(() => {
    if (user) setProfileForm({ fullName: user.fullName || '', username: user.username || '', profileUrl: user.profileUrl || '' })
  }, [user])

  const showPopup = (type, message) => showToast(type, message)

  const handleProfileSave = async (e) => {
    e.preventDefault()
    setSavingProfile(true)
    try {
      const payload = { ...profileForm }
      if (payload.profileUrl?.startsWith('data:image/') && payload.profileUrl.length > MAX_PROFILE_IMAGE_DATA_URL_LENGTH) {
        payload.profileUrl = await compressProfileImage(payload.profileUrl)
      }
      await authApi.updateProfile(payload)
      await refreshUser()
      showPopup('success', 'Profil berhasil diperbarui')
    } catch (e) {
      showPopup('error', e?.response?.data?.message || e?.response?.data?.error || e?.message || 'Gagal memperbarui profil')
    } finally {
      setSavingProfile(false)
    }
  }

  const handleFileChange = async (e) => {
    const input = e.currentTarget
    const file = input.files[0]
    if (!file) return
    if (file.size > MAX_PROFILE_IMAGE_SIZE) {
      showPopup('error', 'Ukuran foto maksimal 5MB')
      input.value = ''
      return
    }

    try {
      const profileUrl = await compressProfileImage(file)
      setProfileForm(f => ({ ...f, profileUrl }))
    } catch (error) {
      showPopup('error', error.message || 'Gagal memproses foto profil')
    } finally {
      input.value = ''
    }
  }

  const handleCoverChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) return showPopup('error', 'Ukuran cover maksimal 5MB')
    const reader = new FileReader()
    reader.onload = (ev) => {
      setCoverUrl(ev.target.result)
      localStorage.setItem('jsn_cover', ev.target.result)
    }
    reader.readAsDataURL(file)
  }

  const handlePasswordSave = async (e) => {
    e.preventDefault()
    if (passwordForm.newPassword !== passwordForm.confirmPassword)
      return showPopup('error', 'Konfirmasi password baru tidak cocok')
    setSavingPassword(true)
    try {
      await authApi.changePassword({ oldPassword: passwordForm.oldPassword, newPassword: passwordForm.newPassword })
      setPasswordModal(false)
      setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' })
      showPopup('success', 'Password berhasil diubah')
    } catch (e) {
      showPopup('error', e?.response?.data?.message || 'Gagal mengubah password')
    } finally {
      setSavingPassword(false)
    }
  }

  const toggleNotification = () => {
    const v = !notifications
    setNotifications(v)
    localStorage.setItem('jsn_notif', v)
    showPopup('success', `Notifikasi ${v ? 'diaktifkan' : 'dinonaktifkan'}`)
  }

  const changeTheme = (t) => {
    setTheme(t)
    localStorage.setItem('jsn_theme', t)
    document.documentElement.classList.toggle('dark', t === 'dark')
    showPopup('success', `Tema diubah ke ${t === 'light' ? 'Terang' : 'Gelap'}`)
  }

  const isChanged = profileForm.fullName !== user?.fullName || profileForm.username !== user?.username || profileForm.profileUrl !== user?.profileUrl

  return (
    <div className="max-w-5xl mx-auto animate-[fadeUp_.3s_ease_both]">

      {/* Page Header */}
      <div className="mb-7">
        <h1 className="text-[22px] font-bold font-display tracking-tight text-gray-900">Pengaturan Akun</h1>
        <p className="text-[13.5px] text-gray-400 mt-0.5">Kelola profil, preferensi, dan keamanan akun Anda.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* ── Left: Profile Card ── */}
        <div className="lg:col-span-4 flex flex-col">
          <div className="card shadow-sm overflow-hidden flex flex-col h-full">

            {/* Cover — bisa diganti foto, fallback gradient */}
            <div className="relative h-52 flex-shrink-0 group overflow-hidden">
              {coverUrl
                ? <img src={coverUrl} className="w-full h-full object-cover" alt="cover" />
                : <div className="w-full h-full bg-gradient-to-br from-orange-400 via-primary to-orange-600">
                  <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/carbon-fibre.png')" }} />
                </div>
              }
              {/* Hover overlay — ganti cover */}
              <button
                type="button"
                onClick={() => coverInputRef.current?.click()}
                className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center gap-2 text-white/0 group-hover:text-white text-[12.5px] font-semibold"
              >
                <Camera size={15} />Ganti Cover
              </button>
              <input type="file" accept="image/*" className="hidden" ref={coverInputRef} onChange={handleCoverChange} />
            </div>

            {/* Body */}
            <div className="px-5 flex flex-col flex-1">
              {/* Avatar + Badges row */}
              <div className="flex items-end justify-between -mt-8 mb-4">
                <div className="relative w-[68px] h-[68px]">
                  <div
                    className="w-full h-full rounded-2xl border-[3px] border-white shadow-xl bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center text-primary font-bold text-2xl overflow-hidden"
                    style={{ backgroundImage: profileForm.profileUrl ? `url(${profileForm.profileUrl})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center' }}
                  >
                    {!profileForm.profileUrl && initials(user?.fullName || user?.username || 'U')}
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary border-2 border-white shadow flex items-center justify-center text-white hover:bg-orange-600 active:scale-95 transition-all"
                    title="Ganti foto profil"
                  >
                    <Camera size={11} />
                  </button>
                  <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
                </div>
                {/* Badges */}
                <div className="flex items-center gap-1.5 flex-wrap justify-end pb-1">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-bold uppercase tracking-wide border ${normalizeRole(user?.role) === 'admin' ? 'bg-orange-50 text-orange-600 border-orange-200' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                    <Shield size={8.5} strokeWidth={2.5} />{getRoleLabel(user?.role)}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-bold border bg-emerald-50 text-emerald-600 border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />Aktif
                  </span>
                </div>
              </div>

              {/* Name */}
              <h2 className="text-[17px] font-bold text-gray-900 leading-snug">{user?.fullName || 'Pengguna'}</h2>
              <p className="text-[12.5px] text-gray-400 mt-0.5 mb-4">@{user?.username || 'username'}</p>

              {/* Deskripsi */}
              <div className="border-t border-gray-100 pt-4 space-y-4">
                <p className="text-[12.5px] text-gray-500 leading-relaxed">
                  Mengelola dan memantau data aktivitas burung secara real-time di lingkungan Jagat Satwa Nusantara, Taman Mini Indonesia Indah.
                </p>
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="text-gray-400">Bergabung sejak</span>
                    <span className="font-semibold text-gray-700">{user?.createdAt ? formatDate(user.createdAt) : '—'}</span>
                  </div>
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="text-gray-400">Status sistem</span>
                    <span className="font-semibold text-emerald-600">Berjalan normal</span>
                  </div>
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="text-gray-400">Lingkungan</span>
                    <span className="font-semibold text-blue-500">Production</span>
                  </div>
                </div>
              </div>

              {/* Spacer */}
              <div className="flex-1" />

              {/* Footer */}
              <div className="pb-5 pt-4 border-t border-gray-100">
                <p className="text-[11px] text-gray-300 leading-relaxed">
                  Bird Activity Monitoring System<br />© 2026 Jagat Satwa Nusantara, TMII
                </p>
              </div>
            </div>
          </div>
        </div>


        {/* ── Right Column ── */}
        <div className="lg:col-span-8 space-y-5">

          {/* Data Pribadi */}
          <form onSubmit={handleProfileSave} className="card shadow-sm">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
              <User size={16} className="text-primary" />
              <h3 className="text-[15px] font-bold text-gray-800 m-0">Data Pribadi</h3>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="label text-gray-500 flex items-center gap-1.5 mb-1.5 text-[12.5px]">
                  <User size={12} className="text-gray-400" /> Nama Lengkap
                </label>
                <input
                  required
                  className="input text-gray-700 font-medium text-[13.5px]"
                  value={profileForm.fullName}
                  onChange={e => setProfileForm(f => ({ ...f, fullName: e.target.value }))}
                />
              </div>
              <div>
                <label className="label text-gray-500 flex items-center gap-1.5 mb-1.5 text-[12.5px]">
                  <Mail size={12} className="text-gray-400" /> Username / Akses
                </label>
                <input
                  required
                  className="input text-gray-700 font-medium text-[13.5px]"
                  value={profileForm.username}
                  onChange={e => setProfileForm(f => ({ ...f, username: e.target.value }))}
                />
              </div>
              <div>
                <label className="label text-gray-500 flex items-center gap-1.5 mb-1.5 text-[12.5px]">
                  <Briefcase size={12} className="text-gray-400" /> Posisi / Role
                </label>
                <input className="input bg-gray-50 cursor-not-allowed text-gray-500 text-[13.5px]" value={getRoleLabel(user?.role)} disabled />
              </div>
              <div>
                <label className="label text-gray-500 flex items-center gap-1.5 mb-1.5 text-[12.5px]">
                  <Calendar size={12} className="text-gray-400" /> Bergabung Sejak
                </label>
                <input className="input bg-gray-50 cursor-not-allowed text-gray-500 text-[13.5px]" value={user?.createdAt ? formatDate(user.createdAt) : '—'} disabled />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
              <button
                type="submit"
                disabled={!isChanged || savingProfile}
                className={`btn btn-primary text-[13px] ${!isChanged ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {savingProfile ? 'Menyimpan…' : 'Simpan Perubahan'}
              </button>
            </div>
          </form>

          {/* Keamanan & Preferensi */}
          <div className="card shadow-sm">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
              <Lock size={16} className="text-primary" />
              <h3 className="text-[15px] font-bold text-gray-800 m-0">Keamanan & Preferensi</h3>
            </div>
            <div className="divide-y divide-gray-100">

              {/* Password */}
              <div className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-primary shrink-0">
                    <Lock size={15} strokeWidth={2.2} />
                  </div>
                  <div>
                    <p className="text-[13.5px] font-semibold text-gray-800">Password Akun</p>
                    <p className="text-[12px] text-gray-400 mt-0.5">Ganti password secara berkala demi keamanan</p>
                  </div>
                </div>
                <button
                  onClick={() => setPasswordModal(true)}
                  className="btn btn-outline text-[12.5px] !py-1.5 hover:bg-orange-50 hover:text-primary hover:border-orange-200"
                >
                  Ubah
                </button>
              </div>

              {/* Notifikasi */}
              <div className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-500 shrink-0">
                    <Bell size={15} strokeWidth={2.2} />
                  </div>
                  <div>
                    <p className="text-[13.5px] font-semibold text-gray-800">Notifikasi Sistem</p>
                    <p className="text-[12px] text-gray-400 mt-0.5">Pemberitahuan log aktivitas & stok pakan</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={notifications} onChange={toggleNotification} />
                  <div className="w-10 h-[22px] bg-gray-200 rounded-full peer peer-checked:bg-primary after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-[18px] after:w-[18px] after:transition-all peer-checked:after:translate-x-[18px] shadow-inner" />
                </label>
              </div>

              {/* Tema */}
              <div className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-500 shrink-0">
                    <Monitor size={15} strokeWidth={2.2} />
                  </div>
                  <div>
                    <p className="text-[13.5px] font-semibold text-gray-800">Tema Tampilan</p>
                    <p className="text-[12px] text-gray-400 mt-0.5">Sesuaikan preferensi mode warna</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 bg-gray-100 border border-gray-200 rounded-lg p-0.5">
                  <button
                    onClick={() => changeTheme('light')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-semibold transition-all ${theme === 'light' ? 'bg-white shadow text-gray-800' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    <Sun size={12} />Terang
                  </button>
                  <button
                    onClick={() => changeTheme('dark')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-semibold transition-all ${theme === 'dark' ? 'bg-white shadow text-gray-800' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    <Moon size={12} />Gelap
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* Modal Ubah Password */}
      <Modal
        open={passwordModal}
        onClose={() => setPasswordModal(false)}
        title="Ubah Password"
        footer={<>
          <button type="button" className="btn btn-outline" onClick={() => setPasswordModal(false)}>Batal</button>
          <button type="submit" form="pwd-form" className="btn btn-primary" disabled={savingPassword}>
            {savingPassword ? 'Menyimpan…' : 'Simpan'}
          </button>
        </>}
      >
        <form id="pwd-form" onSubmit={handlePasswordSave} className="space-y-4">
          <div><label className="label">Password Lama</label><input required type="password" className="input" value={passwordForm.oldPassword} onChange={e => setPasswordForm(f => ({ ...f, oldPassword: e.target.value }))} /></div>
          <div><label className="label">Password Baru</label><input required type="password" className="input" value={passwordForm.newPassword} onChange={e => setPasswordForm(f => ({ ...f, newPassword: e.target.value }))} /></div>
          <div><label className="label">Konfirmasi Password Baru</label><input required type="password" className="input" value={passwordForm.confirmPassword} onChange={e => setPasswordForm(f => ({ ...f, confirmPassword: e.target.value }))} /></div>
        </form>
      </Modal>
    </div>
  )
}

// Helper component
function InfoRow({ icon, label, value }) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-1.5 text-[12px] text-gray-400">{icon}{label}</span>
      <span className="text-[12.5px] font-semibold text-gray-700">{value}</span>
    </div>
  )
}
