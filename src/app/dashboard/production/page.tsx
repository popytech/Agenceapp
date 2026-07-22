'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { useRoleGuard } from '@/hooks/useRoleGuard'
import type { Client, VideoProject, Project } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, AlertCircle, Film, Link as LinkIcon, Calendar, Upload, Play, ChevronRight } from 'lucide-react'
import { format, isToday, isBefore, parseISO, startOfDay } from 'date-fns'
import { fr } from 'date-fns/locale'
import { cn } from '@/lib/utils'

const VIDEO_TYPES = [
  { value: 'pub',       label: 'Publicité / Spot' },
  { value: 'clip',      label: 'Clip musical' },
  { value: 'corporate', label: 'Vidéo corporate' },
  { value: 'reels',     label: 'Reels / Shorts' },
  { value: 'reportage', label: 'Reportage / Event' },
  { value: 'tuto',      label: 'Tutoriel / Formation' },
  { value: 'motion',    label: 'Motion design' },
  { value: 'autre',     label: 'Autre' },
]

const STATUSES = [
  { value: 'brief',    label: 'Brief',    icon: '📋', accent: '#6b7280', bg: 'rgba(107,114,128,0.12)', border: 'rgba(107,114,128,0.25)', text: '#9ca3af' },
  { value: 'tournage', label: 'Tournage', icon: '🎬', accent: '#ef4444', bg: 'rgba(239,68,68,0.1)',    border: 'rgba(239,68,68,0.3)',    text: '#f87171' },
  { value: 'montage',  label: 'Montage',  icon: '✂️',  accent: '#f97316', bg: 'rgba(249,115,22,0.1)',   border: 'rgba(249,115,22,0.3)',   text: '#fb923c' },
  { value: 'revision', label: 'Révision', icon: '🔄', accent: '#eab308', bg: 'rgba(234,179,8,0.1)',    border: 'rgba(234,179,8,0.3)',    text: '#facc15' },
  { value: 'export',   label: 'Export',   icon: '📤', accent: '#3b82f6', bg: 'rgba(59,130,246,0.1)',   border: 'rgba(59,130,246,0.3)',   text: '#60a5fa' },
  { value: 'livre',    label: 'Livré',    icon: '✅', accent: '#10b981', bg: 'rgba(16,185,129,0.1)',   border: 'rgba(16,185,129,0.3)',   text: '#34d399' },
  { value: 'archive',  label: 'Archivé',  icon: '📦', accent: '#4b5563', bg: 'rgba(75,85,99,0.08)',    border: 'rgba(75,85,99,0.2)',     text: '#6b7280' },
]

const STATUS_NEXT: Record<string, string> = {
  brief: 'tournage', tournage: 'montage', montage: 'revision', revision: 'export', export: 'livre',
}

export default function ProductionPage() {
  useRoleGuard(['super_admin', 'chef_projet', 'vidéaste', 'monteur_video'])
  const { profile } = useAuth()
  const [clients, setClients]   = useState<Client[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [videos, setVideos]     = useState<(VideoProject & { clients?: Client; profiles?: { full_name: string } })[]>([])
  const [loading, setLoading]   = useState(true)
  const [filterStatus, setFilterStatus] = useState<string>('all')

  const [open, setOpen]   = useState(false)
  const [form, setForm]   = useState({ title: '', client_id: '', project_id: '', video_type: 'pub', duration_min: '', deadline: '', drive_link: '', notes: '' })
  const [saving, setSaving] = useState(false)

  const [editingLink, setEditingLink] = useState<string | null>(null)
  const [linkValue, setLinkValue]     = useState('')

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [{ data: c }, { data: p }, { data: v }] = await Promise.all([
      supabase.from('clients').select('*').order('company_name'),
      supabase.from('projects').select('*').order('title'),
      supabase.from('video_projects').select('*, clients(*), profiles(full_name)').order('created_at', { ascending: false }),
    ])
    setClients(c || [])
    setProjects(p || [])
    setVideos(v || [])
    setLoading(false)
  }

  async function submitVideo() {
    if (!form.title) return
    setSaving(true)
    await supabase.from('video_projects').insert({
      title: form.title,
      client_id: form.client_id || null,
      project_id: form.project_id || null,
      video_type: form.video_type,
      duration_min: form.duration_min ? parseInt(form.duration_min) : null,
      deadline: form.deadline || null,
      drive_link: form.drive_link || null,
      notes: form.notes || null,
      assigned_to: profile?.id,
      status: 'brief',
    })
    setSaving(false)
    setOpen(false)
    setForm({ title: '', client_id: '', project_id: '', video_type: 'pub', duration_min: '', deadline: '', drive_link: '', notes: '' })
    fetchAll()
  }

  async function nextStatus(video: VideoProject) {
    const next = STATUS_NEXT[video.status]
    if (!next) return
    await supabase.from('video_projects').update({ status: next }).eq('id', video.id)
    fetchAll()
  }

  async function updateStatus(id: string, status: string) {
    await supabase.from('video_projects').update({ status }).eq('id', id)
    fetchAll()
  }

  async function saveLink(id: string) {
    await supabase.from('video_projects').update({ drive_link: linkValue }).eq('id', id)
    setEditingLink(null)
    fetchAll()
  }

  const activeVideos = videos.filter(v => !['livre', 'archive'].includes(v.status))
  const inMontage    = videos.filter(v => v.status === 'montage')
  const delivered    = videos.filter(v => v.status === 'livre')
  const urgent       = videos.filter(v => v.deadline && v.status !== 'livre' && v.status !== 'archive' &&
    (isToday(parseISO(v.deadline)) || isBefore(parseISO(v.deadline), startOfDay(new Date()))))
  const filtered = filterStatus === 'all' ? videos : videos.filter(v => v.status === filterStatus)

  const kpis = [
    { label: 'En production', value: activeVideos.length, icon: '🎬', accent: '#ef4444' },
    { label: 'En montage',    value: inMontage.length,    icon: '✂️',  accent: '#f97316' },
    { label: 'Livrés',        value: delivered.length,    icon: '✅', accent: '#10b981' },
    { label: 'En retard',     value: urgent.length,       icon: '⏰', accent: urgent.length > 0 ? '#ef4444' : '#6b7280' },
  ]

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#06060f' }}>
      <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#ef4444', borderTopColor: 'transparent' }} />
    </div>
  )

  return (
    <div className="min-h-screen pt-0 md:pt-0" style={{ background: 'linear-gradient(135deg, #06060f 0%, #0d0d1a 50%, #0a0a12 100%)' }}>

      {/* ── Header cinéma ── */}
      <div className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #1a0808 0%, #0d0818 50%, #0a0f1a 100%)' }}>
        <div className="absolute top-0 left-1/4 w-96 h-64 rounded-full opacity-15 blur-3xl pointer-events-none"
          style={{ background: 'radial-gradient(circle, #ef4444 0%, transparent 70%)' }} />
        <div className="absolute bottom-0 right-1/4 w-64 h-64 rounded-full opacity-10 blur-3xl pointer-events-none"
          style={{ background: 'radial-gradient(circle, #6366f1 0%, transparent 70%)' }} />
        <div className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '28px 28px' }} />

        <div className="relative px-5 py-8 md:py-10">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                  style={{ background: 'linear-gradient(135deg, #ef4444, #6366f1)' }}>🎬</div>
                <span className="text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full border"
                  style={{ color: '#f87171', borderColor: '#ef444430', background: '#ef444412' }}>
                  Studio Production Vidéo
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl font-black text-white">Production <span style={{ background: 'linear-gradient(90deg, #ef4444, #f97316)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>vidéo</span></h1>
              <p className="text-sm mt-1" style={{ color: '#6b7280' }}>Tournage · Montage · Révision · Livraison</p>
            </div>

            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm text-white transition-all hover:scale-105 hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg, #ef4444, #6366f1)', boxShadow: '0 0 20px #ef444430' }}>
                  <Plus className="h-4 w-4" /> Nouveau projet
                </button>
              </DialogTrigger>
              <DialogContent className="bg-[#0f0f1c] border-[#ffffff15] text-white">
                <DialogHeader>
                  <DialogTitle className="text-white">🎬 Nouveau projet vidéo</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div>
                    <Label className="text-slate-300 text-xs">Titre *</Label>
                    <Input placeholder="Ex: Spot pub - Boulangerie Aya"
                      className="bg-[#1a1a2e] border-[#ffffff15] text-white placeholder:text-slate-600 mt-1"
                      value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-slate-300 text-xs">Client</Label>
                    <Select value={form.client_id} onValueChange={v => setForm(f => ({ ...f, client_id: v }))}>
                      <SelectTrigger className="bg-[#1a1a2e] border-[#ffffff15] text-white mt-1">
                        <SelectValue placeholder="Sélectionner un client" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0f0f1c] border-[#ffffff15] text-white">
                        <SelectItem value="none">Aucun</SelectItem>
                        {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-slate-300 text-xs">Type de vidéo</Label>
                    <Select value={form.video_type} onValueChange={v => setForm(f => ({ ...f, video_type: v }))}>
                      <SelectTrigger className="bg-[#1a1a2e] border-[#ffffff15] text-white mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-[#0f0f1c] border-[#ffffff15] text-white">
                        {VIDEO_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-slate-300 text-xs">Durée (min)</Label>
                      <Input type="number" placeholder="3"
                        className="bg-[#1a1a2e] border-[#ffffff15] text-white placeholder:text-slate-600 mt-1"
                        value={form.duration_min} onChange={e => setForm(f => ({ ...f, duration_min: e.target.value }))} />
                    </div>
                    <div>
                      <Label className="text-slate-300 text-xs">Deadline</Label>
                      <Input type="date"
                        className="bg-[#1a1a2e] border-[#ffffff15] text-white mt-1"
                        value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} />
                    </div>
                  </div>
                  <div>
                    <Label className="text-slate-300 text-xs">Lien Drive / WeTransfer</Label>
                    <Input placeholder="https://drive.google.com/..."
                      className="bg-[#1a1a2e] border-[#ffffff15] text-white placeholder:text-slate-600 mt-1"
                      value={form.drive_link} onChange={e => setForm(f => ({ ...f, drive_link: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-slate-300 text-xs">Notes / Brief</Label>
                    <Textarea placeholder="Brief, références, consignes..."
                      className="bg-[#1a1a2e] border-[#ffffff15] text-white placeholder:text-slate-600 mt-1"
                      value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} />
                  </div>
                  <button onClick={submitVideo} disabled={saving || !form.title}
                    className="w-full py-2.5 rounded-xl font-semibold text-sm text-white disabled:opacity-50 transition-all hover:opacity-90"
                    style={{ background: 'linear-gradient(135deg, #ef4444, #6366f1)' }}>
                    {saving ? 'Création...' : '🎬 Créer le projet'}
                  </button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-6 py-5 space-y-5">

        {/* Alerte retard */}
        {urgent.length > 0 && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl border"
            style={{ background: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.3)' }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: 'rgba(239,68,68,0.2)' }}>
              <AlertCircle className="h-4 w-4 text-red-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-red-300">{urgent.length} projet{urgent.length > 1 ? 's' : ''} en retard ou dû aujourd'hui</p>
              <div className="flex flex-wrap gap-2 mt-1">
                {urgent.map(v => {
                  const st = STATUSES.find(s => s.value === v.status)
                  return (
                    <span key={v.id} className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171' }}>
                      {st?.icon} {v.title} {v.deadline && `· ${format(parseISO(v.deadline), 'dd MMM', { locale: fr })}`}
                    </span>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {kpis.map(k => (
            <div key={k.label} className="rounded-xl p-4 border"
              style={{ background: 'linear-gradient(135deg, #0f0f1c, #141428)', borderColor: '#ffffff12' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xl">{k.icon}</span>
                <div className="w-2 h-2 rounded-full" style={{ background: k.accent, boxShadow: `0 0 8px ${k.accent}` }} />
              </div>
              <p className="text-2xl font-black text-white">{k.value}</p>
              <p className="text-xs font-medium mt-0.5" style={{ color: k.accent }}>{k.label}</p>
            </div>
          ))}
        </div>

        {/* Pipeline visuel */}
        <div className="rounded-xl border p-4" style={{ background: 'linear-gradient(135deg, #0f0f1c, #141428)', borderColor: '#ffffff12' }}>
          <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: '#4b5563' }}>Pipeline de production</p>
          <div className="flex items-center gap-1 flex-wrap">
            {STATUSES.filter(s => s.value !== 'archive').map((s, i) => {
              const count = videos.filter(v => v.status === s.value).length
              return (
                <div key={s.value} className="flex items-center gap-1">
                  <button onClick={() => setFilterStatus(filterStatus === s.value ? 'all' : s.value)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-semibold transition-all hover:scale-105"
                    style={{
                      background: filterStatus === s.value ? s.bg : 'rgba(255,255,255,0.03)',
                      borderColor: filterStatus === s.value ? s.border : '#ffffff10',
                      color: filterStatus === s.value ? s.text : '#6b7280',
                    }}>
                    <span>{s.icon}</span>
                    <span>{s.label}</span>
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black"
                      style={{ background: count > 0 ? s.bg : '#ffffff08', color: count > 0 ? s.text : '#4b5563' }}>
                      {count}
                    </span>
                  </button>
                  {i < STATUSES.filter(s => s.value !== 'archive').length - 1 && (
                    <ChevronRight className="h-3 w-3 shrink-0" style={{ color: '#374151' }} />
                  )}
                </div>
              )
            })}
            <button onClick={() => setFilterStatus('all')}
              className="ml-auto text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors"
              style={{ borderColor: '#ffffff12', color: filterStatus === 'all' ? '#fff' : '#6b7280', background: filterStatus === 'all' ? '#ffffff12' : 'transparent' }}>
              Tous ({videos.length})
            </button>
          </div>
        </div>

        {/* Liste projets */}
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="text-center py-16 rounded-xl border" style={{ background: 'rgba(255,255,255,0.02)', borderColor: '#ffffff08' }}>
              <Film className="h-10 w-10 mx-auto mb-3 opacity-20 text-slate-500" />
              <p className="text-sm font-medium" style={{ color: '#4b5563' }}>Aucun projet vidéo</p>
            </div>
          ) : filtered.map(video => {
            const st = STATUSES.find(s => s.value === video.status)
            const vt = VIDEO_TYPES.find(t => t.value === video.video_type)
            const isUrgent = video.deadline && video.status !== 'livre' && video.status !== 'archive' &&
              (isToday(parseISO(video.deadline)) || isBefore(parseISO(video.deadline), startOfDay(new Date())))
            const nextSt = STATUS_NEXT[video.status]
            const nextStData = STATUSES.find(s => s.value === nextSt)

            return (
              <div key={video.id} className="rounded-xl border p-4 transition-all hover:border-white/10"
                style={{
                  background: isUrgent ? 'linear-gradient(135deg, rgba(239,68,68,0.06), rgba(15,15,28,1))' : 'linear-gradient(135deg, #0f0f1c, #141428)',
                  borderColor: isUrgent ? 'rgba(239,68,68,0.3)' : '#ffffff0d',
                }}>
                <div className="flex items-start gap-4">
                  {/* Icône statut */}
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 mt-0.5"
                    style={{ background: st?.bg || '#ffffff08', border: `1px solid ${st?.border || '#ffffff10'}` }}>
                    {st?.icon || '🎬'}
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Titre + badges */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-white text-sm">{video.title}</p>
                      <span className="text-[11px] px-2 py-0.5 rounded-full border font-medium"
                        style={{ background: '#ffffff08', borderColor: '#ffffff12', color: '#9ca3af' }}>
                        {vt?.label}
                      </span>
                      <span className="text-[11px] px-2 py-0.5 rounded-full border font-semibold"
                        style={{ background: st?.bg, borderColor: st?.border, color: st?.text }}>
                        {st?.icon} {st?.label}
                      </span>
                      {isUrgent && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full font-bold"
                          style={{ background: 'rgba(239,68,68,0.2)', color: '#f87171' }}>⏰ Urgent</span>
                      )}
                    </div>

                    {/* Infos */}
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      {video.clients?.company_name && (
                        <span className="text-xs font-medium" style={{ color: '#6b7280' }}>{video.clients.company_name}</span>
                      )}
                      {video.duration_min && (
                        <span className="text-xs" style={{ color: '#4b5563' }}>· {video.duration_min} min</span>
                      )}
                      {video.deadline && (
                        <span className={cn('flex items-center gap-1 text-xs font-medium')}
                          style={{ color: isUrgent ? '#f87171' : '#6b7280' }}>
                          <Calendar className="h-3 w-3" />
                          {format(parseISO(video.deadline), 'dd MMM yyyy', { locale: fr })}
                          {isUrgent && ' — En retard'}
                        </span>
                      )}
                    </div>

                    {video.notes && (
                      <p className="text-xs mt-1.5 line-clamp-1" style={{ color: '#4b5563' }}>{video.notes}</p>
                    )}

                    {/* Lien Drive */}
                    <div className="mt-2">
                      {editingLink === video.id ? (
                        <div className="flex gap-2">
                          <Input className="h-7 text-xs flex-1 bg-[#1a1a2e] border-[#ffffff15] text-white placeholder:text-slate-600"
                            placeholder="https://drive.google.com/..."
                            value={linkValue} onChange={e => setLinkValue(e.target.value)} />
                          <button onClick={() => saveLink(video.id)}
                            className="text-xs px-2.5 py-1 rounded-lg font-medium text-white"
                            style={{ background: '#10b981' }}>OK</button>
                          <button onClick={() => setEditingLink(null)}
                            className="text-xs px-2 py-1 rounded-lg font-medium"
                            style={{ color: '#6b7280', background: '#ffffff08' }}>✕</button>
                        </div>
                      ) : video.drive_link ? (
                        <a href={video.drive_link} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs font-medium transition-colors hover:opacity-80"
                          style={{ color: '#60a5fa' }}>
                          <LinkIcon className="h-3 w-3" /> Fichiers Drive
                        </a>
                      ) : (
                        <button onClick={() => { setEditingLink(video.id); setLinkValue('') }}
                          className="flex items-center gap-1 text-xs font-medium transition-colors hover:opacity-80"
                          style={{ color: '#4b5563' }}>
                          <Upload className="h-3 w-3" /> Ajouter lien Drive
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 items-end shrink-0">
                    <Select value={video.status} onValueChange={v => updateStatus(video.id, v)}>
                      <SelectTrigger className="w-34 h-8 text-xs bg-[#1a1a2e] border-[#ffffff15] text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0f0f1c] border-[#ffffff15] text-white">
                        {STATUSES.map(s => (
                          <SelectItem key={s.value} value={s.value} className="text-xs">
                            {s.icon} {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {nextSt && nextStData && (
                      <button onClick={() => nextStatus(video)}
                        className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg border transition-all hover:scale-105"
                        style={{ background: nextStData.bg, borderColor: nextStData.border, color: nextStData.text }}>
                        → {nextStData.label}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
