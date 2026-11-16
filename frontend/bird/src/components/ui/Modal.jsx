import { X } from 'lucide-react'
import { createPortal } from 'react-dom'

export default function Modal({ open, onClose, title, children, footer, wide }) {
  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] transition-all flex items-center justify-center p-4 sm:p-6">
      <div 
        className="absolute inset-0"
        onClick={onClose}
      />
      <div className={`relative bg-white/90 backdrop-blur-xl rounded-[24px] w-full ${wide ? 'max-w-2xl' : 'max-w-[520px]'} max-h-[90vh] flex flex-col shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] ring-1 ring-black/5 animate-[fadeUp_.2s_ease_both] overflow-hidden`}>
        <div className="flex-shrink-0 flex items-center justify-between px-7 py-5 border-b border-gray-100/50 bg-white/50">
          <h3 className="text-[17px] font-bold font-display text-gray-900 m-0">{title}</h3>
          <button onClick={onClose} type="button" className="w-8 h-8 rounded-full bg-white/80 hover:bg-white border border-gray-200/50 shadow-sm flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors">
            <X size={15} strokeWidth={2.5} />
          </button>
        </div>
        <div className="p-7 overflow-y-auto">{children}</div>
        {footer && <div className="flex-shrink-0 flex justify-end gap-3 px-7 py-5 bg-gray-50/50 border-t border-gray-100/50">{footer}</div>}
      </div>
    </div>,
    document.body
  )
}

