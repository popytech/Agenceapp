'use client'
// v5 - dark/light adaptive
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import {
  Lightbulb, FileText, Camera, Upload, BarChart2, Library,
  Plus, X, Check, Clock, AlertCircle, Pen, Film, Mic, Image,
  CheckCircle2, Send, ThumbsUp, MessageSquare, RefreshCw,
  Flame, TrendingUp, Eye, AlertTriangle, Bell
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { format, isToday, isBefore, startOfDay, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'

// ─── TYPES ───────────────────────────────────────────────────────────────────
type Idea = {
  id: string
  title: string
  category: string
  hook: string | null
  platform: string
  status: string
  idea_status: string | null
  content_type: string | null
  notes: string | null
  created_at: string
  publish_date: string | null
  validation_status: string | null
  views_target: number | null
  created_by: string | null
  project_id: string | null
  rejection_note: string | null
  publication_objective: number | null
  client_id: string | null
}

type Script = {
  id: string
  content_id: string
  hook: string | null
  body: string | null
  cta: string | null
  visual_notes: string | null
  editing_instructions: string | null
  version: string
  created_at: string
  updated_at: string
}

type Production = {
  id: string
  content_id: string
  file_url: string | null
  file_type: string | null
  status: string
  uploaded_at: string
}

type Feedback = {
  id: string
  content_id: string
  production_id: string | null
  comment: string
  approved: boolean
  reviewer_role: string | null
  created_at: string
}

// ─── CONSTANTES ──────────────────────────────────────────────────────────────
const CONTENT_TYPES = ['Reel', 'Story', 'Carrousel', 'Podcast', 'YouTube Shorts', 'TikTok', 'Article']
const PLATFORMS = ['Instagram', 'TikTok', 'YouTube', 'Facebook', 'LinkedIn', 'Podcast']
const CATEGORIES = ['Éducatif', 'Vente', 'Storytelling', 'Branding', 'Divertissement']
const IDEA_STATUSES = [
  { key: 'brouillon', label: 'Brouillon', color: '#6b7280', bg: 'rgba(107,114,128,0.15)' },
  { key: 'validee', label: 'Validée', color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
  { key: 'en_production', label: 'En production', color: '#6366f1', bg: 'rgba(99,102,241,0.15)' },
  { key: 'abandonnee', label: 'Abandonnée', color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
]
const PROD_STATUSES = [
  { key: 'a_produire', label: 'À produire', color: '#6b7280' },
  { key: 'en_production', label: 'En production', color: '#f59e0b' },
  { key: 'en_revision', label: 'En révision', color: '#6366f1' },
  { key: 'valide', label: 'Validé', color: '#10b981' },
]
const SCRIPT_VERSIONS = ['V1', 'V2', 'Final']

const PIPELINE_COLS = [
  { key: 'idea', label: 'Idée', color: '#6366f1', icon: Lightbulb },
  { key: 'script_en_cours', label: 'Script en cours', color: '#f59e0b', icon: Pen },
  { key: 'script_valide', label: 'Script validé', color: '#10b981', icon: Check },
  { key: 'tournage', label: 'Tournage', color: '#ef4444', icon: Camera },
  { key: 'montage', label: 'En montage', color: '#8b5cf6', icon: Film },
  { key: 'validation', label: 'En validation', color: '#f97316', icon: Eye },
  { key: 'final', label: 'Final', color: '#06b6d4', icon: CheckCircle2 },
]

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function ideaStatusStyle(key: string) {
  return IDEA_STATUSES.find(s => s.key === key) || IDEA_STATUSES[0]
}

function platIcon(p: string) {
  const map: Record<string, string> = {
    Instagram: '📸', TikTok: '🎵', YouTube: '▶️', 'YouTube Shorts': '▶️',
    Facebook: '📘', LinkedIn: '💼', Podcast: '🎙️'
  }
  return map[p] || '📱'
}

// ─── SHARED CLASSES ───────────────────────────────────────────────────────────
const card = 'rounded-2xl border border-gray-200 dark:border-white/8 bg-white dark:bg-white/4 transition-all'
const cardHover = 'rounded-2xl border border-gray-200 dark:border-white/8 bg-white dark:bg-white/4 hover:border-indigo-200 dark:hover:border-white/14 transition-all'
const inputCls = 'w-full bg-gray-50 dark:bg-white/6 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/30 focus:outline-none focus:border-indigo-400 dark:focus:border-indigo-500/50'
const selectCls = 'bg-gray-50 dark:bg-white/6 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm text-gray-700 dark:text-white/60 focus:outline-none'
const textMuted = 'text-gray-500 dark:text-white/40'
const textBase = 'text-gray-900 dark:text-white'
const textSub = 'text-gray-400 dark:text-white/30'

// ─── COMPOSANT BADGE ─────────────────────────────────────────────────────────
function Badge({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ color, background: bg }}>
      {label}
    </span>
  )
}

// ─── KPI CARD ────────────────────────────────────────────────────────────────
function KpiCard({ label, value, icon: Icon, color, sub, urgent }: any) {
  return (
    <div className={cn(
      'rounded-2xl border p-5 flex items-start gap-4 transition-all',
      urgent
        ? 'border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/8'
        : 'border-gray-200 dark:border-white/8 bg-white dark:bg-white/4'
    )}>
      <div className="p-2.5 rounded-xl shrink-0" style={{ background: color + '20' }}>
        <Icon className="h-5 w-5" style={{ color }} />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
        <p className={cn('text-xs mt-0.5', textMuted)}>{label}</p>
        {sub && <p className="text-xs mt-1" style={{ color }}>{sub}</p>}
      </div>
    </div>
  )
}

// ─── TAB BTN ─────────────────────────────────────────────────────────────────
function TabBtn({ active, onClick, icon: Icon, label, count, urgent }: any) {
  return (
    <button onClick={onClick} className={cn(
      'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all border whitespace-nowrap',
      active
        ? 'bg-indigo-50 dark:bg-indigo-500/20 border-indigo-300 dark:border-indigo-500/50 text-indigo-600 dark:text-indigo-300'
        : 'border-gray-200 dark:border-white/8 text-gray-500 dark:text-white/50 hover:text-gray-800 dark:hover:text-white/80 hover:border-gray-300 dark:hover:border-white/14 bg-white dark:bg-transparent'
    )}>
      <Icon className="h-4 w-4" />
      <span>{label}</span>
      {count !== undefined && count > 0 && (
        <span className={cn('text-xs px-1.5 py-0.5 rounded-full font-semibold',
          urgent ? 'bg-red-100 dark:bg-red-500/30 text-red-600 dark:text-red-300'
            : active ? 'bg-indigo-100 dark:bg-indigo-500/30 text-indigo-600 dark:text-indigo-300'
            : 'bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-white/50'
        )}>
          {count}
        </span>
      )}
    </button>
  )
}

// ─── MODAL SCRIPT ────────────────────────────────────────────────────────────
function ScriptModal({ idea, onClose, onSaved }: { idea: Idea; onClose: () => void; onSaved: () => void }) {
  const [scripts, setScripts] = useState<Script[]>([])
  const [active, setActive] = useState<Script | null>(null)
  const [form, setForm] = useState({ hook: '', body: '', cta: '', visual_notes: '', editing_instructions: '', version: 'V1' })
  const [saving, setSaving] = useState(false)
  const [isNew, setIsNew] = useState(false)

  useEffect(() => {
    supabase.from('scripts').select('*').eq('content_id', idea.id).order('created_at').then(({ data }) => {
      if (data && data.length > 0) {
        setScripts(data); setActive(data[data.length - 1])
        setForm({ hook: data[data.length - 1].hook || '', body: data[data.length - 1].body || '', cta: data[data.length - 1].cta || '', visual_notes: data[data.length - 1].visual_notes || '', editing_instructions: data[data.length - 1].editing_instructions || '', version: data[data.length - 1].version })
      } else { setIsNew(true) }
    })
  }, [idea.id])

  function selectScript(s: Script) { setActive(s); setIsNew(false); setForm({ hook: s.hook || '', body: s.body || '', cta: s.cta || '', visual_notes: s.visual_notes || '', editing_instructions: s.editing_instructions || '', version: s.version }) }

  async function save() {
    setSaving(true)
    if (isNew || !active) {
      const { data } = await supabase.from('scripts').insert({ content_id: idea.id, ...form, updated_at: new Date().toISOString() }).select().single()
      if (data) { setScripts(p => [...p, data]); setActive(data); setIsNew(false) }
    } else {
      await supabase.from('scripts').update({ ...form, updated_at: new Date().toISOString() }).eq('id', active.id)
    }
    setSaving(false)
    onSaved()
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-[#0f1117] border border-gray-200 dark:border-white/10 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-white/8">
          <div>
            <h2 className={cn('font-bold text-lg', textBase)}>Script — {idea.title}</h2>
            <p className={cn('text-xs mt-0.5', textMuted)}>Rédige ton script complet sans quitter l'app</p>
          </div>
          <div className="flex items-center gap-2">
            {scripts.length > 0 && (
              <div className="flex gap-1">
                {scripts.map(s => (
                  <button key={s.id} onClick={() => selectScript(s)} className={cn('text-xs px-2.5 py-1 rounded-lg border transition-all',
                    active?.id === s.id
                      ? 'bg-indigo-50 dark:bg-indigo-500/20 border-indigo-300 dark:border-indigo-500/50 text-indigo-600 dark:text-indigo-300'
                      : 'border-gray-200 dark:border-white/10 text-gray-500 dark:text-white/50 hover:text-gray-800 dark:hover:text-white/80'
                  )}>
                    {s.version}
                  </button>
                ))}
              </div>
            )}
            <button
              onClick={() => { setIsNew(true); setActive(null); setForm({ hook: '', body: '', cta: '', visual_notes: '', editing_instructions: '', version: scripts.length === 0 ? 'V1' : scripts.length === 1 ? 'V2' : 'Final' }) }}
              className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-white/6 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-white/60 hover:text-gray-900 dark:hover:text-white transition-all"
            >
              + Nouvelle version
            </button>
            <button onClick={onClose}><X className="h-5 w-5 text-gray-400 dark:text-white/40" /></button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div>
            <label className={cn('text-xs mb-1.5 block font-medium uppercase tracking-wide', textMuted)}>Version</label>
            <div className="flex gap-2">
              {SCRIPT_VERSIONS.map(v => (
                <button key={v} onClick={() => setForm(f => ({ ...f, version: v }))} className={cn('text-sm px-3 py-1.5 rounded-lg border transition-all',
                  form.version === v
                    ? 'bg-indigo-50 dark:bg-indigo-500/20 border-indigo-300 dark:border-indigo-500/50 text-indigo-600 dark:text-indigo-300'
                    : 'border-gray-200 dark:border-white/10 text-gray-400 dark:text-white/40 hover:text-gray-700 dark:hover:text-white/70'
                )}>
                  {v}
                </button>
              ))}
            </div>
          </div>
          {[
            { key: 'hook', label: '🎣 Hook', placeholder: 'La première phrase qui accroche...', rows: 2 },
            { key: 'body', label: '📝 Corps du script', placeholder: 'Développe ton message principal...', rows: 5 },
            { key: 'cta', label: '🎯 Call to Action', placeholder: "Qu'est-ce que tu veux que les gens fassent ?", rows: 2 },
            { key: 'visual_notes', label: '🎬 Notes visuelles', placeholder: 'Décors, tenues, ambiance...', rows: 2 },
            { key: 'editing_instructions', label: '✂️ Instructions montage', placeholder: 'Transitions, musique, effets...', rows: 2 },
          ].map(({ key, label, placeholder, rows }) => (
            <div key={key}>
              <label className={cn('text-xs mb-1.5 block font-medium', textMuted)}>{label}</label>
              <textarea
                rows={rows}
                value={(form as any)[key]}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                placeholder={placeholder}
                className={cn(inputCls, 'resize-none')}
              />
            </div>
          ))}
        </div>
        <div className="p-5 border-t border-gray-100 dark:border-white/8 flex justify-end gap-3">
          <button onClick={onClose} className={cn('px-4 py-2 rounded-xl text-sm transition-all', textMuted, 'hover:text-gray-900 dark:hover:text-white')}>Annuler</button>
          <button onClick={save} disabled={saving} className="px-5 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium transition-all disabled:opacity-50 flex items-center gap-2">
            {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Sauvegarder
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── MODAL AJOUT IDÉE ────────────────────────────────────────────────────────
function AddIdeaModal({ onClose, onSaved, projects, clients }: { onClose: () => void; onSaved: () => void; projects: any[]; clients: any[] }) {
  const { profile } = useAuth()
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('Éducatif')
  const [platform, setPlatform] = useState('Instagram')
  const [contentType, setContentType] = useState('Reel')
  const [hook, setHook] = useState('')
  const [notes, setNotes] = useState('')
  const [publishDate, setPublishDate] = useState('')
  const [projectId, setProjectId] = useState('')
  const [clientId, setClientId] = useState('')
  const [ideaStatus, setIdeaStatus] = useState('brouillon')
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!title.trim()) return
    setSaving(true)
    await supabase.from('content_ideas').insert({
      title: title.trim(), category, platform, content_type: contentType,
      hook: hook.trim() || null, notes: notes.trim() || null,
      publish_date: publishDate || null, status: 'idea',
      idea_status: ideaStatus,
      project_id: projectId || null, client_id: clientId || null,
      created_by: profile?.id || null, validation_status: null,
    })
    setSaving(false)
    onSaved()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-[#0f1117] border border-gray-200 dark:border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-white/8">
          <h2 className={cn('font-bold text-lg', textBase)}>Nouvelle idée</h2>
          <button onClick={onClose}><X className="h-5 w-5 text-gray-400 dark:text-white/40" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className={cn('text-xs mb-1.5 block', textMuted)}>Titre *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Comment j'ai doublé mon engagement en 30 jours" className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={cn('text-xs mb-1.5 block', textMuted)}>Format</label>
              <select value={contentType} onChange={e => setContentType(e.target.value)} className={cn(selectCls, 'w-full')}>
                {CONTENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className={cn('text-xs mb-1.5 block', textMuted)}>Plateforme</label>
              <select value={platform} onChange={e => setPlatform(e.target.value)} className={cn(selectCls, 'w-full')}>
                {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={cn('text-xs mb-1.5 block', textMuted)}>Catégorie</label>
              <select value={category} onChange={e => setCategory(e.target.value)} className={cn(selectCls, 'w-full')}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className={cn('text-xs mb-1.5 block', textMuted)}>Statut idée</label>
              <select value={ideaStatus} onChange={e => setIdeaStatus(e.target.value)} className={cn(selectCls, 'w-full')}>
                {IDEA_STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className={cn('text-xs mb-1.5 block', textMuted)}>Hook (accroche)</label>
            <input value={hook} onChange={e => setHook(e.target.value)} placeholder="La première phrase qui va accrocher..." className={inputCls} />
          </div>
          <div>
            <label className={cn('text-xs mb-1.5 block', textMuted)}>Notes</label>
            <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Inspirations, références, contexte..." className={cn(inputCls, 'resize-none')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={cn('text-xs mb-1.5 block', textMuted)}>Date de publication</label>
              <input type="date" value={publishDate} onChange={e => setPublishDate(e.target.value)} className={cn(selectCls, 'w-full')} />
            </div>
            {clients.length > 0 && (
              <div>
                <label className={cn('text-xs mb-1.5 block', textMuted)}>Client</label>
                <select value={clientId} onChange={e => setClientId(e.target.value)} className={cn(selectCls, 'w-full')}>
                  <option value="">Aucun</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )}
          </div>
          {projects.length > 0 && (
            <div>
              <label className={cn('text-xs mb-1.5 block', textMuted)}>Lier à un projet</label>
              <select value={projectId} onChange={e => setProjectId(e.target.value)} className={cn(selectCls, 'w-full')}>
                <option value="">Aucun projet</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
            </div>
          )}
        </div>
        <div className="p-5 border-t border-gray-100 dark:border-white/8 flex justify-end gap-3">
          <button onClick={onClose} className={cn('px-4 py-2 rounded-xl text-sm transition-all', textMuted, 'hover:text-gray-900 dark:hover:text-white')}>Annuler</button>
          <button onClick={save} disabled={saving || !title.trim()} className="px-5 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium transition-all disabled:opacity-50 flex items-center gap-2">
            {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Lightbulb className="h-4 w-4" />}
            Ajouter l'idée
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── BLOC 1 : DASHBOARD PRINCIPAL ────────────────────────────────────────────
function DashboardPrincipal({ ideas, productions, feedbacks }: { ideas: Idea[]; productions: Production[]; feedbacks: Feedback[] }) {
  const today = startOfDay(new Date())
  const thisMonth = new Date().getMonth()

  const todayContents = ideas.filter(i => i.publish_date && isToday(parseISO(i.publish_date)))
  const urgentDeadlines = ideas.filter(i => {
    if (!i.publish_date) return false
    const d = parseISO(i.publish_date)
    return isBefore(d, new Date(today.getTime() + 3 * 86400000)) && i.status !== 'final' && !isBefore(d, today)
  })
  const pendingScripts = ideas.filter(i => i.status === 'idea' || i.status === 'script_en_cours')
  const pendingValidation = ideas.filter(i => i.validation_status === 'pending_review')
  const approved = ideas.filter(i => i.validation_status === 'approved')
  const rejected = ideas.filter(i => i.validation_status === 'rejected')

  const publishedThisMonth = ideas.filter(i => {
    if (!i.publish_date) return false
    try { return parseISO(i.publish_date).getMonth() === thisMonth && i.status === 'final' } catch { return false }
  })

  const totalObjective = ideas.reduce((sum, i) => sum + (i.publication_objective || 0), 0) || 12
  const productivityScore = Math.min(100, Math.round((publishedThisMonth.length / totalObjective) * 100))

  return (
    <div className="space-y-6">
      {/* Alertes */}
      {rejected.length > 0 && (
        <div className="rounded-2xl border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/8 p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-500 dark:text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-red-700 dark:text-red-300 font-semibold text-sm">{rejected.length} contenu{rejected.length > 1 ? 's' : ''} refusé{rejected.length > 1 ? 's' : ''} — à retravailler</p>
            <div className="mt-1.5 space-y-0.5">
              {rejected.map(i => (
                <p key={i.id} className="text-xs text-red-500 dark:text-red-400/70">• {i.title} {i.rejection_note ? `— "${i.rejection_note}"` : ''}</p>
              ))}
            </div>
          </div>
        </div>
      )}
      {approved.filter(i => {
        try { const d = new Date(i.publish_date || ''); return d.getMonth() === thisMonth } catch { return false }
      }).length > 0 && (
        <div className="rounded-2xl border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/8 p-4 flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <p className="text-emerald-700 dark:text-emerald-300 text-sm font-medium">{approved.length} contenu{approved.length > 1 ? 's' : ''} validé{approved.length > 1 ? 's' : ''} — prêt à publier ✨</p>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KpiCard label="À produire aujourd'hui" value={todayContents.length} icon={Flame} color="#ef4444" urgent={todayContents.length > 0} />
        <KpiCard label="Deadlines < 3 jours" value={urgentDeadlines.length} icon={Clock} color="#f59e0b" urgent={urgentDeadlines.length > 0} />
        <KpiCard label="Scripts à rédiger" value={pendingScripts.length} icon={Pen} color="#6366f1" />
        <KpiCard label="En attente validation" value={pendingValidation.length} icon={Eye} color="#f97316" />
        <KpiCard label="Validés" value={approved.length} icon={ThumbsUp} color="#10b981" />
        <KpiCard label="Score semaine" value={`${productivityScore}%`} icon={TrendingUp} color="#06b6d4" sub={`${publishedThisMonth.length} / ${totalObjective} publiés`} />
      </div>

      {/* Barre de progression mensuelle */}
      <div className={cn(card, 'p-5')}>
        <div className="flex items-center justify-between mb-3">
          <p className={cn('text-sm font-semibold', textBase)}>Objectif mensuel</p>
          <p className={cn('text-sm', textMuted)}>{publishedThisMonth.length} / {totalObjective} contenus</p>
        </div>
        <div className="w-full h-2.5 bg-gray-100 dark:bg-white/8 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${productivityScore}%`, background: productivityScore >= 80 ? '#10b981' : productivityScore >= 50 ? '#f59e0b' : '#ef4444' }} />
        </div>
        <p className={cn('text-xs mt-2', textSub)}>{productivityScore >= 80 ? 'Excellent rythme ✨' : productivityScore >= 50 ? 'Continue comme ça !' : 'Accelère le rythme 🔥'}</p>
      </div>

      {/* Contenus à faire aujourd'hui + urgents */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className={cn(card, 'p-5')}>
          <h3 className={cn('text-sm font-semibold mb-3 flex items-center gap-2', textBase)}>
            <Flame className="h-4 w-4 text-orange-400" /> Aujourd'hui
          </h3>
          {todayContents.length === 0 ? (
            <p className={cn(textMuted, 'text-sm')}>Aucun contenu prévu aujourd'hui</p>
          ) : (
            <div className="space-y-2">
              {todayContents.map(i => (
                <div key={i.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-white/4 rounded-xl border border-gray-100 dark:border-white/6">
                  <span className="text-lg">{platIcon(i.platform)}</span>
                  <div className="min-w-0 flex-1">
                    <p className={cn('text-sm font-medium truncate', textBase)}>{i.title}</p>
                    <p className={cn('text-xs', textMuted)}>{i.content_type || 'Contenu'}</p>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ color: PIPELINE_COLS.find(c => c.key === i.status)?.color || '#6b7280', background: (PIPELINE_COLS.find(c => c.key === i.status)?.color || '#6b7280') + '20' }}>
                    {PIPELINE_COLS.find(c => c.key === i.status)?.label || i.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className={cn(card, 'p-5')}>
          <h3 className={cn('text-sm font-semibold mb-3 flex items-center gap-2', textBase)}>
            <AlertCircle className="h-4 w-4 text-amber-400" /> Deadlines urgentes
          </h3>
          {urgentDeadlines.length === 0 ? (
            <p className={cn(textMuted, 'text-sm')}>Aucune deadline urgente</p>
          ) : (
            <div className="space-y-2">
              {urgentDeadlines.map(i => (
                <div key={i.id} className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-500/5 rounded-xl border border-amber-100 dark:border-amber-500/20">
                  <span className="text-lg">{platIcon(i.platform)}</span>
                  <div className="min-w-0 flex-1">
                    <p className={cn('text-sm font-medium truncate', textBase)}>{i.title}</p>
                    <p className="text-xs text-amber-600 dark:text-amber-400">{i.publish_date ? format(parseISO(i.publish_date), 'dd MMM', { locale: fr }) : ''}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── BLOC 2 : MODULE IDÉATION ─────────────────────────────────────────────────
function ModuleIdeation({ ideas, onAdd, onUpdate, onOpenScript, projects, clients }: any) {
  const [showAdd, setShowAdd] = useState(false)
  const [filter, setFilter] = useState<string>('all')
  const [platFilter, setPlatFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')

  const filtered = ideas.filter((i: Idea) => {
    const byStatus = filter === 'all' || i.idea_status === filter
    const byPlat = platFilter === 'all' || i.platform === platFilter
    const byType = typeFilter === 'all' || i.content_type === typeFilter
    return byStatus && byPlat && byType
  })

  async function updateIdeaStatus(id: string, idea_status: string) {
    await supabase.from('content_ideas').update({ idea_status }).eq('id', id)
    onUpdate()
  }

  return (
    <div className="space-y-5">
      {showAdd && <AddIdeaModal onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); onUpdate() }} projects={projects} clients={clients} />}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {[{ key: 'all', label: 'Toutes' }, ...IDEA_STATUSES].map(s => (
            <button key={s.key} onClick={() => setFilter(s.key)} className={cn('text-xs px-3 py-1.5 rounded-lg border transition-all',
              filter === s.key
                ? 'bg-indigo-50 dark:bg-indigo-500/20 border-indigo-300 dark:border-indigo-500/40 text-indigo-600 dark:text-indigo-300'
                : 'border-gray-200 dark:border-white/8 text-gray-500 dark:text-white/40 hover:text-gray-800 dark:hover:text-white/70 bg-white dark:bg-transparent'
            )}>
              {'label' in s ? s.label : 'Toutes'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <select value={platFilter} onChange={e => setPlatFilter(e.target.value)} className={selectCls}>
            <option value="all">Toutes plateformes</option>
            {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className={selectCls}>
            <option value="all">Tous formats</option>
            {CONTENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium transition-all">
            <Plus className="h-4 w-4" /> Nouvelle idée
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <Lightbulb className="h-10 w-10 text-gray-300 dark:text-white/20 mx-auto mb-3" />
          <p className={cn(textMuted, 'text-sm')}>Aucune idée dans cette catégorie</p>
          <button onClick={() => setShowAdd(true)} className="mt-3 text-indigo-500 dark:text-indigo-400 text-sm hover:text-indigo-600 dark:hover:text-indigo-300 transition-all">+ Ajouter une idée</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((idea: Idea) => {
            const st = ideaStatusStyle(idea.idea_status || 'brouillon')
            return (
              <div key={idea.id} className={cn(cardHover, 'p-4 flex flex-col gap-3 group')}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{platIcon(idea.platform)}</span>
                    <div className="min-w-0">
                      <p className={cn('text-sm font-semibold leading-tight', textBase)}>{idea.title}</p>
                      <p className={cn('text-xs mt-0.5', textSub)}>{idea.content_type || 'Contenu'} · {idea.category}</p>
                    </div>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full shrink-0 font-medium" style={{ color: st.color, background: st.bg }}>{st.label}</span>
                </div>

                {idea.hook && (
                  <p className="text-xs text-gray-500 dark:text-white/50 italic border-l-2 border-indigo-400/40 pl-2">"{idea.hook}"</p>
                )}

                <div className="flex items-center justify-between mt-auto">
                  <div className="flex items-center gap-1.5">
                    {idea.publish_date && (
                      <span className={cn('text-xs', textSub)}>{format(parseISO(idea.publish_date), 'dd MMM', { locale: fr })}</span>
                    )}
                    {idea.client_id && <span className="text-xs px-1.5 py-0.5 bg-gray-100 dark:bg-white/5 rounded text-gray-500 dark:text-white/30">Client</span>}
                    {idea.project_id && <span className="text-xs px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-500/10 rounded text-indigo-600 dark:text-indigo-400">Projet</span>}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <button onClick={() => onOpenScript(idea)} className="text-xs px-2.5 py-1 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg text-gray-600 dark:text-white/50 hover:text-gray-900 dark:hover:text-white transition-all flex items-center gap-1">
                      <FileText className="h-3 w-3" /> Script
                    </button>
                    <select value={idea.idea_status || 'brouillon'} onChange={e => updateIdeaStatus(idea.id, e.target.value)} className="text-xs bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-2 py-1 text-gray-600 dark:text-white/50 focus:outline-none">
                      {IDEA_STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── BLOC 3 : MODULE SCRIPTING ───────────────────────────────────────────────
function ModuleScripting({ ideas, onOpenScript }: { ideas: Idea[]; onOpenScript: (i: Idea) => void }) {
  const [scripts, setScripts] = useState<(Script & { idea_title: string })[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (ideas.length === 0) { setLoading(false); return }
    const ideaMap: Record<string, string> = {}
    ideas.forEach(i => { ideaMap[i.id] = i.title })
    supabase.from('scripts').select('*').in('content_id', ideas.map(i => i.id)).order('updated_at', { ascending: false }).then(({ data }) => {
      setScripts((data || []).map(s => ({ ...s, idea_title: ideaMap[s.content_id] || 'Sans titre' })))
      setLoading(false)
    })
  }, [ideas])

  const ideasWithoutScript = ideas.filter(i => !scripts.find(s => s.content_id === i.id))

  return (
    <div className="space-y-5">
      {ideasWithoutScript.length > 0 && (
        <div className="rounded-2xl border border-amber-200 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-500/5 p-4">
          <p className="text-amber-700 dark:text-amber-300 text-sm font-medium mb-2">{ideasWithoutScript.length} idée{ideasWithoutScript.length > 1 ? 's' : ''} sans script</p>
          <div className="flex flex-wrap gap-2">
            {ideasWithoutScript.slice(0, 5).map(i => (
              <button key={i.id} onClick={() => onOpenScript(i)} className="text-xs px-3 py-1.5 bg-amber-100 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-lg text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-500/20 transition-all flex items-center gap-1.5">
                <Pen className="h-3 w-3" /> {i.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-10"><RefreshCw className="h-6 w-6 animate-spin text-gray-300 dark:text-white/20 mx-auto" /></div>
      ) : scripts.length === 0 ? (
        <div className="text-center py-16">
          <FileText className="h-10 w-10 text-gray-300 dark:text-white/20 mx-auto mb-3" />
          <p className={cn(textMuted, 'text-sm')}>Aucun script rédigé</p>
          <p className={cn(textSub, 'text-xs mt-1')}>Ouvre une idée et clique sur "Script" pour commencer</p>
        </div>
      ) : (
        <div className="space-y-3">
          {scripts.map(s => (
            <div key={s.id} className={cn(cardHover, 'p-4 group')}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className={cn('text-sm font-semibold', textBase)}>{s.idea_title}</p>
                  <p className={cn('text-xs mt-0.5', textMuted)}>Dernière modif. {format(new Date(s.updated_at), 'dd MMM yyyy', { locale: fr })} · Version {s.version}</p>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 font-medium">{s.version}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {s.hook && (
                  <div className="bg-gray-50 dark:bg-white/4 rounded-xl p-3">
                    <p className={cn('text-xs mb-1', textSub)}>🎣 Hook</p>
                    <p className={cn('text-xs line-clamp-2', textMuted)}>{s.hook}</p>
                  </div>
                )}
                {s.body && (
                  <div className="bg-gray-50 dark:bg-white/4 rounded-xl p-3">
                    <p className={cn('text-xs mb-1', textSub)}>📝 Corps</p>
                    <p className={cn('text-xs line-clamp-2', textMuted)}>{s.body}</p>
                  </div>
                )}
                {s.cta && (
                  <div className="bg-gray-50 dark:bg-white/4 rounded-xl p-3">
                    <p className={cn('text-xs mb-1', textSub)}>🎯 CTA</p>
                    <p className={cn('text-xs line-clamp-2', textMuted)}>{s.cta}</p>
                  </div>
                )}
              </div>
              <button onClick={() => { const idea = ideas.find(i => i.id === s.content_id); if (idea) onOpenScript(idea) }} className="mt-3 text-xs text-indigo-500 dark:text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 transition-all opacity-0 group-hover:opacity-100">
                Modifier le script →
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── BLOC 4 : MODULE PRODUCTION ───────────────────────────────────────────────
function ModuleProduction({ ideas, onUpdate }: { ideas: Idea[]; onUpdate: () => void }) {
  const [productions, setProductions] = useState<(Production & { idea_title: string })[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (ideas.length === 0) { setLoading(false); return }
    const ideaMap: Record<string, string> = {}
    ideas.forEach(i => { ideaMap[i.id] = i.title })
    supabase.from('productions').select('*').in('content_id', ideas.map(i => i.id)).order('uploaded_at', { ascending: false }).then(({ data }) => {
      setProductions((data || []).map(p => ({ ...p, idea_title: ideaMap[p.content_id] || 'Sans titre' })))
      setLoading(false)
    })
  }, [ideas])

  async function updateProdStatus(id: string, status: string) {
    await supabase.from('productions').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
    setProductions(p => p.map(pr => pr.id === id ? { ...pr, status } : pr))
  }

  async function submitContent(idea: Idea) {
    await supabase.from('content_ideas').update({ validation_status: 'pending_review', status: 'validation' }).eq('id', idea.id)
    onUpdate()
  }

  const readyToSubmit = ideas.filter(i => i.status === 'montage' && i.validation_status !== 'pending_review' && i.validation_status !== 'approved')

  return (
    <div className="space-y-5">
      {readyToSubmit.length > 0 && (
        <div className="rounded-2xl border border-purple-200 dark:border-purple-500/20 bg-purple-50 dark:bg-purple-500/5 p-4">
          <p className="text-purple-700 dark:text-purple-300 text-sm font-medium mb-2">{readyToSubmit.length} contenu{readyToSubmit.length > 1 ? 's' : ''} en montage — prêt à soumettre</p>
          <div className="flex flex-wrap gap-2">
            {readyToSubmit.map(i => (
              <button key={i.id} onClick={() => submitContent(i)} className="text-xs px-3 py-1.5 bg-purple-100 dark:bg-purple-500/15 border border-purple-200 dark:border-purple-500/25 rounded-lg text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-500/25 transition-all flex items-center gap-1.5">
                <Send className="h-3 w-3" /> Soumettre "{i.title}"
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {PROD_STATUSES.map(s => {
          const count = ideas.filter(i => {
            const pipelineMap: Record<string, string> = { 'a_produire': 'idea', 'en_production': 'tournage', 'en_revision': 'montage', 'valide': 'final' }
            return i.status === pipelineMap[s.key]
          }).length
          return (
            <div key={s.key} className={cn(card, 'p-4 text-center')}>
              <p className="text-2xl font-bold" style={{ color: s.color }}>{count}</p>
              <p className={cn('text-xs mt-1', textMuted)}>{s.label}</p>
            </div>
          )
        })}
      </div>

      {loading ? (
        <div className="text-center py-10"><RefreshCw className="h-6 w-6 animate-spin text-gray-300 dark:text-white/20 mx-auto" /></div>
      ) : productions.length === 0 ? (
        <div className="text-center py-16">
          <Upload className="h-10 w-10 text-gray-300 dark:text-white/20 mx-auto mb-3" />
          <p className={cn(textMuted, 'text-sm')}>Aucune production uploadée</p>
        </div>
      ) : (
        <div className="space-y-3">
          {productions.map(p => {
            const st = PROD_STATUSES.find(s => s.key === p.status) || PROD_STATUSES[0]
            return (
              <div key={p.id} className={cn(card, 'p-4 flex items-center gap-4')}>
                <div className="h-10 w-10 rounded-xl bg-gray-100 dark:bg-white/6 flex items-center justify-center shrink-0">
                  {p.file_type?.startsWith('video') ? <Film className="h-5 w-5 text-gray-400 dark:text-white/30" /> :
                    p.file_type?.startsWith('audio') ? <Mic className="h-5 w-5 text-gray-400 dark:text-white/30" /> :
                      p.file_type?.startsWith('image') ? <Image className="h-5 w-5 text-gray-400 dark:text-white/30" /> :
                        <Upload className="h-5 w-5 text-gray-400 dark:text-white/30" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm font-medium truncate', textBase)}>{p.idea_title}</p>
                  <p className={cn('text-xs', textSub)}>{p.file_type || 'Fichier'} · {format(new Date(p.uploaded_at), 'dd MMM', { locale: fr })}</p>
                </div>
                <select value={p.status} onChange={e => updateProdStatus(p.id, e.target.value)} className="text-xs bg-gray-50 dark:bg-white/5 border px-2.5 py-1.5 rounded-lg focus:outline-none" style={{ borderColor: st.color + '40', color: st.color }}>
                  {PROD_STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                </select>
                {p.file_url && (
                  <a href={p.file_url} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-500 dark:text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 transition-all">Voir</a>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── BLOC 5 : BIBLIOTHÈQUE ────────────────────────────────────────────────────
function Bibliotheque({ ideas, clients, projects }: { ideas: Idea[]; clients: any[]; projects: any[] }) {
  const [search, setSearch] = useState('')
  const [platFilter, setPlatFilter] = useState('all')
  const [clientFilter, setClientFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')

  const clientMap: Record<string, string> = {}
  clients.forEach(c => { clientMap[c.id] = c.name })
  const projectMap: Record<string, string> = {}
  projects.forEach(p => { projectMap[p.id] = p.title })

  const finished = ideas.filter(i => i.status === 'final' || i.validation_status === 'approved')

  const filtered = finished.filter(i => {
    const bySearch = !search || i.title.toLowerCase().includes(search.toLowerCase())
    const byPlat = platFilter === 'all' || i.platform === platFilter
    const byClient = clientFilter === 'all' || i.client_id === clientFilter
    const byType = typeFilter === 'all' || i.content_type === typeFilter
    return bySearch && byPlat && byClient && byType
  })

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-3">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un contenu..." className={cn(inputCls, 'flex-1 min-w-48')} />
        <select value={platFilter} onChange={e => setPlatFilter(e.target.value)} className={selectCls}>
          <option value="all">Toutes plateformes</option>
          {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className={selectCls}>
          <option value="all">Tous formats</option>
          {CONTENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        {clients.length > 0 && (
          <select value={clientFilter} onChange={e => setClientFilter(e.target.value)} className={selectCls}>
            <option value="all">Tous les clients</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}
      </div>

      <p className={cn('text-xs', textSub)}>{filtered.length} contenu{filtered.length > 1 ? 's' : ''} finalisé{filtered.length > 1 ? 's' : ''}</p>

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <Library className="h-10 w-10 text-gray-300 dark:text-white/20 mx-auto mb-3" />
          <p className={cn(textMuted, 'text-sm')}>Aucun contenu finalisé</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(i => (
            <div key={i.id} className={cn(cardHover, 'p-4 hover:border-emerald-200 dark:hover:border-emerald-500/20')}>
              <div className="flex items-start gap-3 mb-3">
                <span className="text-xl">{platIcon(i.platform)}</span>
                <div className="min-w-0 flex-1">
                  <p className={cn('text-sm font-semibold leading-tight', textBase)}>{i.title}</p>
                  <p className={cn('text-xs mt-0.5', textSub)}>{i.content_type || 'Contenu'} · {i.category}</p>
                </div>
                <CheckCircle2 className="h-4 w-4 text-emerald-500 dark:text-emerald-400 shrink-0" />
              </div>
              <div className="flex flex-wrap gap-1.5">
                <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-white/5 rounded text-gray-500 dark:text-white/30">{i.platform}</span>
                {i.client_id && clientMap[i.client_id] && <span className="text-xs px-2 py-0.5 bg-indigo-50 dark:bg-indigo-500/10 rounded text-indigo-600 dark:text-indigo-400">{clientMap[i.client_id]}</span>}
                {i.project_id && projectMap[i.project_id] && <span className="text-xs px-2 py-0.5 bg-purple-50 dark:bg-purple-500/10 rounded text-purple-600 dark:text-purple-400">{projectMap[i.project_id]}</span>}
                {i.publish_date && <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-white/5 rounded text-gray-500 dark:text-white/30">{format(parseISO(i.publish_date), 'dd MMM yyyy', { locale: fr })}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── BLOC 6 : COLLABORATION ────────────────────────────────────────────────────
function Collaboration({ ideas, profile }: { ideas: Idea[]; profile: any }) {
  const [feedbacks, setFeedbacks] = useState<(Feedback & { idea_title: string })[]>([])
  const [loading, setLoading] = useState(true)
  const [comment, setComment] = useState('')
  const [selectedIdea, setSelectedIdea] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (ideas.length === 0) { setLoading(false); return }
    const ideaMap: Record<string, string> = {}
    ideas.forEach(i => { ideaMap[i.id] = i.title })
    supabase.from('content_feedback').select('*').in('content_id', ideas.map(i => i.id)).order('created_at', { ascending: false }).then(({ data }) => {
      setFeedbacks((data || []).map(f => ({ ...f, idea_title: ideaMap[f.content_id] || 'Sans titre' })))
      setLoading(false)
    })
  }, [ideas])

  async function addComment() {
    if (!comment.trim() || !selectedIdea) return
    setSaving(true)
    const { data } = await supabase.from('content_feedback').insert({
      content_id: selectedIdea, comment: comment.trim(),
      approved: false, reviewer_id: profile?.id, reviewer_role: profile?.role
    }).select().single()
    if (data) {
      const idea = ideas.find(i => i.id === selectedIdea)
      setFeedbacks(f => [{ ...data, idea_title: idea?.title || '' }, ...f])
    }
    setComment('')
    setSaving(false)
  }

  const pendingValidation = ideas.filter(i => i.validation_status === 'pending_review')
  const rejected = ideas.filter(i => i.validation_status === 'rejected')

  return (
    <div className="space-y-5">
      {pendingValidation.length > 0 && (
        <div className="rounded-2xl border border-orange-200 dark:border-orange-500/20 bg-orange-50 dark:bg-orange-500/5 p-4">
          <p className="text-orange-700 dark:text-orange-300 text-sm font-semibold mb-2 flex items-center gap-2"><Eye className="h-4 w-4" /> En attente de validation ({pendingValidation.length})</p>
          <div className="space-y-2">
            {pendingValidation.map(i => (
              <div key={i.id} className="flex items-center gap-3 p-2.5 bg-white dark:bg-white/4 rounded-xl border border-orange-100 dark:border-white/6">
                <span>{platIcon(i.platform)}</span>
                <p className={cn('text-sm flex-1', textBase)}>{i.title}</p>
                <span className="text-xs text-orange-600 dark:text-orange-400">Soumis pour validation</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {rejected.length > 0 && (
        <div className="rounded-2xl border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/5 p-4">
          <p className="text-red-700 dark:text-red-300 text-sm font-semibold mb-2 flex items-center gap-2"><AlertCircle className="h-4 w-4" /> À corriger ({rejected.length})</p>
          <div className="space-y-2">
            {rejected.map(i => (
              <div key={i.id} className="p-2.5 bg-white dark:bg-white/4 rounded-xl border border-red-100 dark:border-white/6">
                <p className={cn('text-sm', textBase)}>{i.title}</p>
                {i.rejection_note && <p className="text-xs text-red-500 dark:text-red-400 mt-1">Note : "{i.rejection_note}"</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={cn(card, 'p-5')}>
        <h3 className={cn('text-sm font-semibold mb-3 flex items-center gap-2', textBase)}><MessageSquare className="h-4 w-4 text-indigo-500 dark:text-indigo-400" /> Ajouter une note interne</h3>
        <select value={selectedIdea} onChange={e => setSelectedIdea(e.target.value)} className={cn(selectCls, 'w-full mb-3')}>
          <option value="">Sélectionner un contenu...</option>
          {ideas.map(i => <option key={i.id} value={i.id}>{i.title}</option>)}
        </select>
        <div className="flex gap-2">
          <input value={comment} onChange={e => setComment(e.target.value)} onKeyDown={e => e.key === 'Enter' && addComment()} placeholder="Commentaire pour le designer, monteur, manager..." className={cn(inputCls, 'flex-1')} />
          <button onClick={addComment} disabled={saving || !comment.trim() || !selectedIdea} className="px-4 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white transition-all disabled:opacity-40">
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8"><RefreshCw className="h-5 w-5 animate-spin text-gray-300 dark:text-white/20 mx-auto" /></div>
      ) : feedbacks.length === 0 ? (
        <p className={cn(textSub, 'text-sm text-center py-8')}>Aucun commentaire</p>
      ) : (
        <div className="space-y-3">
          {feedbacks.map(f => (
            <div key={f.id} className={cn('rounded-xl border p-3.5',
              f.approved
                ? 'border-emerald-200 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/5'
                : 'border-gray-200 dark:border-white/8 bg-white dark:bg-white/4'
            )}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className={cn('text-xs font-medium', textMuted)}>{f.idea_title}</span>
                  {f.reviewer_role && <span className="text-xs px-1.5 py-0.5 bg-gray-100 dark:bg-white/5 rounded text-gray-500 dark:text-white/30">{f.reviewer_role}</span>}
                </div>
                <div className="flex items-center gap-2">
                  {f.approved ? <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Approuvé</span> : null}
                  <span className={cn('text-xs', textSub)}>{format(new Date(f.created_at), 'dd MMM', { locale: fr })}</span>
                </div>
              </div>
              <p className={cn('text-sm', textMuted)}>{f.comment}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── PAGE PRINCIPALE ──────────────────────────────────────────────────────────
export default function CreatorPage() {
  const { profile } = useAuth()
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [productions, setProductions] = useState<Production[]>([])
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([])
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'dashboard' | 'ideation' | 'scripting' | 'production' | 'bibliotheque' | 'collaboration'>('dashboard')
  const [scriptIdea, setScriptIdea] = useState<Idea | null>(null)

  async function fetchAll() {
    if (!profile) return
    const [ideasRes, projectsRes, clientsRes, notifsRes] = await Promise.all([
      supabase.from('content_ideas').select('*').order('created_at', { ascending: false }),
      supabase.from('projects').select('id,title,status,end_date').order('created_at', { ascending: false }),
      supabase.from('clients').select('id,name').order('name'),
      supabase.from('notifications').select('*').eq('user_id', profile.id).eq('is_read', false).order('created_at', { ascending: false }).limit(5),
    ])
    setIdeas(ideasRes.data || [])
    setProjects(projectsRes.data || [])
    setClients(clientsRes.data || [])
    setNotifications(notifsRes.data || [])
    setLoading(false)
  }

  useEffect(() => { fetchAll() }, [profile])

  async function dismissNotif(id: string) {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    setNotifications(n => n.filter(x => x.id !== id))
  }

  const rejectedCount = ideas.filter(i => i.validation_status === 'rejected').length
  const pendingCount = ideas.filter(i => i.validation_status === 'pending_review').length
  const ideationCount = ideas.filter(i => i.idea_status === 'brouillon' || !i.idea_status).length
  const scriptCount = ideas.filter(i => i.status === 'script_en_cours').length
  const biblioCount = ideas.filter(i => i.status === 'final' || i.validation_status === 'approved').length

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <RefreshCw className="h-6 w-6 animate-spin text-gray-400 dark:text-white/30" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={cn('text-2xl font-bold', textBase)}>
            Bonjour, {profile?.full_name?.split(' ')[0] || 'Créatrice'} ✨
          </h1>
          <p className={cn('text-sm mt-0.5', textMuted)}>
            {format(new Date(), "EEEE d MMMM yyyy", { locale: fr })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {rejectedCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/25 rounded-xl">
              <AlertTriangle className="h-4 w-4 text-red-500 dark:text-red-400" />
              <span className="text-xs text-red-700 dark:text-red-300 font-medium">{rejectedCount} à retravailler</span>
            </div>
          )}
          {pendingCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/25 rounded-xl">
              <Eye className="h-4 w-4 text-orange-500 dark:text-orange-400" />
              <span className="text-xs text-orange-700 dark:text-orange-300 font-medium">{pendingCount} en validation</span>
            </div>
          )}
        </div>
      </div>

      {/* Notifications */}
      {notifications.length > 0 && (
        <div className="space-y-2">
          {notifications.map(n => (
            <div key={n.id} className="flex items-start gap-3 p-3.5 rounded-xl border border-indigo-200 dark:border-indigo-500/20 bg-indigo-50 dark:bg-indigo-500/5">
              <Bell className="h-4 w-4 text-indigo-500 dark:text-indigo-400 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-indigo-700 dark:text-indigo-300 font-medium">{n.title}</p>
                {n.message && <p className={cn('text-xs mt-0.5', textMuted)}>{n.message}</p>}
              </div>
              <button onClick={() => dismissNotif(n.id)}><X className="h-4 w-4 text-gray-400 dark:text-white/30 hover:text-gray-600 dark:hover:text-white/60 transition-all" /></button>
            </div>
          ))}
        </div>
      )}

      {/* Onglets */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        <TabBtn active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={BarChart2} label="Dashboard" />
        <TabBtn active={activeTab === 'ideation'} onClick={() => setActiveTab('ideation')} icon={Lightbulb} label="Idéation" count={ideationCount} />
        <TabBtn active={activeTab === 'scripting'} onClick={() => setActiveTab('scripting')} icon={FileText} label="Scripts" count={scriptCount} />
        <TabBtn active={activeTab === 'production'} onClick={() => setActiveTab('production')} icon={Camera} label="Production" count={pendingCount} urgent={pendingCount > 0} />
        <TabBtn active={activeTab === 'bibliotheque'} onClick={() => setActiveTab('bibliotheque')} icon={Library} label="Bibliothèque" count={biblioCount} />
        <TabBtn active={activeTab === 'collaboration'} onClick={() => setActiveTab('collaboration')} icon={MessageSquare} label="Collaboration" count={rejectedCount} urgent={rejectedCount > 0} />
      </div>

      {/* Contenu */}
      {activeTab === 'dashboard' && <DashboardPrincipal ideas={ideas} productions={productions} feedbacks={feedbacks} />}
      {activeTab === 'ideation' && <ModuleIdeation ideas={ideas} onAdd={() => {}} onUpdate={fetchAll} onOpenScript={setScriptIdea} projects={projects} clients={clients} />}
      {activeTab === 'scripting' && <ModuleScripting ideas={ideas} onOpenScript={setScriptIdea} />}
      {activeTab === 'production' && <ModuleProduction ideas={ideas} onUpdate={fetchAll} />}
      {activeTab === 'bibliotheque' && <Bibliotheque ideas={ideas} clients={clients} projects={projects} />}
      {activeTab === 'collaboration' && <Collaboration ideas={ideas} profile={profile} />}

      {/* Modal script */}
      {scriptIdea && <ScriptModal idea={scriptIdea} onClose={() => setScriptIdea(null)} onSaved={fetchAll} />}
    </div>
  )
}
