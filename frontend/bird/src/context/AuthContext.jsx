import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import * as authApi from '../api/auth.api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('jsn_token'))
  const [role, setRole] = useState(() => localStorage.getItem('jsn_role'))
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadMe = useCallback(async () => {
    if (!localStorage.getItem('jsn_token')) { setLoading(false); return }
    try {
      const me = await authApi.getMe()
      setUser(me)
    } catch (e) {
      // token invalid/expired — interceptor already redirects on 401
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadMe() }, [loadMe])

  const signIn = async (username, password) => {
    const { token, role } = await authApi.login(username, password)
    localStorage.setItem('jsn_token', token)
    localStorage.setItem('jsn_role', role)
    setToken(token)
    setRole(role)
    const me = await authApi.getMe()
    setUser(me)
    return me
  }

  const signOut = () => {
    localStorage.removeItem('jsn_token')
    localStorage.removeItem('jsn_role')
    setToken(null)
    setRole(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ token, role, user, loading, signIn, signOut, refreshUser: loadMe }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
