'use client'
import { useState } from 'react'
import MigrateModal from './MigrateModal'

export default function MigrateButton() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="relative flex items-center gap-2 px-4 py-2 rounded-xl overflow-hidden text-xs font-bold text-white transition-all group"
        style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', boxShadow: '0 0 16px rgba(124,58,237,0.35)' }}
      >
        <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: 'linear-gradient(135deg,#6d28d9,#3730a3)' }} />
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 relative z-10 shrink-0">
          <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>
          <path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>
        </svg>
        <span className="relative z-10">انقل متجرك</span>
        <span className="relative z-10 text-[10px] font-semibold bg-white/20 px-1.5 py-0.5 rounded-full leading-none">مجاني</span>
      </button>
      {open && <MigrateModal onClose={() => setOpen(false)} />}
    </>
  )
}
