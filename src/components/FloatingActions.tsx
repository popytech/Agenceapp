'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X, FolderPlus, CheckSquare, Receipt, Users, FileText, Keyboard } from 'lucide-react'
import { cn } from '@/lib/utils'

const ACTIONS = [
  { icon: CheckSquare, label: 'Nouvelle tâche',    href: '/dashboard/tasks?new=1',    color: 'bg-violet-500 hover:bg-violet-600',    key: 'N' },
  { icon: FolderPlus,  label: 'Nouveau projet',    href: '/dashboard/projects?new=1', color: 'bg-blue-500 hover:bg-blue-600',        key: 'P' },
  { icon: Receipt,     label: 'Nouvelle facture',  href: '/dashboard/invoices?new=1', color: 'bg-amber-500 hover:bg-amber-600',      key: 'I' },
  { icon: Users,       label: 'Nouveau client',    href: '/dashboard/clients?new=1',  color: 'bg-emerald-500 hover:bg-emerald-600',  key: 'C' },
  { icon: FileText,    label: 'Nouveau devis',     href: '/dashboard/quotes?new=1',   color: 'bg-cyan-500 hover:bg-cyan-600',        key: 'D' },
]

export default function FloatingActions() {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  // Keyboard shortcuts: press key when FAB is open OR global shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Only trigger if not typing in an input/textarea
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) return

      if (e.key === '+' || e.key === '=') { setOpen(prev => !prev); return }
      if (!open) return

      const action = ACTIONS.find(a => a.key.toLowerCase() === e.key.toLowerCase())
      if (action) { router.push(action.href); setOpen(false) }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, router])

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px]" onClick={() => setOpen(false)} />
      )}

      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2.5">
        {/* Action items */}
        {ACTIONS.map((action, i) => {
          const Icon = action.icon
          return (
            <div
              key={action.key}
              className={cn(
                'flex items-center gap-2.5 transition-all duration-200',
                open ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
              )}
              style={{ transitionDelay: open ? `${i * 40}ms` : `${(ACTIONS.length - i) * 30}ms` }}
            >
              {/* Label */}
              <div className="flex items-center gap-1.5 bg-card border border-border shadow-md rounded-lg px-2.5 py-1.5">
                <span className="text-xs font-medium text-foreground whitespace-nowrap">{action.label}</span>
                <kbd className="text-[9px] font-bold bg-muted text-muted-foreground px-1 py-0.5 rounded border border-border">{action.key}</kbd>
              </div>
              {/* Button */}
              <button
                onClick={() => { router.push(action.href); setOpen(false) }}
                className={cn(
                  'h-10 w-10 rounded-full text-white shadow-lg flex items-center justify-center transition-all active:scale-95',
                  action.color
                )}
              >
                <Icon className="h-4.5 w-4.5" style={{ width: 18, height: 18 }} />
              </button>
            </div>
          )
        })}

        {/* Main FAB */}
        <button
          onClick={() => setOpen(prev => !prev)}
          className={cn(
            'h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-xl flex items-center justify-center transition-all duration-300 active:scale-95 hover:shadow-2xl',
            open && 'rotate-45 bg-foreground'
          )}
          title="Actions rapides (+)"
        >
          {open ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
        </button>

        {/* Hint */}
        {!open && (
          <div className="flex items-center gap-1 text-[9px] text-muted-foreground opacity-60">
            <Keyboard className="h-2.5 w-2.5" />
            <span>appuie sur +</span>
          </div>
        )}
      </div>
    </>
  )
}
