'use client'

// Podcast Studio — utilise la table content_ideas avec content_type='podcast'
// Mapping: title=title, notes=description+invité+liens, status=status, client_id=client_id
// category=category, platform=format (Spotify/YouTube/etc), publish_date=published_at

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import {
  Mic, Plus, Search, Edit, Trash2, Clock, Calendar,
  Tag, Users, ExternalLink, Check, Headphones, Radio,
  TrendingUp, Eye, ChevronDown,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/lib/auth-context'
import { cn } from '@/lib/utils'

// ─── Types ─────────────────────────────────────────────────────────────────────
interface Episode {
  id: string
  title: string
  notes: string | null        // description + guest_name + audio_url encodés en JSON
  category: string | null     // catégorie podcast
  platform: string | null     // Spotify / YouTube / SoundCloud…
  status: string
  publish_date: string | null
  client_id: string | null
  created_by: string | null
  created_at: string
  clients?: { company_name: string }
  // champs décodés depuis notes
  _description?: string
  _guest?: string
  _guest_title?: string
  _audio_url?: string
  _duration?: string
  _episode_num?: string
  _tags?: string
}

interface Client { id: string; company_name: string }

// ─── Helpers ───────────────────────────────────────────────────────────────────
function encodeNotes(data: Record<string, string>) {
  return JSON.stringify(data)
}
function decodeNotes(notes: string | null): Record<string, string> {
  if (!notes) return {}
  try { return JSON.parse(notes) } catch { return { description: notes } }
}

// ─── Constantes ────────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  brouillon:  { label: 'Brouillon',   color: 'bg-slate-100 text-slate-600' },
  enregistre: { label: 'Enregistré',  color: 'bg-blue-100 text-blue-700' },
  en_montage: { label: 'En montage',  color: 'bg-orange-100 text-orange-700' },
  publie:     { label: 'Publié',      color: 'bg-green-100 text-green-700' },
  archive:    { label: 'Archivé',     color: 'bg-gray-100 text-gray-500' },
}
const PODCAST_STATUSES = Object.keys(STATUS_CONFIG)
const CATEGORIES = ['Interview', 'Tutoriel', 'Actualités', 'Case Study', 'Débat', 'Solo', 'Autre']
const PLATFORMS = ['Spotify', 'YouTube', 'SoundCloud', 'Apple Podcasts', 'Deezer', 'Autre']

type EpisodeStatus = keyof typeof STATUS_CONFIG

interface FormState {
  title: string; description: string; episode_num: string
  guest: string; guest_title: string; category: string
  platform: string; duration: string; audio_url: string
  tags: string; status: EpisodeStatus; client_id: string; publish_date: string
}

const EMPTY_FORM: FormState = {
  title: '', description: '', episode_num: '',
  guest: '', guest_title: '', category: 'Interview',
  platform: 'Spotify', duration: '', audio_url: '',
  tags: '', status: 'brouillon', client_id: 'none', publish_date: '',
}

function enrichEpisode(ep: Episode): Episode {
  const d = decodeNotes(ep.notes)
  return {
    ...ep,
    _description: d.description || '',
    _guest: d.guest || '',
    _guest_title: d.guest_title || '',
    _audio_url: d.audio_url || '',
    _duration: d.duration || '',
    _episode_num: d.episode_num || '',
    _tags: d.tags || '',
  }
}

// ─── Page ───────────────────────────────────────────────────────────────────────
export default function PodcastPage() {
  const { profile } = useAuth()
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Episode | null>(null)
  const [deleting, setDeleting] = useState<Episode | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<FormState>({ ...EMPTY_FORM })

  const isAdmin = ['super_admin', 'ceo', 'dirigeant', 'chef_projet', 'creatrice_contenu', 'marketeur'].includes(profile?.role || '')

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: epData }, { data: cliData }] = await Promise.all([
      supabase
        .from('content_ideas')
        .select('*, clients(company_name)')
        .eq('content_type', 'podcast')
        .order('created_at', { ascending: false }),
      supabase.from('clients').select('id, company_name').order('company_name'),
    ])
    setEpisodes((epData ?? []).map(enrichEpisode))
    setClients(cliData ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function openNew() {
    setEditing(null)
    setForm({ ...EMPTY_FORM })
    setShowModal(true)
  }

  function openEdit(ep: Episode) {
    setEditing(ep)
    setForm({
      title: ep.title,
      description: ep._description || '',
      episode_num: ep._episode_num || '',
      guest: ep._guest || '',
      guest_title: ep._guest_title || '',
      category: ep.category || 'Interview',
      platform: ep.platform || 'Spotify',
      duration: ep._duration || '',
      audio_url: ep._audio_url || '',
      tags: ep._tags || '',
      status: (PODCAST_STATUSES.includes(ep.status) ? ep.status : 'brouillon') as EpisodeStatus,
      client_id: ep.client_id || 'none',
      publish_date: ep.publish_date ? new Date(ep.publish_date).toISOString().slice(0, 10) : '',
    })
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.title.trim()) return toast.error('Le titre est requis')
    setSaving(true)

    const notes = encodeNotes({
      description: form.description,
      guest: form.guest,
      guest_title: form.guest_title,
      audio_url: form.audio_url,
      duration: form.duration,
      episode_num: form.episode_num,
      tags: form.tags,
    })

    const payload = {
      title: form.title.trim(),
      notes,
      category: form.category,
      platform: form.platform,
      status: form.status,
      content_type: 'podcast',
      client_id: form.client_id === 'none' ? null : form.client_id,
      publish_date: form.status === 'publie' ? (form.publish_date || new Date().toISOString().slice(0, 10)) : null,
    }

    if (editing) {
      const { error } = await supabase.from('content_ideas').update(payload).eq('id', editing.id)
      if (error) { toast.error('Erreur : ' + error.message); setSaving(false); return }
      toast.success('Épisode mis à jour')
    } else {
      const { error } = await supabase.from('content_ideas').insert({ ...payload, created_by: profile?.id })
      if (error) { toast.error('Erreur : ' + error.message); setSaving(false); return }
      toast.success('Épisode créé !')
    }
    setSaving(false)
    setShowModal(false)
    setEditing(null)
    load()
  }

  async function handleDelete() {
    if (!deleting) return
    const { error } = await supabase.from('content_ideas').delete().eq('id', deleting.id)
    if (error) return toast.error('Erreur : ' + error.message)
    toast.success('Épisode supprimé')
    setDeleting(null)
    load()
  }

  async function quickStatus(ep: Episode, status: EpisodeStatus) {
    await supabase.from('content_ideas').update({
      status,
      publish_date: status === 'publie' ? new Date().toISOString().slice(0, 10) : ep.publish_date,
    }).eq('id', ep.id)
    toast.success(`Statut → ${STATUS_CONFIG[status].label}`)
    load()
  }

  const filtered = episodes.filter(ep => {
    const matchSearch = ep.title.toLowerCase().includes(search.toLowerCase()) ||
      (ep._guest || '').toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === 'all' || ep.status === filterStatus
    return matchSearch && matchStatus
  })

  const total = episodes.length
  const publie = episodes.filter(e => e.status === 'publie').length
  const totalDuration = episodes.reduce((s, e) => s + (parseInt(e._duration || '0') || 0), 0)

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#0066FF]/10 border border-[#0066FF]/20 flex items-center justify-center">
            <Mic className="w-5 h-5 text-[#0066FF]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Podcast Studio</h1>
            <p className="text-sm text-muted-foreground">Gestion des épisodes & production</p>
          </div>
        </div>
        {isAdmin && (
          <Button onClick={openNew} className="bg-[#0066FF] hover:bg-[#0052CC] text-white rounded-xl gap-2">
            <Plus className="w-4 h-4" /> Nouvel épisode
          </Button>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total épisodes', value: total, icon: Radio, color: '#0066FF' },
          { label: 'Publiés', value: publie, icon: Headphones, color: '#10B981' },
          { label: 'En production', value: episodes.filter(e => e.status === 'en_montage' || e.status === 'enregistre').length, icon: TrendingUp, color: '#00E5FF' },
          { label: 'Durée totale', value: totalDuration > 0 ? `${Math.floor(totalDuration/60)}h${totalDuration%60}m` : '—', icon: Clock, color: '#6A00FF' },
        ].map(kpi => (
          <Card key={kpi.label} className="border-border/50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: kpi.color + '18' }}>
                <kpi.icon className="w-4 h-4" style={{ color: kpi.color }} />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">{kpi.value}</p>
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filtres */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un épisode, invité…" className="pl-9 rounded-xl" />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <Button size="sm" variant={filterStatus === 'all' ? 'default' : 'outline'} onClick={() => setFilterStatus('all')} className="rounded-lg">
            Tous ({episodes.length})
          </Button>
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
            <Button key={key} size="sm" variant={filterStatus === key ? 'default' : 'outline'} onClick={() => setFilterStatus(key)} className="rounded-lg">
              {cfg.label} ({episodes.filter(e => e.status === key).length})
            </Button>
          ))}
        </div>
      </div>

      {/* Liste épisodes */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-24 rounded-xl bg-muted/40 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Mic className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="font-medium">Aucun épisode trouvé</p>
          {isAdmin && <Button onClick={openNew} variant="outline" className="mt-4 rounded-xl gap-2"><Plus className="w-4 h-4" />Créer le premier épisode</Button>}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(ep => (
            <Card key={ep.id} className="border-border/50 hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#0066FF]/10 border border-[#0066FF]/20 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-[#0066FF]">
                      {ep._episode_num ? `#${ep._episode_num}` : <Mic className="w-4 h-4" />}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-semibold text-sm text-foreground truncate">{ep.title}</h3>
                      <Badge className={cn('text-xs shrink-0', STATUS_CONFIG[ep.status]?.color || 'bg-gray-100 text-gray-600')}>
                        {STATUS_CONFIG[ep.status]?.label || ep.status}
                      </Badge>
                      {ep.category && <Badge variant="outline" className="text-xs shrink-0">{ep.category}</Badge>}
                      {ep.platform && <Badge variant="outline" className="text-xs shrink-0">{ep.platform}</Badge>}
                    </div>
                    {ep._description && <p className="text-xs text-muted-foreground line-clamp-1 mb-1">{ep._description}</p>}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                      {ep._guest && <span className="flex items-center gap-1"><Users className="w-3 h-3" />{ep._guest}{ep._guest_title ? ` · ${ep._guest_title}` : ''}</span>}
                      {ep._duration && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{ep._duration} min</span>}
                      {ep.publish_date && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(ep.publish_date).toLocaleDateString('fr-FR')}</span>}
                      {ep.clients && <span className="flex items-center gap-1"><Tag className="w-3 h-3" />{ep.clients.company_name}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {ep._audio_url && (
                      <a href={ep._audio_url} target="_blank" rel="noopener noreferrer">
                        <Button size="sm" variant="outline" className="h-8 w-8 p-0 rounded-lg"><ExternalLink className="w-3.5 h-3.5" /></Button>
                      </a>
                    )}
                    {isAdmin && (
                      <>
                        {ep.status !== 'publie' && (
                          <Button size="sm" variant="outline" className="h-8 px-2 text-xs rounded-lg text-green-600 border-green-200 hover:bg-green-50"
                            onClick={() => quickStatus(ep, 'publie')}>
                            <Check className="w-3.5 h-3.5 mr-1" />Publier
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => openEdit(ep)}><Edit className="w-4 h-4" /></Button>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => setDeleting(ep)}><Trash2 className="w-4 h-4" /></Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal création/édition */}
      <Dialog open={showModal} onOpenChange={v => { if (!v) { setShowModal(false); setEditing(null) } }}>
        <DialogContent className="max-w-2xl flex flex-col max-h-[90vh]">
          <DialogHeader className="shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Mic className="w-5 h-5 text-[#0066FF]" />
              {editing ? 'Modifier l\'épisode' : 'Nouvel épisode podcast'}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-4 pr-1 py-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label className="text-xs font-medium text-muted-foreground">Titre *</Label>
                <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="mt-1.5 rounded-xl" placeholder="Titre de l'épisode" />
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground">N° épisode</Label>
                <Input type="number" value={form.episode_num} onChange={e => setForm(f => ({ ...f, episode_num: e.target.value }))} className="mt-1.5 rounded-xl" placeholder="ex: 12" />
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Durée (minutes)</Label>
                <Input type="number" value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))} className="mt-1.5 rounded-xl" placeholder="45" />
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Invité</Label>
                <Input value={form.guest} onChange={e => setForm(f => ({ ...f, guest: e.target.value }))} className="mt-1.5 rounded-xl" placeholder="Nom de l'invité" />
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Titre invité</Label>
                <Input value={form.guest_title} onChange={e => setForm(f => ({ ...f, guest_title: e.target.value }))} className="mt-1.5 rounded-xl" placeholder="CEO de..." />
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Catégorie</Label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger className="mt-1.5 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Plateforme</Label>
                <Select value={form.platform} onValueChange={v => setForm(f => ({ ...f, platform: v }))}>
                  <SelectTrigger className="mt-1.5 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>{PLATFORMS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Statut</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as EpisodeStatus }))}>
                  <SelectTrigger className="mt-1.5 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Client associé</Label>
                <Select value={form.client_id} onValueChange={v => setForm(f => ({ ...f, client_id: v }))}>
                  <SelectTrigger className="mt-1.5 rounded-xl"><SelectValue placeholder="Aucun" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Aucun —</SelectItem>
                    {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label className="text-xs font-medium text-muted-foreground">Lien audio (Spotify / SoundCloud / Drive…)</Label>
                <Input value={form.audio_url} onChange={e => setForm(f => ({ ...f, audio_url: e.target.value }))} className="mt-1.5 rounded-xl" placeholder="https://open.spotify.com/episode/…" />
              </div>
              <div className="md:col-span-2">
                <Label className="text-xs font-medium text-muted-foreground">Tags (séparés par des virgules)</Label>
                <Input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} className="mt-1.5 rounded-xl" placeholder="marketing, digital, startup" />
              </div>
              <div className="md:col-span-2">
                <Label className="text-xs font-medium text-muted-foreground">Description</Label>
                <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="mt-1.5 rounded-xl resize-none" rows={3} placeholder="Résumé de l'épisode…" />
              </div>
            </div>
          </div>
          <div className="shrink-0 flex gap-2 justify-end pt-3 border-t border-border/50 mt-2">
            <Button variant="outline" onClick={() => setShowModal(false)} className="rounded-xl">Annuler</Button>
            <Button onClick={handleSave} disabled={saving} className="rounded-xl bg-[#0066FF] hover:bg-[#0052CC] text-white">
              {saving ? 'Enregistrement…' : editing ? 'Mettre à jour' : 'Créer l\'épisode'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal suppression */}
      <Dialog open={!!deleting} onOpenChange={v => !v && setDeleting(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Supprimer cet épisode ?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">L'épisode <strong>"{deleting?.title}"</strong> sera supprimé définitivement.</p>
          <div className="flex gap-2 mt-3">
            <Button variant="destructive" className="flex-1 rounded-xl" onClick={handleDelete}>Supprimer</Button>
            <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setDeleting(null)}>Annuler</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
