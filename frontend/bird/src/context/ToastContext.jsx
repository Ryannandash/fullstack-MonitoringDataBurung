import { createContext, useContext, useState, useCallback } from 'react'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null) // { type: 'success'|'error', message: '' }
  let timer = null

  const showToast = useCallback((type, message) => {
    setToast({ type, message })
    clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    timer = setTimeout(() => setToast(null), 3000)
  }, [])

  const clearToast = useCallback(() => setToast(null), [])

  return (
    <ToastContext.Provider value={{ toast, showToast, clearToast }}>
      {children}
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
