'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Search, FolderKanban, Users, Receipt, CheckSquare, FileText, X, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Result {
  id: string
  type: 'project' | 'client' | 'invoice' | 'task' | 'quote'
  label: string
  sub: string
  href: string
}

const TYPE_CONFIG = {
  project: { icon: FolderKanban, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-950', label: 'Projet' },
  client:  { icon: Users,        color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950', label: 'Client' },
  invoice: { icon: Receipt,      color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-950', label: 'Facture' },
  task:    { icon: CheckSquare,  color: 'text-violet-500', bg: 'bg-violet-50 dark:bg-violet-950', label: 'Tâche' },
  quote:   { icon: FileText,     color: 'text-cyan-500', bg: 'bg-cyan-50 dark:bg-cyan-950', label: 'Devis' },
}

export default function GlobalSearch() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Result[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  // Cmd+K / Ctrl+K to open
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(prev => !prev)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
      setQuery('')
      setResults([])
      setSelected(0)
    }
  }, [open])

  const search = useCallback(async (q: string) => {
    if (!q.trim() || q.length < 2) { setResults([]); return }
    setLoading(true)
    const like = `%${q}%`

    const [{ data: projects }, { data: clients }, { data: invoices }, { data: tasks }, { data: quotes }] = await Promise.all([
      supabase.from('projects').select('id, title, status').ilike('title', like).limit(5),
      supabase.from('clients').select('id, company_name, contact_name').ilike('company_name', like).limit(5),
      supabase.from('invoices').select('id, invoice_number, total_amount, status').ilike('invoice_number', like).limit(4),
      supabase.from('tasks').select('id, title, status, priority').ilike('title', like).limit(5),
      supabase.from('quotes').select('id, title, total_amount, status').ilike('title', like).limit(4),
    ])

    const all: Result[] = [
      ...(projects || []).map((p: any) => ({ id: p.id, type: 'project' as const, label: p.title, sub: p.status?.replace('_', ' ') || '', href: `/dashboard/projects/${p.id}` })),
      ...(clients || []).map((c: any) => ({ id: c.id, type: 'client' as const, label: c.company_name, sub: c.contact_name || '', href: `/dashboard/clients` })),
      ...(invoices || []).map((i: any) => ({ id: i.id, type: 'invoice' as const, label: i.invoice_number, sub: i.status || '', href: `/dashboard/invoices` })),
      ...(tasks || []).map((t: any) => ({ id: t.id, type: 'task' as const, label: t.title, sub: t.priority || '', href: `/dashboard/tasks` })),
      ...(quotes || []).map((q: any) => ({ id: q.id, type: 'quote' as const, label: q.title, sub: q.status || '', href: `/dashboard/quotes` })),
    ]
    setResults(all)
    setSelected(0)
    setLoading(false)
  }, [])

  useEffect(() => {
    const t = setTimeout(() => search(query), 250)
    return () => clearTimeout(t)
  }, [query, search])

  const navigate = (r: Result) => {
    router.push(r.href)
    setOpen(false)
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, results.length - 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)) }
    if (e.key === 'Enter' && results[selected]) navigate(results[selected])
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[12vh]" onClick={() => setOpen(false)}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Panel */}
      <div
        className="relative w-full max-w-xl mx-4 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Rechercher projets, clients, factures, tâches..."
            className="flex-1 bg-transparent text-sm outline-none text-foreground placeholder:text-muted-foreground"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <kbd className="hidden sm:flex items-center gap-0.5 text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto">
          {loading && (
            <div className="py-8 text-center text-sm text-muted-foreground">Recherche...</div>
          )}
          {!loading && query.length >= 2 && results.length === 0 && (
            <div className="py-8 text-center text-sm text-muted-foreground">Aucun résultat pour «&nbsp;{query}&nbsp;»</div>
          )}
          {!loading && results.length > 0 && (
            <div className="p-2 space-y-0.5">
              {results.map((r, i) => {
                const cfg = TYPE_CONFIG[r.type]
                const Icon = cfg.icon
                return (
                  <button
                    key={r.id}
                    onClick={() => navigate(r)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors',
                      i === selected ? 'bg-primary/10' : 'hover:bg-muted/60'
                    )}
                  >
                    <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center shrink-0', cfg.bg)}>
                      <Icon className={cn('h-4 w-4', cfg.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{r.label}</p>
                      <p className="text-xs text-muted-foreground truncate capitalize">{r.sub}</p>
                    </div>
                    <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0', cfg.bg, cfg.color)}>
                      {cfg.label}
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  </button>
                )
              })}
            </div>
          )}
          {!query && (
            <div className="p-4 space-y-1">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">Accès rapide</p>
              {[
                { label: 'Projets', href: '/dashboard/projects', type: 'project' as const },
                { label: 'Clients', href: '/dashboard/clients', type: 'client' as const },
                { label: 'Factures', href: '/dashboard/invoices', type: 'invoice' as const },
                { label: 'Tâches', href: '/dashboard/tasks', type: 'task' as const },
              ].map(item => {
                const cfg = TYPE_CONFIG[item.type]
                const Icon = cfg.icon
                return (
                  <button key={item.href} onClick={() => { router.push(item.href); setOpen(false) }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-muted/60 text-left transition-colors">
                    <div className={cn('h-7 w-7 rounded-lg flex items-center justify-center', cfg.bg)}>
                      <Icon className={cn('h-3.5 w-3.5', cfg.color)} />
                    </div>
                    <span className="text-sm text-foreground">{item.label}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-border flex items-center gap-3 text-[10px] text-muted-foreground">
          <span><kbd className="bg-muted px-1 rounded border border-border">↑↓</kbd> naviguer</span>
          <span><kbd className="bg-muted px-1 rounded border border-border">↵</kbd> ouvrir</span>
          <span><kbd className="bg-muted px-1 rounded border border-border">Esc</kbd> fermer</span>
        </div>
      </div>
    </div>
  )
}
