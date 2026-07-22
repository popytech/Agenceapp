'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { useRoleGuard } from '@/hooks/useRoleGuard'
import {
  Code2, Bug, Zap, FolderKanban, BookOpen, BarChart3,
  Plus, X, ChevronDown, AlertCircle, CheckCircle2,
  ExternalLink, Clock, Server, FileText, Terminal,
  Shield, Database, Globe, Layers, GitBranch, Activity
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

// ─── Constants ───────────────────────────────────────────────────────────────
const DARK_BG   = 'linear-gradient(135deg, #070b12 0%, #0a0f1e 40%, #080c18 100%)'
const CARD_BG   = 'rgba(255,255,255,0.025)'
const CARD_BORDER = 'rgba(255,255,255,0.07)'

const TICKET_STATUSES = [
  { value: 'backlog',      label: 'Backlog',     color: '#64748b' },
  { value: 'a_faire',      label: 'À faire',     color: '#94a3b8' },
  { value: 'en_cours',     label: 'En cours',    color: '#3b82f6' },
  { value: 'code_review',  label: 'Code Review', color: '#f59e0b' },
  { value: 'test_qa',      label: 'Test QA',     color: '#a855f7' },
  { value: 'deploye',      label: 'Déployé',     color: '#10b981' },
  { value: 'termine',      label: 'Terminé',     color: '#34d399' },
]

const TICKET_TYPES = [
  { value: 'frontend',     label: 'Frontend',     icon: '◈', color: '#60a5fa' },
  { value: 'backend',      label: 'Backend',      icon: '⬡', color: '#34d399' },
  { value: 'api',          label: 'API',           icon: '⟳', color: '#a78bfa' },
  { value: 'database',     label: 'Base de données', icon: '⊞', color: '#fbbf24' },
  { value: 'ui',           label: 'UI / Intégration', icon: '▣', color: '#f472b6' },
  { value: 'securite',     label: 'Sécurité',     icon: '⚡', color: '#f87171' },
  { value: 'optimisation', label: 'Optimisation', icon: '◎', color: '#fb923c' },
  { value: 'bug',          label: 'Bug Fix',      icon: '⚠', color: '#ef4444' },
  { value: 'autre',        label: 'Autre',        icon: '◇', color: '#94a3b8' },
]

const PROJECT_TECH = ['Next.js','React','Vue.js','Nuxt','Laravel','Node.js','Django','FastAPI','PostgreSQL','MySQL','MongoDB','Redis','Docker','AWS','Vercel','Figma']

const BUG_SEVERITIES = [
  { value: 'bloquant', label: 'Bloquant', color: '#ef4444' },
  { value: 'critique', label: 'Critique', color: '#f87171' },
  { value: 'majeur',   label: 'Majeur',   color: '#f59e0b' },
  { value: 'minor',    label: 'Mineur',   color: '#94a3b8' },
]

const DOC_TYPES = [
  { value: 'specs',       label: 'Specs / CDC' },
  { value: 'api',         label: 'Doc API' },
  { value: 'serveur',     label: 'Accès serveur' },
  { value: 'env',         label: 'Variables ENV' },
  { value: 'technique',   label: 'Doc technique' },
  { value: 'autre',       label: 'Autre' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getTypeMeta(type: string) {
  return TICKET_TYPES.find(t => t.value === type) || TICKET_TYPES[TICKET_TYPES.length - 1]
}
function getStatusCfg(status: string) {
  return TICKET_STATUSES.find(s => s.value === status) || TICKET_STATUSES[0]
}

// ─── Tabs config ─────────────────────────────────────────────────────────────
const TABS = [
  { id: 'tickets',      label: 'Tickets',       icon: Code2 },
  { id: 'projets',      label: 'Projets Tech',  icon: FolderKanban },
  { id: 'bugs',         label: 'Bugs',          icon: Bug },
  { id: 'deployements', label: 'Déploiements',  icon: Zap },
  { id: 'docs',         label: 'Documentation', icon: BookOpen },
  { id: 'kpis',         label: 'KPIs',          icon: BarChart3 },
]

// ─── Main Component ───────────────────────────────────────────────────────────
export default function DevPage() {
  useRoleGuard(['super_admin', 'chef_projet', 'developpeur'])
  const { profile } = useAuth()
  const [tab, setTab] = useState('tickets')

  // Data
  const [tickets, setTickets]       = useState<any[]>([])
  const [projects, setProjects]     = useState<any[]>([])
  const [bugs, setBugs]             = useState<any[]>([])
  const [deps, setDeps]             = useState<any[]>([])
  const [docs, setDocs]             = useState<any[]>([])
  const [profiles, setProfiles]     = useState<any[]>([])
  const [loading, setLoading]       = useState(true)

  // Modals
  const [showTicketModal, setShowTicketModal] = useState(false)
  const [showProjectModal, setShowProjectModal] = useState(false)
  const [showBugModal, setShowBugModal]       = useState(false)
  const [showDepModal, setShowDepModal]       = useState(false)
  const [showDocModal, setShowDocModal]       = useState(false)

  // Forms
  const [ticketForm, setTicketForm] = useState({ title: '', description: '', type: 'frontend', priority: 'normale', status: 'a_faire', project_id: '', deadline: '', estimated_hours: '' })
  const [projectForm, setProjectForm] = useState({ name: '', client_name: '', tech_stack: [] as string[], deadline: '', status: 'en_cours', description: '' })
  const [bugForm, setBugForm] = useState({ title: '', description: '', reproduction_steps: '', url: '', browser: '', severity: 'majeur', project_id: '' })
  const [depForm, setDepForm] = useState({ project_id: '', version: '', url: '', server: '', notes: '', status: 'success' })
  const [docForm, setDocForm] = useState({ title: '', type: 'specs', content: '', project_id: '' })

  const [saving, setSaving] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>('all')

  useEffect(() => {
    load()
  }, [profile?.id])

  async function load() {
    if (!profile?.id) return
    setLoading(true)
    const [tk, pr, bg, dp, dc, pf] = await Promise.all([
      supabase.from('dev_tickets').select('*, dev_projects(name), profiles!dev_tickets_assigned_to_fkey(full_name)').order('deadline', { ascending: true }).limit(100),
      supabase.from('dev_projects').select('*').order('deadline', { ascending: true }).limit(50),
      supabase.from('bug_reports').select('*, dev_projects(name), profiles!bug_reports_reported_by_fkey(full_name)').order('created_at', { ascending: false }).limit(60),
      supabase.from('deployments').select('*, dev_projects(name), profiles!deployments_deployed_by_fkey(full_name)').order('deployed_at', { ascending: false }).limit(30),
      supabase.from('dev_docs').select('*, dev_projects(name)').order('created_at', { ascending: false }).limit(50),
        supabase.from('profiles').select('id,full_name,role').in('role', ['developpeur','dev','chef_projet','super_admin']).order('full_name'),
    ])
    setTickets(tk.data || [])
    setProjects(pr.data || [])
    setBugs(bg.data || [])
    setDeps(dp.data || [])
    setDocs(dc.data || [])
    setProfiles(pf.data || [])
    setLoading(false)
  }

  async function saveTicket() {
    if (!ticketForm.title.trim()) return
    setSaving(true)
    const payload: any = {
      title: ticketForm.title,
      description: ticketForm.description || null,
      type: ticketForm.type,
      priority: ticketForm.priority,
      status: ticketForm.status,
      project_id: ticketForm.project_id || null,
      deadline: ticketForm.deadline || null,
      estimated_hours: ticketForm.estimated_hours ? parseFloat(ticketForm.estimated_hours) : null,
      assigned_to: profile!.id,
      created_by: profile!.id,
    }
    await supabase.from('dev_tickets').insert(payload)
    setShowTicketModal(false)
    setTicketForm({ title: '', description: '', type: 'frontend', priority: 'normale', status: 'a_faire', project_id: '', deadline: '', estimated_hours: '' })
    setSaving(false)
    load()
  }

  async function saveProject() {
    if (!projectForm.name.trim()) return
    setSaving(true)
    await supabase.from('dev_projects').insert({
      name: projectForm.name,
      client_name: projectForm.client_name || null,
      tech_stack: projectForm.tech_stack.length > 0 ? projectForm.tech_stack : null,
      deadline: projectForm.deadline || null,
      status: projectForm.status,
      description: projectForm.description || null,
    })
    setShowProjectModal(false)
    setProjectForm({ name: '', client_name: '', tech_stack: [], deadline: '', status: 'en_cours', description: '' })
    setSaving(false)
    load()
  }

  async function saveBug() {
    if (!bugForm.title.trim()) return
    setSaving(true)
    await supabase.from('bug_reports').insert({
      title: bugForm.title,
      description: bugForm.description || null,
      reproduction_steps: bugForm.reproduction_steps || null,
      url: bugForm.url || null,
      browser: bugForm.browser || null,
      severity: bugForm.severity,
      project_id: bugForm.project_id || null,
      reported_by: profile!.id,
      assigned_to: profile!.id,
    })
    setShowBugModal(false)
    setBugForm({ title: '', description: '', reproduction_steps: '', url: '', browser: '', severity: 'majeur', project_id: '' })
    setSaving(false)
    load()
  }

  async function saveDep() {
    if (!depForm.version.trim()) return
    setSaving(true)
    await supabase.from('deployments').insert({
      project_id: depForm.project_id || null,
      version: depForm.version,
      url: depForm.url || null,
      server: depForm.server || null,
      notes: depForm.notes || null,
      status: depForm.status,
      deployed_by: profile!.id,
    })
    setShowDepModal(false)
    setDepForm({ project_id: '', version: '', url: '', server: '', notes: '', status: 'success' })
    setSaving(false)
    load()
  }

  async function saveDoc() {
    if (!docForm.title.trim()) return
    setSaving(true)
    await supabase.from('dev_docs').insert({
      title: docForm.title,
      type: docForm.type,
      content: docForm.content || null,
      project_id: docForm.project_id || null,
      created_by: profile!.id,
    })
    setShowDocModal(false)
    setDocForm({ title: '', type: 'specs', content: '', project_id: '' })
    setSaving(false)
    load()
  }

  async function updateTicketStatus(id: string, status: string) {
    await supabase.from('dev_tickets').update({ status }).eq('id', id)
    setTickets(prev => prev.map(t => t.id === id ? { ...t, status } : t))
  }

  async function updateBugStatus(id: string, status: string) {
    await supabase.from('bug_reports').update({ status }).eq('id', id)
    setBugs(prev => prev.map(b => b.id === id ? { ...b, status } : b))
  }

  const filteredTickets = statusFilter === 'all' ? tickets : tickets.filter(t => t.status === statusFilter)

  return (
    <div className="min-h-screen pt-0 md:pt-0" style={{ background: DARK_BG }}>

      {/* ── Header Banner ── */}
      <div className="relative overflow-hidden px-5 md:px-8 pt-7 pb-8" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(16,185,129,1) 1px, transparent 1px), linear-gradient(90deg, rgba(16,185,129,1) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        <div className="absolute top-0 left-0 w-96 h-96 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)', transform: 'translate(-30%, -40%)' }} />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 mb-3 font-mono" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)' }}>
              <Terminal className="h-3 w-3 text-emerald-400" />
              <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-widest">Dev Workspace</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black font-mono" style={{ color: '#f8fafc', letterSpacing: '-0.02em' }}>
              <span style={{ color: '#34d399' }}>~/</span>dev<span style={{ color: 'rgba(255,255,255,0.3)' }}>_workspace</span>
            </h1>
            <p className="mt-1 font-mono text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
              {tickets.length} tickets · {bugs.filter(b => b.status !== 'resolu').length} bugs · {projects.length} projets
            </p>
          </div>
          {/* Actions rapides */}
          <div className="flex flex-wrap gap-2">
            {tab === 'tickets' && (
              <button onClick={() => setShowTicketModal(true)}
                className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white font-mono transition-all hover:opacity-90 hover:scale-[1.02]"
                style={{ background: 'linear-gradient(135deg, #059669, #2563eb)', boxShadow: '0 0 16px rgba(16,185,129,0.2)' }}>
                <Plus className="h-4 w-4" /> Nouveau ticket
              </button>
            )}
            {tab === 'projets' && (
              <button onClick={() => setShowProjectModal(true)}
                className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white font-mono transition-all hover:opacity-90 hover:scale-[1.02]"
                style={{ background: 'linear-gradient(135deg, #059669, #2563eb)', boxShadow: '0 0 16px rgba(16,185,129,0.2)' }}>
                <Plus className="h-4 w-4" /> Nouveau projet
              </button>
            )}
            {tab === 'bugs' && (
              <button onClick={() => setShowBugModal(true)}
                className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white font-mono transition-all hover:opacity-90 hover:scale-[1.02]"
                style={{ background: 'linear-gradient(135deg, #dc2626, #b45309)', boxShadow: '0 0 16px rgba(239,68,68,0.2)' }}>
                <Plus className="h-4 w-4" /> Signaler un bug
              </button>
            )}
            {tab === 'deployements' && (
              <button onClick={() => setShowDepModal(true)}
                className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white font-mono transition-all hover:opacity-90 hover:scale-[1.02]"
                style={{ background: 'linear-gradient(135deg, #059669, #0891b2)', boxShadow: '0 0 16px rgba(16,185,129,0.2)' }}>
                <Plus className="h-4 w-4" /> Nouveau déploiement
              </button>
            )}
            {tab === 'docs' && (
              <button onClick={() => setShowDocModal(true)}
                className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white font-mono transition-all hover:opacity-90 hover:scale-[1.02]"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #2563eb)', boxShadow: '0 0 16px rgba(124,58,237,0.2)' }}>
                <Plus className="h-4 w-4" /> Ajouter doc
              </button>
            )}
          </div>
        </div>

        {/* Onglets */}
        <div className="relative z-10 flex gap-1 mt-6 overflow-x-auto pb-1">
          {TABS.map(t => {
            const Icon = t.icon
            const isActive = tab === t.id
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold font-mono whitespace-nowrap transition-all"
                style={isActive
                  ? { background: 'rgba(16,185,129,0.15)', color: '#34d399', border: '1px solid rgba(16,185,129,0.3)' }
                  : { background: 'transparent', color: 'rgba(255,255,255,0.35)', border: '1px solid transparent' }
                }>
                <Icon className="h-3.5 w-3.5" />
                {t.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="px-5 md:px-8 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <div className="text-center font-mono">
              <div className="text-2xl mb-2" style={{ color: '#34d399' }}>▋</div>
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>chargement...</p>
            </div>
          </div>
        ) : (
          <>
            {tab === 'tickets'      && <TicketsTab tickets={filteredTickets} allTickets={tickets} statusFilter={statusFilter} setStatusFilter={setStatusFilter} onStatusChange={updateTicketStatus} />}
            {tab === 'projets'      && <ProjectsTab projects={projects} />}
            {tab === 'bugs'         && <BugsTab bugs={bugs} onStatusChange={updateBugStatus} />}
            {tab === 'deployements' && <DeploiementsTab deps={deps} />}
            {tab === 'docs'         && <DocsTab docs={docs} />}
            {tab === 'kpis'         && <KpisTab tickets={tickets} bugs={bugs} deps={deps} projects={projects} />}
          </>
        )}
      </div>

      {/* ── Modals ── */}
      {/* Ticket */}
      <Dialog open={showTicketModal} onOpenChange={setShowTicketModal}>
        <DialogContent className="max-w-lg" style={{ background: '#0f1729', border: '1px solid rgba(255,255,255,0.1)', color: '#f1f5f9' }}>
          <DialogHeader><DialogTitle className="font-mono text-emerald-400">+ new ticket</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><Label className="text-xs font-mono text-slate-400">Titre *</Label><Input value={ticketForm.title} onChange={e => setTicketForm(f => ({...f, title: e.target.value}))} placeholder="ex: Fix bug login page" className="mt-1 font-mono text-sm bg-slate-900 border-slate-700" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs font-mono text-slate-400">Type</Label>
                <Select value={ticketForm.type} onValueChange={v => setTicketForm(f => ({...f, type: v}))}>
                  <SelectTrigger className="mt-1 bg-slate-900 border-slate-700 font-mono text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700">
                    {TICKET_TYPES.map(t => <SelectItem key={t.value} value={t.value} className="font-mono text-sm">{t.icon} {t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs font-mono text-slate-400">Priorité</Label>
                <Select value={ticketForm.priority} onValueChange={v => setTicketForm(f => ({...f, priority: v}))}>
                  <SelectTrigger className="mt-1 bg-slate-900 border-slate-700 font-mono text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700">
                    {['critique','haute','normale','basse'].map(p => <SelectItem key={p} value={p} className="font-mono text-sm capitalize">{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs font-mono text-slate-400">Projet</Label>
                <Select value={ticketForm.project_id} onValueChange={v => setTicketForm(f => ({...f, project_id: v}))}>
                  <SelectTrigger className="mt-1 bg-slate-900 border-slate-700 font-mono text-sm"><SelectValue placeholder="— aucun —" /></SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700">
                    {projects.map(p => <SelectItem key={p.id} value={p.id} className="font-mono text-sm">{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs font-mono text-slate-400">Deadline</Label><Input type="date" value={ticketForm.deadline} onChange={e => setTicketForm(f => ({...f, deadline: e.target.value}))} className="mt-1 bg-slate-900 border-slate-700 font-mono text-sm" /></div>
            </div>
            <div><Label className="text-xs font-mono text-slate-400">Description</Label><Textarea value={ticketForm.description} onChange={e => setTicketForm(f => ({...f, description: e.target.value}))} className="mt-1 bg-slate-900 border-slate-700 font-mono text-sm h-20" /></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowTicketModal(false)} className="font-mono text-slate-400">annuler</Button>
            <Button onClick={saveTicket} disabled={saving} className="font-mono" style={{ background: 'linear-gradient(135deg, #059669, #2563eb)' }}>
              {saving ? '...' : '$ create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Project */}
      <Dialog open={showProjectModal} onOpenChange={setShowProjectModal}>
        <DialogContent className="max-w-lg" style={{ background: '#0f1729', border: '1px solid rgba(255,255,255,0.1)', color: '#f1f5f9' }}>
          <DialogHeader><DialogTitle className="font-mono text-emerald-400">+ new project</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><Label className="text-xs font-mono text-slate-400">Nom du projet *</Label><Input value={projectForm.name} onChange={e => setProjectForm(f => ({...f, name: e.target.value}))} className="mt-1 bg-slate-900 border-slate-700 font-mono text-sm" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs font-mono text-slate-400">Client</Label><Input value={projectForm.client_name} onChange={e => setProjectForm(f => ({...f, client_name: e.target.value}))} className="mt-1 bg-slate-900 border-slate-700 font-mono text-sm" /></div>
              <div><Label className="text-xs font-mono text-slate-400">Deadline</Label><Input type="date" value={projectForm.deadline} onChange={e => setProjectForm(f => ({...f, deadline: e.target.value}))} className="mt-1 bg-slate-900 border-slate-700 font-mono text-sm" /></div>
            </div>
            <div>
              <Label className="text-xs font-mono text-slate-400">Tech stack</Label>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {PROJECT_TECH.map(tech => (
                  <button key={tech} onClick={() => setProjectForm(f => ({ ...f, tech_stack: f.tech_stack.includes(tech) ? f.tech_stack.filter(t => t !== tech) : [...f.tech_stack, tech] }))}
                    className={cn('text-[11px] font-mono px-2 py-0.5 rounded', projectForm.tech_stack.includes(tech) ? 'bg-emerald-900 text-emerald-300 border border-emerald-600' : 'bg-slate-800 text-slate-400 border border-slate-700')}>
                    {tech}
                  </button>
                ))}
              </div>
            </div>
            <div><Label className="text-xs font-mono text-slate-400">Description</Label><Textarea value={projectForm.description} onChange={e => setProjectForm(f => ({...f, description: e.target.value}))} className="mt-1 bg-slate-900 border-slate-700 font-mono text-sm h-16" /></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowProjectModal(false)} className="font-mono text-slate-400">annuler</Button>
            <Button onClick={saveProject} disabled={saving} className="font-mono" style={{ background: 'linear-gradient(135deg, #059669, #2563eb)' }}>
              {saving ? '...' : '$ init project'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bug */}
      <Dialog open={showBugModal} onOpenChange={setShowBugModal}>
        <DialogContent className="max-w-lg" style={{ background: '#0f1729', border: '1px solid rgba(255,255,255,0.1)', color: '#f1f5f9' }}>
          <DialogHeader><DialogTitle className="font-mono text-red-400">⚠ report bug</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><Label className="text-xs font-mono text-slate-400">Titre *</Label><Input value={bugForm.title} onChange={e => setBugForm(f => ({...f, title: e.target.value}))} className="mt-1 bg-slate-900 border-slate-700 font-mono text-sm" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs font-mono text-slate-400">Sévérité</Label>
                <Select value={bugForm.severity} onValueChange={v => setBugForm(f => ({...f, severity: v}))}>
                  <SelectTrigger className="mt-1 bg-slate-900 border-slate-700 font-mono text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700">
                    {BUG_SEVERITIES.map(s => <SelectItem key={s.value} value={s.value} className="font-mono text-sm">{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs font-mono text-slate-400">Projet</Label>
                <Select value={bugForm.project_id} onValueChange={v => setBugForm(f => ({...f, project_id: v}))}>
                  <SelectTrigger className="mt-1 bg-slate-900 border-slate-700 font-mono text-sm"><SelectValue placeholder="— aucun —" /></SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700">
                    {projects.map(p => <SelectItem key={p.id} value={p.id} className="font-mono text-sm">{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label className="text-xs font-mono text-slate-400">URL</Label><Input value={bugForm.url} onChange={e => setBugForm(f => ({...f, url: e.target.value}))} placeholder="https://..." className="mt-1 bg-slate-900 border-slate-700 font-mono text-sm" /></div>
            <div><Label className="text-xs font-mono text-slate-400">Navigateur</Label><Input value={bugForm.browser} onChange={e => setBugForm(f => ({...f, browser: e.target.value}))} placeholder="Chrome 122, Safari..." className="mt-1 bg-slate-900 border-slate-700 font-mono text-sm" /></div>
            <div><Label className="text-xs font-mono text-slate-400">Étapes de reproduction</Label><Textarea value={bugForm.reproduction_steps} onChange={e => setBugForm(f => ({...f, reproduction_steps: e.target.value}))} className="mt-1 bg-slate-900 border-slate-700 font-mono text-sm h-20" /></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowBugModal(false)} className="font-mono text-slate-400">annuler</Button>
            <Button onClick={saveBug} disabled={saving} className="font-mono bg-red-900 hover:bg-red-800 text-red-200">
              {saving ? '...' : '$ report'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deployment */}
      <Dialog open={showDepModal} onOpenChange={setShowDepModal}>
        <DialogContent className="max-w-lg" style={{ background: '#0f1729', border: '1px solid rgba(255,255,255,0.1)', color: '#f1f5f9' }}>
          <DialogHeader><DialogTitle className="font-mono text-emerald-400">▲ deploy</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs font-mono text-slate-400">Version *</Label><Input value={depForm.version} onChange={e => setDepForm(f => ({...f, version: e.target.value}))} placeholder="v1.2.3" className="mt-1 bg-slate-900 border-slate-700 font-mono text-sm" /></div>
              <div><Label className="text-xs font-mono text-slate-400">Projet</Label>
                <Select value={depForm.project_id} onValueChange={v => setDepForm(f => ({...f, project_id: v}))}>
                  <SelectTrigger className="mt-1 bg-slate-900 border-slate-700 font-mono text-sm"><SelectValue placeholder="— aucun —" /></SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700">
                    {projects.map(p => <SelectItem key={p.id} value={p.id} className="font-mono text-sm">{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label className="text-xs font-mono text-slate-400">URL de production</Label><Input value={depForm.url} onChange={e => setDepForm(f => ({...f, url: e.target.value}))} placeholder="https://..." className="mt-1 bg-slate-900 border-slate-700 font-mono text-sm" /></div>
            <div><Label className="text-xs font-mono text-slate-400">Serveur</Label><Input value={depForm.server} onChange={e => setDepForm(f => ({...f, server: e.target.value}))} placeholder="Vercel, AWS, VPS..." className="mt-1 bg-slate-900 border-slate-700 font-mono text-sm" /></div>
            <div><Label className="text-xs font-mono text-slate-400">Notes</Label><Textarea value={depForm.notes} onChange={e => setDepForm(f => ({...f, notes: e.target.value}))} className="mt-1 bg-slate-900 border-slate-700 font-mono text-sm h-16" /></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowDepModal(false)} className="font-mono text-slate-400">annuler</Button>
            <Button onClick={saveDep} disabled={saving} className="font-mono" style={{ background: 'linear-gradient(135deg, #059669, #0891b2)' }}>
              {saving ? '...' : '$ deploy'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Doc */}
      <Dialog open={showDocModal} onOpenChange={setShowDocModal}>
        <DialogContent className="max-w-lg" style={{ background: '#0f1729', border: '1px solid rgba(255,255,255,0.1)', color: '#f1f5f9' }}>
          <DialogHeader><DialogTitle className="font-mono text-purple-400">📄 add doc</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><Label className="text-xs font-mono text-slate-400">Titre *</Label><Input value={docForm.title} onChange={e => setDocForm(f => ({...f, title: e.target.value}))} className="mt-1 bg-slate-900 border-slate-700 font-mono text-sm" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs font-mono text-slate-400">Type</Label>
                <Select value={docForm.type} onValueChange={v => setDocForm(f => ({...f, type: v}))}>
                  <SelectTrigger className="mt-1 bg-slate-900 border-slate-700 font-mono text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700">
                    {DOC_TYPES.map(d => <SelectItem key={d.value} value={d.value} className="font-mono text-sm">{d.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs font-mono text-slate-400">Projet</Label>
                <Select value={docForm.project_id} onValueChange={v => setDocForm(f => ({...f, project_id: v}))}>
                  <SelectTrigger className="mt-1 bg-slate-900 border-slate-700 font-mono text-sm"><SelectValue placeholder="— global —" /></SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700">
                    {projects.map(p => <SelectItem key={p.id} value={p.id} className="font-mono text-sm">{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label className="text-xs font-mono text-slate-400">Contenu</Label><Textarea value={docForm.content} onChange={e => setDocForm(f => ({...f, content: e.target.value}))} className="mt-1 bg-slate-900 border-slate-700 font-mono text-sm h-28" /></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowDocModal(false)} className="font-mono text-slate-400">annuler</Button>
            <Button onClick={saveDoc} disabled={saving} className="font-mono" style={{ background: 'linear-gradient(135deg, #7c3aed, #2563eb)' }}>
              {saving ? '...' : '$ save doc'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Tickets Tab ──────────────────────────────────────────────────────────────
function TicketsTab({ tickets, allTickets, statusFilter, setStatusFilter, onStatusChange }: any) {
  return (
    <div className="space-y-5">
      {/* Pipeline KPI */}
      <div className="grid grid-cols-4 md:grid-cols-7 gap-2">
        {['all', ...TICKET_STATUSES.map(s => s.value)].map(s => {
          const cfg = TICKET_STATUSES.find(x => x.value === s)
          const count = s === 'all' ? allTickets.length : allTickets.filter((t: any) => t.status === s).length
          const isActive = statusFilter === s
          return (
            <button key={s} onClick={() => setStatusFilter(s)}
              className="rounded-xl px-3 py-2.5 text-center transition-all hover:scale-[1.02]"
              style={isActive
                ? { background: `${cfg?.color || '#64748b'}22`, border: `1px solid ${cfg?.color || '#64748b'}55`, color: cfg?.color || '#94a3b8' }
                : { background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.3)' }
              }>
              <p className="text-xl font-black font-mono tabular-nums">{count}</p>
              <p className="text-[10px] font-mono mt-0.5 uppercase tracking-wide truncate">{s === 'all' ? 'tous' : cfg?.label}</p>
            </button>
          )
        })}
      </div>

      {/* Kanban par statut */}
      {statusFilter === 'all' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {TICKET_STATUSES.slice(1, 6).map(col => {
            const colTickets = allTickets.filter((t: any) => t.status === col.value)
            return (
              <div key={col.value} className="rounded-2xl overflow-hidden" style={{ background: CARD_BG, border: `1px solid ${col.color}20` }}>
                <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid ${col.color}20` }}>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full" style={{ background: col.color }} />
                    <span className="text-xs font-black font-mono uppercase tracking-widest" style={{ color: col.color }}>{col.label}</span>
                  </div>
                  <span className="text-xs font-mono" style={{ color: 'rgba(255,255,255,0.25)' }}>{colTickets.length}</span>
                </div>
                <div className="p-3 space-y-2 min-h-[80px]">
                  {colTickets.length === 0
                    ? <p className="text-[11px] font-mono text-center py-4" style={{ color: 'rgba(255,255,255,0.15)' }}>// vide</p>
                    : colTickets.slice(0, 5).map((t: any) => <TicketCard key={t.id} ticket={t} onStatusChange={onStatusChange} />)
                  }
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="space-y-2">
          {tickets.length === 0
            ? <p className="text-center py-16 font-mono text-sm" style={{ color: 'rgba(255,255,255,0.2)' }}>// aucun ticket</p>
            : tickets.map((t: any) => <TicketCard key={t.id} ticket={t} onStatusChange={onStatusChange} expanded />)
          }
        </div>
      )}
    </div>
  )
}

function TicketCard({ ticket: t, onStatusChange, expanded = false }: any) {
  const tm = getTypeMeta(t.type)
  const sc = getStatusCfg(t.status)
  const isLate = t.deadline && new Date(t.deadline) < new Date()
  const PRIORITY_COLOR: Record<string, string> = { critique: '#ef4444', haute: '#f87171', moyenne: '#fbbf24', basse: '#64748b', normale: '#94a3b8' }
  const priColor = PRIORITY_COLOR[t.priority] || '#94a3b8'

  return (
    <div className="rounded-xl p-3 transition-all hover:scale-[1.005]"
      style={{ background: 'rgba(255,255,255,0.025)', border: `1px solid rgba(255,255,255,0.06)`, borderLeft: `3px solid ${tm.color}` }}>
      <div className="flex items-start gap-3">
        <span className="text-base mt-0.5 shrink-0" style={{ color: tm.color }}>{tm.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold font-mono truncate" style={{ color: '#e2e8f0' }}>{t.title}</p>
          {expanded && t.description && <p className="text-xs mt-0.5 line-clamp-2 font-mono" style={{ color: 'rgba(255,255,255,0.35)' }}>{t.description}</p>}
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className="text-[10px] font-mono uppercase" style={{ color: tm.color }}>{t.type}</span>
            {t.dev_projects?.name && <span className="text-[10px] font-mono" style={{ color: 'rgba(255,255,255,0.3)' }}>/ {t.dev_projects.name}</span>}
            {t.deadline && (
              <span className="text-[10px] font-mono" style={{ color: isLate ? '#f87171' : 'rgba(255,255,255,0.25)' }}>
                {isLate ? '⚠ retard' : new Date(t.deadline).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <div className="h-2 w-2 rounded-full" style={{ background: priColor }} />
          <Select value={t.status} onValueChange={v => onStatusChange(t.id, v)}>
            <SelectTrigger className="h-6 text-[10px] font-mono px-2 rounded-lg border-0 w-auto"
              style={{ background: `${sc.color}15`, color: sc.color }}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-700">
              {TICKET_STATUSES.map(s => <SelectItem key={s.value} value={s.value} className="font-mono text-xs" style={{ color: s.color }}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}

// ─── Projects Tab ─────────────────────────────────────────────────────────────
function ProjectsTab({ projects }: any) {
  const STATUS_COLOR: Record<string, string> = {
    en_cours: '#3b82f6', en_attente: '#f59e0b', termine: '#34d399',
    archive: '#64748b', bloque: '#ef4444', livre: '#10b981',
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {projects.length === 0 ? (
        <p className="col-span-3 text-center py-20 font-mono text-sm" style={{ color: 'rgba(255,255,255,0.2)' }}>// aucun projet</p>
      ) : projects.map((p: any) => {
        const sc = STATUS_COLOR[p.status] || '#64748b'
        const isLate = p.deadline && new Date(p.deadline) < new Date()
        return (
          <div key={p.id} className="rounded-2xl p-5 transition-all hover:scale-[1.01]"
            style={{ background: CARD_BG, border: `1px solid rgba(255,255,255,0.07)`, borderTop: `3px solid ${sc}` }}>
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <h3 className="font-black font-mono text-sm" style={{ color: '#f1f5f9' }}>{p.name}</h3>
                {p.client_name && <p className="text-[11px] font-mono mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>{p.client_name}</p>}
              </div>
              <span className="text-[10px] font-black font-mono px-2 py-0.5 rounded-full shrink-0"
                style={{ background: `${sc}18`, color: sc, border: `1px solid ${sc}30` }}>
                {p.status?.replace('_', ' ')}
              </span>
            </div>
            {/* Tech stack */}
            {p.tech_stack && p.tech_stack.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-3">
                {p.tech_stack.slice(0, 4).map((tech: string) => (
                  <span key={tech} className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                    style={{ background: 'rgba(16,185,129,0.08)', color: '#34d399', border: '1px solid rgba(16,185,129,0.2)' }}>
                    {tech}
                  </span>
                ))}
                {p.tech_stack.length > 4 && <span className="text-[10px] font-mono" style={{ color: 'rgba(255,255,255,0.25)' }}>+{p.tech_stack.length - 4}</span>}
              </div>
            )}
            {/* Progress */}
            {typeof p.progress === 'number' && (
              <div className="mb-3">
                <div className="flex justify-between text-[10px] font-mono mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  <span>avancement</span><span style={{ color: sc }}>{p.progress}%</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${p.progress}%`, background: `linear-gradient(90deg, ${sc}, ${sc}80)` }} />
                </div>
              </div>
            )}
            {p.deadline && (
              <p className="text-[11px] font-mono" style={{ color: isLate ? '#f87171' : 'rgba(255,255,255,0.25)' }}>
                {isLate ? '⚠ ' : ''}{new Date(p.deadline).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Bugs Tab ─────────────────────────────────────────────────────────────────
function BugsTab({ bugs, onStatusChange }: any) {
  const [filter, setFilter] = useState<string>('all')

  const filtered = filter === 'all' ? bugs : filter === 'open' ? bugs.filter((b: any) => b.status !== 'resolu') : bugs.filter((b: any) => b.status === 'resolu')

  const SEV_COLOR: Record<string, string> = { bloquant: '#ef4444', critique: '#f87171', majeur: '#f59e0b', minor: '#94a3b8' }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {[['all','Tous'], ['open','Ouverts'], ['closed','Résolus']].map(([v, l]) => (
          <button key={v} onClick={() => setFilter(v)}
            className="px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all"
            style={filter === v
              ? { background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }
              : { background: CARD_BG, color: 'rgba(255,255,255,0.35)', border: `1px solid ${CARD_BORDER}` }
            }>{l}</button>
        ))}
        <span className="ml-auto text-xs font-mono self-center" style={{ color: 'rgba(255,255,255,0.25)' }}>
          {bugs.filter((b: any) => b.status !== 'resolu').length} ouverts / {bugs.length} total
        </span>
      </div>

      <div className="space-y-2">
        {filtered.length === 0
          ? <p className="text-center py-16 font-mono text-sm" style={{ color: 'rgba(255,255,255,0.2)' }}>// aucun bug</p>
          : filtered.map((b: any) => {
          const sevColor = SEV_COLOR[b.severity] || '#94a3b8'
          const isResolved = b.status === 'resolu'
          return (
            <div key={b.id} className={cn('rounded-xl p-4 transition-all', isResolved && 'opacity-50')}
              style={{ background: CARD_BG, border: `1px solid rgba(255,255,255,0.06)`, borderLeft: `3px solid ${sevColor}` }}>
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-black font-mono px-1.5 py-0.5 rounded"
                      style={{ background: `${sevColor}15`, color: sevColor, border: `1px solid ${sevColor}25` }}>
                      {b.severity}
                    </span>
                    <h3 className="text-sm font-semibold font-mono truncate" style={{ color: '#e2e8f0' }}>{b.title}</h3>
                  </div>
                  {b.description && <p className="text-xs mt-1 line-clamp-2 font-mono" style={{ color: 'rgba(255,255,255,0.35)' }}>{b.description}</p>}
                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    {b.dev_projects?.name && <span className="text-[10px] font-mono" style={{ color: 'rgba(255,255,255,0.3)' }}>/{b.dev_projects.name}</span>}
                    {b.url && <span className="text-[10px] font-mono" style={{ color: '#60a5fa' }}>{b.url.slice(0, 30)}…</span>}
                    {b.browser && <span className="text-[10px] font-mono" style={{ color: 'rgba(255,255,255,0.25)' }}>{b.browser}</span>}
                  </div>
                </div>
                <Select value={b.status} onValueChange={v => onStatusChange(b.id, v)}>
                  <SelectTrigger className="h-7 text-[10px] font-mono px-2 rounded-lg w-28 shrink-0"
                    style={{ background: isResolved ? 'rgba(52,211,153,0.1)' : 'rgba(239,68,68,0.1)', color: isResolved ? '#34d399' : '#f87171', border: `1px solid ${isResolved ? 'rgba(52,211,153,0.25)' : 'rgba(239,68,68,0.25)'}` }}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700">
                    {['ouvert','en_cours','resolu'].map(s => <SelectItem key={s} value={s} className="font-mono text-xs">{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Deployments Tab ──────────────────────────────────────────────────────────
function DeploiementsTab({ deps }: any) {
  return (
    <div className="space-y-3">
      {/* Log header */}
      <div className="rounded-xl px-4 py-2 font-mono text-xs flex items-center gap-3" style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.15)' }}>
        <span style={{ color: '#34d399' }}>▶</span>
        <span style={{ color: 'rgba(255,255,255,0.3)' }}>deployment_history — {deps.length} entrées</span>
      </div>

      {deps.length === 0
        ? <p className="text-center py-16 font-mono text-sm" style={{ color: 'rgba(255,255,255,0.2)' }}>// aucun déploiement</p>
        : deps.map((d: any) => (
          <div key={d.id} className="rounded-xl p-4"
            style={{ background: CARD_BG, border: '1px solid rgba(255,255,255,0.06)', borderLeft: `3px solid ${d.status === 'success' ? '#34d399' : '#f87171'}` }}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <span className="text-[10px] font-black font-mono px-2 py-0.5 rounded mt-0.5 shrink-0"
                  style={d.status === 'success'
                    ? { background: 'rgba(52,211,153,0.12)', color: '#34d399', border: '1px solid rgba(52,211,153,0.25)' }
                    : { background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.25)' }
                  }>{d.version}</span>
                <div>
                  <p className="text-sm font-semibold font-mono" style={{ color: '#e2e8f0' }}>{(d.dev_projects as any)?.name || 'Projet'}</p>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    {d.url && (
                      <a href={d.url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[11px] font-mono hover:underline" style={{ color: '#60a5fa' }}>
                        <Globe className="h-3 w-3" />{d.url.replace('https://', '').slice(0, 30)}
                      </a>
                    )}
                    {d.server && <span className="text-[11px] font-mono flex items-center gap-1" style={{ color: 'rgba(255,255,255,0.3)' }}><Server className="h-3 w-3" />{d.server}</span>}
                  </div>
                  {d.notes && <p className="text-[11px] font-mono mt-1 line-clamp-1" style={{ color: 'rgba(255,255,255,0.35)' }}>{d.notes}</p>}
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[11px] font-mono" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  {new Date(d.deployed_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                </p>
                <p className="text-[10px] font-mono mt-0.5" style={{ color: 'rgba(255,255,255,0.2)' }}>
                  {new Date(d.deployed_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          </div>
        ))
      }
    </div>
  )
}

// ─── Docs Tab ─────────────────────────────────────────────────────────────────
function DocsTab({ docs }: any) {
  const [selected, setSelected] = useState<any>(null)

  const TYPE_COLOR: Record<string, string> = {
    specs: '#818cf8', api: '#34d399', serveur: '#f87171', env: '#fbbf24',
    technique: '#60a5fa', autre: '#94a3b8',
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      <div className="lg:col-span-4 space-y-2">
        {docs.length === 0
          ? <p className="text-center py-16 font-mono text-sm" style={{ color: 'rgba(255,255,255,0.2)' }}>// aucune doc</p>
          : docs.map((d: any) => {
          const tc = TYPE_COLOR[d.type] || '#94a3b8'
          return (
            <button key={d.id} onClick={() => setSelected(d)} className="w-full text-left rounded-xl p-3.5 transition-all hover:scale-[1.01]"
              style={{
                background: selected?.id === d.id ? `${tc}12` : CARD_BG,
                border: `1px solid ${selected?.id === d.id ? `${tc}40` : CARD_BORDER}`,
              }}>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black font-mono px-1.5 py-0.5 rounded"
                  style={{ background: `${tc}15`, color: tc, border: `1px solid ${tc}25` }}>
                  {d.type}
                </span>
                <p className="text-sm font-semibold font-mono truncate" style={{ color: '#e2e8f0' }}>{d.title}</p>
              </div>
              {d.dev_projects?.name && <p className="text-[10px] font-mono mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>/{d.dev_projects.name}</p>}
            </button>
          )
        })}
      </div>

      <div className="lg:col-span-8">
        {selected ? (
          <div className="rounded-2xl p-5 h-full" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-black font-mono" style={{ color: '#f1f5f9' }}>{selected.title}</h2>
                <p className="text-[11px] font-mono mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  {selected.dev_projects?.name || 'Global'} · {selected.type}
                </p>
              </div>
              <button onClick={() => setSelected(null)}><X className="h-4 w-4" style={{ color: 'rgba(255,255,255,0.3)' }} /></button>
            </div>
            {selected.content ? (
              <pre className="text-sm font-mono leading-relaxed whitespace-pre-wrap" style={{ color: 'rgba(255,255,255,0.7)', background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                {selected.content}
              </pre>
            ) : (
              <p className="text-sm font-mono text-center py-12" style={{ color: 'rgba(255,255,255,0.2)' }}>// contenu vide</p>
            )}
          </div>
        ) : (
          <div className="rounded-2xl py-24 flex flex-col items-center justify-center" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
            <BookOpen className="h-10 w-10 mb-3" style={{ color: 'rgba(255,255,255,0.1)' }} />
            <p className="text-sm font-mono" style={{ color: 'rgba(255,255,255,0.2)' }}>// sélectionner un doc</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── KPIs Tab ─────────────────────────────────────────────────────────────────
function KpisTab({ tickets, bugs, deps, projects }: any) {
  const total    = tickets.length
  const done     = tickets.filter((t: any) => t.status === 'deploye' || t.status === 'termine').length
  const inReview = tickets.filter((t: any) => t.status === 'code_review').length
  const late     = tickets.filter((t: any) => t.deadline && new Date(t.deadline) < new Date() && !['deploye','termine'].includes(t.status)).length
  const bugsOpen = bugs.filter((b: any) => b.status !== 'resolu').length
  const bugsDone = bugs.filter((b: any) => b.status === 'resolu').length
  const bugRate  = bugs.length > 0 ? Math.round((bugsDone / bugs.length) * 100) : 0
  const v1Rate   = total > 0 ? Math.round((done / total) * 100) : 0
  const deploys  = deps.filter((d: any) => d.status === 'success').length

  const byType = TICKET_TYPES.map(t => ({
    ...t,
    count: tickets.filter((tk: any) => tk.type === t.value).length,
  })).filter(t => t.count > 0).sort((a, b) => b.count - a.count)

  const kpiRows = [
    { label: 'Tickets résolus',        value: done,     total, suffix: ` / ${total}`, color: '#34d399' },
    { label: 'Taux de complétion',      value: v1Rate,   total: 100, suffix: '%',      color: '#3b82f6' },
    { label: 'Bugs résolus',            value: bugsDone, total: bugs.length, suffix: ` / ${bugs.length}`, color: '#f87171' },
    { label: 'Taux résolution bugs',    value: bugRate,  total: 100, suffix: '%',      color: '#f59e0b' },
    { label: 'En code review',          value: inReview, total,      suffix: ` / ${total}`, color: '#a855f7' },
    { label: 'Déploiements réussis',    value: deploys,  total: deps.length, suffix: ` / ${deps.length}`, color: '#6366f1' },
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {kpiRows.map(k => (
          <div key={k.label} className="rounded-2xl p-5" style={{ background: CARD_BG, border: `1px solid rgba(255,255,255,0.07)` }}>
            <p className="text-[11px] font-mono uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.3)' }}>{k.label}</p>
            <p className="text-3xl font-black font-mono tabular-nums" style={{ color: k.color }}>{k.value}{k.suffix}</p>
            <div className="mt-3 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
              <div className="h-full rounded-full" style={{ width: `${k.total > 0 ? (k.value / k.total) * 100 : 0}%`, background: `linear-gradient(90deg, ${k.color}, ${k.color}80)` }} />
            </div>
          </div>
        ))}
      </div>

      {/* Par type de ticket */}
      <div className="rounded-2xl p-5" style={{ background: CARD_BG, border: `1px solid rgba(255,255,255,0.07)` }}>
        <p className="text-[11px] font-mono uppercase tracking-widest mb-4" style={{ color: 'rgba(255,255,255,0.3)' }}>// tickets par type</p>
        <div className="space-y-3">
          {byType.map(t => (
            <div key={t.value}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-mono flex items-center gap-2" style={{ color: t.color }}><span>{t.icon}</span>{t.label}</span>
                <span className="text-xs font-mono font-bold" style={{ color: 'rgba(255,255,255,0.4)' }}>{t.count}</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <div className="h-full rounded-full" style={{ width: `${total > 0 ? (t.count / total) * 100 : 0}%`, background: t.color }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Alertes */}
      {(late > 0 || bugsOpen > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {late > 0 && (
            <div className="rounded-2xl p-4 flex items-center gap-3" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <AlertCircle className="h-5 w-5 shrink-0" style={{ color: '#f87171' }} />
              <div>
                <p className="text-sm font-black font-mono" style={{ color: '#fca5a5' }}>{late} ticket{late > 1 ? 's' : ''} en retard</p>
                <p className="text-[11px] font-mono" style={{ color: 'rgba(255,255,255,0.3)' }}>deadline dépassée</p>
              </div>
            </div>
          )}
          {bugsOpen > 0 && (
            <div className="rounded-2xl p-4 flex items-center gap-3" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
              <Bug className="h-5 w-5 shrink-0" style={{ color: '#fbbf24' }} />
              <div>
                <p className="text-sm font-black font-mono" style={{ color: '#fde68a' }}>{bugsOpen} bug{bugsOpen > 1 ? 's' : ''} ouvert{bugsOpen > 1 ? 's' : ''}</p>
                <p className="text-[11px] font-mono" style={{ color: 'rgba(255,255,255,0.3)' }}>à résoudre</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
