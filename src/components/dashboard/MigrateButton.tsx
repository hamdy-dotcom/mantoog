'use client'
import { useState } from 'react'
import MigrateModal from './MigrateModal'

export default function MigrateButton() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#7c3aed] to-[#6d28d9] text-white rounded-xl text-sm font-bold hover:shadow-lg hover:shadow-purple-500/20 transition-all"
      >
        <span>🚀</span>
        انقل متجرك إلى منتوج
      </button>
      {open && <MigrateModal onClose={() => setOpen(false)} />}
    </>
  )
}
