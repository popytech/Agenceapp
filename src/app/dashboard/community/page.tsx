'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { getPermissions } from '@/lib/permissions'
import {
  Globe, Star, MessageSquare, TrendingUp, Plus, X,
  Instagram, Facebook, Youtube, Linkedin, Eye,
  CheckCircle, Clock, Building, Users, Search,
  Send, Edit2, Trash2, ExternalLink, CalendarDays, ChevronLeft, ChevronRight, Hash,
  Sparkles, Loader2, Heart, MessageCircle, Share2, Bookmark, MoreHorizontal,
  Image, Check, RefreshCw, Repeat2, BarChart2, ThumbsUp, Twitter, Download,
  Link2, Unlink, Zap, AlertCircle, FileText, Upload, FolderOpen, FileSpreadsheet,
  Presentation, FileImage, File
} from 'lucide-react'

type Tab = 'publications' | 'avis' | 'comptes' | 'calendrier' | 'hashtags' | 'stats' | 'connexions' | 'documents'
type Scope = 'agence' | 'clients'

interface Profile { id: string; full_name: string; role: string; avatar_url?: string }
interface Client { id: string; company_name: string; contact_name: string }
interface Publication {
  id: string; title: string; content: string; platform: string; content_type: string
  status: string; scheduled_at: string | null; published_at: string | null
  client_id: string | null; assigned_to: string | null; created_by: string
  created_at: string; notes: string | null; media_url: string | null
  workflow_step: string | null; proof_url: string | null; proof_link: string | null
  reach: number; likes: number; comments: number; shares: number
  client?: { company_name: string }; assignee?: { full_name: string }
}
interface Review {
  id: string; platform: string; reviewer_name: string; rating: number; content: string
  account_type: string; client_id: string | null; status: string; response: string | null
  review_date: string; created_at: string
  client?: { company_name: string }
}
interface Account {
  id: string; name: string; platform: string; account_url: string | null
  account_type: string; client_id: string | null; followers_count: number; bio: string | null
  client?: { company_name: string }
}
interface Hashtag {
  id: string; tag: string; platform: string; category: string | null
  usage_count: number; client_id: string | null; created_at: string
  client?: { company_name: string }
}
interface ConnectedAccount {
  id: string; platform: string; platform_username: string | null
  platform_page_name: string | null; avatar_url: string | null
  followers_count: number; token_expires_at: string | null
  client_id: string | null; created_at: string; ig_user_id: string | null
}

interface CmDocument {
  id: string; title: string; description: string | null; category: string
  file_name: string; file_url: string; file_size: number
  client_id: string | null; scope: string; created_at: string
  uploaded_by: string | null
  client?: { company_name: string }
  uploader?: { full_name: string }
}

const PLATFORMS = ['instagram', 'facebook', 'twitter', 'linkedin', 'youtube', 'tiktok', 'autre']
const PLATFORM_LABELS: Record<string, string> = { instagram: 'Instagram', facebook: 'Facebook', twitter: 'Twitter/X', linkedin: 'LinkedIn', youtube: 'YouTube', tiktok: 'TikTok', autre: 'Autre' }
const CONTENT_TYPES = ['post', 'story', 'reel', 'video', 'article', 'autre']
const CONTENT_TYPE_LABELS: Record<string, string> = { post: 'Post', story: 'Story', reel: 'Reel', video: 'Vidéo', article: 'Article', autre: 'Autre' }
const STATUS_PUB = ['a_creer', 'en_validation', 'programme', 'publie', 'refuse']
const STATUS_PUB_LABELS: Record<string, string> = { a_creer: 'À créer', en_validation: 'En validation', programme: 'Programmé', publie: 'Publié', refuse: 'Refusé' }

function PlatformIcon({ platform, size = 16 }: { platform: string; size?: number }) {
  const p = platform?.toLowerCase()
  if (p?.includes('instagram')) return <Instagram size={size} className="text-pink-500" />
  if (p?.includes('facebook')) return <Facebook size={size} className="text-blue-600" />
  if (p?.includes('twitter') || p?.includes('x')) return <Twitter size={size} className="text-sky-500" />
  if (p?.includes('linkedin')) return <Linkedin size={size} className="text-blue-700" />
  if (p?.includes('youtube')) return <Youtube size={size} className="text-red-600" />
  if (p?.includes('tiktok')) return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className="text-black">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.32 6.32 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.16 8.16 0 004.78 1.52V6.75a4.85 4.85 0 01-1.01-.06z"/>
    </svg>
  )
  return <Globe size={size} className="text-muted-foreground" />
}

function StarRating({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(i => (
        <Star key={i} size={size} className={i <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'} />
      ))}
    </div>
  )
}

const STATUS_CONFIG: Record<string, { label: string; cls: string; dot: string }> = {
  a_creer: { label: 'À créer', cls: 'bg-muted text-muted-foreground', dot: 'bg-muted-foreground' },
  en_validation: { label: 'En validation', cls: 'bg-orange-100 text-orange-700', dot: 'bg-orange-400' },
  programme: { label: 'Programmé', cls: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
  publie: { label: 'Publié', cls: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
  refuse: { label: 'Refusé', cls: 'bg-red-100 text-red-700', dot: 'bg-red-400' },
  pending: { label: 'En attente', cls: 'bg-orange-100 text-orange-700', dot: 'bg-orange-400' },
  responded: { label: 'Répondu', cls: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
  ignored: { label: 'Ignoré', cls: 'bg-muted text-muted-foreground', dot: 'bg-muted-foreground/60' },
}

function StatusBadge({ status }: { status: string }) {
  const c = STATUS_CONFIG[status] || { label: status, cls: 'bg-muted text-muted-foreground', dot: 'bg-muted-foreground' }
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full font-medium ${c.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  )
}

function InstagramPreview({ content, mediaUrl, accountName }: { content: string; mediaUrl?: string; accountName: string }) {
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden max-w-sm w-full shadow-sm">
      <div className="flex items-center justify-between px-3 py-2.5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 via-purple-500 to-orange-400 flex items-center justify-center text-white text-xs font-bold">
            {accountName?.slice(0,1)?.toUpperCase() || 'A'}
          </div>
          <div>
            <p className="text-xs font-semibold text-foreground">{accountName || 'votre_compte'}</p>
            <p className="text-[10px] text-muted-foreground">Sponsorisé</p>
          </div>
        </div>
        <MoreHorizontal size={18} className="text-muted-foreground" />
      </div>
      <div className="aspect-square bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 flex items-center justify-center">
        {mediaUrl ? (
          <img src={mediaUrl} alt="preview" className="w-full h-full object-cover" />
        ) : (
          <div className="text-center text-gray-300">
            <Image size={40} className="mx-auto mb-2" />
            <p className="text-xs">Votre visuel ici</p>
          </div>
        )}
      </div>
      <div className="px-3 py-2">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <Heart size={22} className="text-foreground" />
            <MessageCircle size={22} className="text-foreground" />
            <Share2 size={22} className="text-foreground" />
          </div>
          <Bookmark size={22} className="text-foreground" />
        </div>
        <p className="text-xs font-semibold text-foreground mb-0.5">1 234 J&apos;aime</p>
        <p className="text-xs text-foreground leading-relaxed line-clamp-3">
          <span className="font-semibold">{accountName || 'votre_compte'} </span>
          {content || <span className="text-muted-foreground italic">Votre contenu apparaîtra ici...</span>}
        </p>
        <p className="text-[10px] text-muted-foreground mt-1">Il y a quelques secondes</p>
      </div>
    </div>
  )
}

function LinkedInPreview({ content, mediaUrl, accountName }: { content: string; mediaUrl?: string; accountName: string }) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden max-w-sm w-full shadow-sm">
      <div className="p-4">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-blue-700 flex items-center justify-center text-white text-sm font-bold shrink-0">
            {accountName?.slice(0,1)?.toUpperCase() || 'A'}
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">{accountName || 'Votre Nom'}</p>
            <p className="text-xs text-muted-foreground">Agence digitale • 1er</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock size={10} /> À l&apos;instant • <Globe size={10} /></p>
          </div>
          <button className="text-xs text-blue-700 font-semibold border border-blue-700 rounded-full px-2 py-0.5">+ Suivre</button>
        </div>
        <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap line-clamp-5">
          {content || <span className="text-muted-foreground italic">Votre contenu apparaîtra ici...</span>}
        </p>
      </div>
      {mediaUrl ? (
        <div className="border-t border-border">
          <img src={mediaUrl} alt="preview" className="w-full h-48 object-cover" />
        </div>
      ) : (
        <div className="border-t border-border bg-background h-32 flex items-center justify-center">
          <div className="text-center text-gray-300">
            <Image size={28} className="mx-auto mb-1" />
            <p className="text-xs">Visuel optionnel</p>
          </div>
        </div>
      )}
      <div className="px-4 py-2 border-t border-border">
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <button className="flex items-center gap-1 hover:text-blue-700 transition-colors py-1"><ThumbsUp size={14} /> J&apos;aime</button>
          <button className="flex items-center gap-1 hover:text-blue-700 transition-colors py-1"><MessageCircle size={14} /> Commenter</button>
          <button className="flex items-center gap-1 hover:text-blue-700 transition-colors py-1"><Repeat2 size={14} /> Republier</button>
          <button className="flex items-center gap-1 hover:text-blue-700 transition-colors py-1"><Send size={14} /> Envoyer</button>
        </div>
      </div>
    </div>
  )
}

function TwitterPreview({ content, accountName }: { content: string; accountName: string }) {
  const handle = accountName?.toLowerCase().replace(/\s+/g, '_') || 'votre_compte'
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden max-w-sm w-full shadow-sm p-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-sky-500 flex items-center justify-center text-white text-sm font-bold shrink-0">
          {accountName?.slice(0,1)?.toUpperCase() || 'A'}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm font-bold text-foreground">{accountName || 'Votre compte'}</span>
            <Check size={14} className="text-sky-500" />
            <span className="text-xs text-muted-foreground">@{handle} · maintenant</span>
          </div>
          <p className="text-sm text-foreground mt-1 leading-relaxed whitespace-pre-wrap">
            {content || <span className="text-muted-foreground italic">Votre tweet apparaîtra ici...</span>}
          </p>
          <div className="flex items-center justify-between mt-3 text-muted-foreground max-w-xs">
            <button className="flex items-center gap-1.5 text-xs hover:text-sky-500 transition-colors"><MessageCircle size={16} /> 0</button>
            <button className="flex items-center gap-1.5 text-xs hover:text-green-500 transition-colors"><Repeat2 size={16} /> 0</button>
            <button className="flex items-center gap-1.5 text-xs hover:text-pink-500 transition-colors"><Heart size={16} /> 0</button>
            <button className="flex items-center gap-1.5 text-xs hover:text-sky-500 transition-colors"><BarChart2 size={16} /> 0</button>
            <button className="flex items-center gap-1.5 text-xs hover:text-sky-500 transition-colors"><Share2 size={16} /></button>
          </div>
        </div>
      </div>
    </div>
  )
}

function FacebookPreview({ content, mediaUrl, accountName }: { content: string; mediaUrl?: string; accountName: string }) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden max-w-sm w-full shadow-sm">
      <div className="p-3">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold">
            {accountName?.slice(0,1)?.toUpperCase() || 'A'}
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{accountName || 'Votre Page'}</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock size={10} /> À l&apos;instant · <Globe size={10} /></p>
          </div>
          <MoreHorizontal size={18} className="ml-auto text-muted-foreground" />
        </div>
        <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap line-clamp-4">
          {content || <span className="text-muted-foreground italic">Votre contenu apparaîtra ici...</span>}
        </p>
      </div>
      {mediaUrl ? (
        <img src={mediaUrl} alt="preview" className="w-full h-48 object-cover" />
      ) : (
        <div className="bg-background h-36 flex items-center justify-center border-t border-b border-border">
          <div className="text-center text-gray-300"><Image size={28} className="mx-auto mb-1" /><p className="text-xs">Visuel optionnel</p></div>
        </div>
      )}
      <div className="px-3 py-1.5 border-t border-border">
        <div className="flex text-xs text-muted-foreground py-1 gap-1">
          <span>👍 ❤️</span>
          <span>1 234 réactions</span>
          <span className="ml-auto">56 commentaires</span>
        </div>
        <div className="border-t border-border flex items-center justify-around pt-1">
          {['👍 J\'aime', '💬 Commenter', '↗ Partager'].map((label) => (
            <button key={label} className="flex-1 flex items-center justify-center py-1.5 text-xs text-muted-foreground hover:bg-background rounded-lg transition-colors font-medium">{label}</button>
          ))}
        </div>
      </div>
    </div>
  )
}

function PostPreview({ platform, content, mediaUrl, accountName }: { platform: string; content: string; mediaUrl?: string; accountName: string }) {
  const p = platform?.toLowerCase()
  if (p?.includes('instagram')) return <InstagramPreview content={content} mediaUrl={mediaUrl} accountName={accountName} />
  if (p?.includes('linkedin')) return <LinkedInPreview content={content} mediaUrl={mediaUrl} accountName={accountName} />
  if (p?.includes('twitter') || p?.includes('x')) return <TwitterPreview content={content} accountName={accountName} />
  if (p?.includes('facebook')) return <FacebookPreview content={content} mediaUrl={mediaUrl} accountName={accountName} />
  return (
    <div className="bg-card border border-border rounded-xl p-6 max-w-sm w-full shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <PlatformIcon platform={platform} size={20} />
        <span className="font-semibold text-foreground text-sm">{platform}</span>
      </div>
      <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
        {content || <span className="text-muted-foreground italic">Votre contenu apparaîtra ici...</span>}
      </p>
      {mediaUrl && <img src={mediaUrl} alt="preview" className="mt-3 w-full h-40 object-cover rounded-lg" />}
    </div>
  )
}

const DAYS_FR = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const MONTHS_FR = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']

function CalendrierEditorial({ publications, calendarDate, setCalendarDate, onEdit, clients }: {
  publications: Publication[]
  calendarDate: Date
  setCalendarDate: (d: Date) => void
  onEdit: (pub: Publication) => void
  clients: Client[]
}) {
  const [pdfClientId, setPdfClientId] = useState('')

  const year = calendarDate.getFullYear()
  const month = calendarDate.getMonth()

  async function downloadPDF() {
    const { default: jsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

    const clientName = pdfClientId
      ? (clients.find(c => c.id === pdfClientId)?.company_name || 'Client')
      : 'Agence'

    const filtered = pdfClientId
      ? publications.filter(p => p.client_id === pdfClientId)
      : publications.filter(p => !p.client_id)

    const monthPubs = filtered.filter(p => {
      const date = p.scheduled_at || p.published_at
      if (!date) return true
      const d = new Date(date)
      return d.getFullYear() === year && d.getMonth() === month
    }).sort((a, b) => {
      const da = a.scheduled_at || a.published_at || a.created_at
      const db = b.scheduled_at || b.published_at || b.created_at
      return new Date(da).getTime() - new Date(db).getTime()
    })

    // Header
    doc.setFillColor(79, 70, 229)
    doc.rect(0, 0, 297, 20, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('POPY TECH — Calendrier Éditorial', 10, 13)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`${clientName} · ${MONTHS_FR[month]} ${year}`, 200, 13)

    doc.setTextColor(30, 30, 30)
    doc.setFontSize(10)
    doc.text(`Client : ${clientName}`, 10, 28)
    doc.text(`Période : ${MONTHS_FR[month]} ${year}`, 10, 34)
    doc.text(`Généré le : ${new Date().toLocaleDateString('fr-FR')}`, 10, 40)
    doc.text(`Total publications : ${monthPubs.length}`, 100, 28)
    doc.text(`Publiées : ${monthPubs.filter(p => p.status === 'publie').length}`, 100, 34)
    doc.text(`Programmées : ${monthPubs.filter(p => p.status === 'programme').length}`, 100, 40)

    if (monthPubs.length === 0) {
      doc.setTextColor(150, 150, 150)
      doc.setFontSize(12)
      doc.text('Aucune publication ce mois-ci', 100, 70)
    } else {
      autoTable(doc, {
        startY: 48,
        head: [['Date', 'Titre', 'Plateforme', 'Format', 'Statut', 'Assigné à', 'Notes']],
        body: monthPubs.map(p => {
          const date = p.scheduled_at || p.published_at
          return [
            date ? new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }) : 'Non définie',
            p.title || '—',
            PLATFORM_LABELS[p.platform] || p.platform,
            CONTENT_TYPE_LABELS[p.content_type] || p.content_type,
            STATUS_PUB_LABELS[p.status] || p.status,
            p.assignee?.full_name || '—',
            p.notes || '—',
          ]
        }),
        styles: { fontSize: 8, cellPadding: 3 },
        headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 247, 255] },
        columnStyles: {
          0: { cellWidth: 18 },
          1: { cellWidth: 55 },
          2: { cellWidth: 25 },
          3: { cellWidth: 22 },
          4: { cellWidth: 28 },
          5: { cellWidth: 35 },
          6: { cellWidth: 'auto' },
        },
      })
    }

    // Footer
    const pageCount = (doc as unknown as { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(7)
      doc.setTextColor(150, 150, 150)
      doc.text('POPY TECH — Document confidentiel', 10, 205)
      doc.text(`Page ${i}/${pageCount}`, 280, 205, { align: 'right' })
    }

    doc.save(`calendrier-editorial-${clientName.replace(/\s+/g, '-').toLowerCase()}-${MONTHS_FR[month].toLowerCase()}-${year}.pdf`)
  }

  const firstDay = new Date(year, month, 1)
  const startDay = (firstDay.getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = []
  for (let i = 0; i < startDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)

  function pubsForDay(day: number) {
    return publications.filter(p => {
      const date = p.scheduled_at || p.published_at
      if (!date) return false
      const d = new Date(date)
      return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day
    })
  }

  const statusColors: Record<string, string> = {
    a_creer: 'bg-muted text-foreground',
    en_validation: 'bg-orange-100 text-orange-700',
    programme: 'bg-blue-100 text-blue-700',
    publie: 'bg-green-100 text-green-700',
    refuse: 'bg-red-100 text-red-700',
  }
  const today = new Date()

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button onClick={() => setCalendarDate(new Date(year, month - 1, 1))} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors"><ChevronLeft size={18} /></button>
          <h3 className="font-semibold text-foreground">{MONTHS_FR[month]} {year}</h3>
          <button onClick={() => setCalendarDate(new Date(year, month + 1, 1))} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors"><ChevronRight size={18} /></button>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={pdfClientId}
            onChange={e => setPdfClientId(e.target.value)}
            className="border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-card"
          >
            <option value="">Agence (interne)</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
          </select>
          <button
            onClick={downloadPDF}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors"
          >
            <Download size={13} /> PDF
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 border-b border-border">
        {DAYS_FR.map(d => <div key={d} className="py-2 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 divide-x divide-y divide-border">
        {cells.map((day, i) => {
          const isToday = day !== null && today.getDate() === day && today.getMonth() === month && today.getFullYear() === year
          const pubs = day ? pubsForDay(day) : []
          return (
            <div key={i} className={`min-h-[80px] p-1.5 ${!day ? 'bg-muted/50' : 'hover:bg-primary/5 transition-colors'}`}>
              {day && (
                <>
                  <span className={`inline-flex items-center justify-center w-6 h-6 text-xs font-medium rounded-full mb-1 ${isToday ? 'bg-indigo-600 text-white' : 'text-muted-foreground'}`}>{day}</span>
                  <div className="space-y-0.5">
                    {pubs.slice(0, 3).map(pub => (
                      <button key={pub.id} onClick={() => onEdit(pub)} className={`w-full text-left text-[10px] px-1.5 py-0.5 rounded truncate font-medium leading-4 ${statusColors[pub.status] || 'bg-muted text-muted-foreground'}`}>
                        {pub.platform?.slice(0,3)} {pub.title || pub.content?.slice(0, 20)}
                      </button>
                    ))}
                    {pubs.length > 3 && <span className="text-[10px] text-indigo-500 font-medium pl-1">+{pubs.length - 3} autres</span>}
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>
      <div className="flex items-center gap-3 px-5 py-3 border-t border-border flex-wrap">
        <span className="text-xs text-muted-foreground font-medium">Statuts :</span>
        {Object.entries({ a_creer: 'À créer', en_validation: 'En validation', programme: 'Programmé', publie: 'Publié' }).map(([k, v]) => (
          <span key={k} className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[k]}`}>{v}</span>
        ))}
      </div>
    </div>
  )
}

export default function CommunityPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [clients, setClients] = useState<Client[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [publications, setPublications] = useState<Publication[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [hashtags, setHashtags] = useState<Hashtag[]>([])
  const [connectedAccounts, setConnectedAccounts] = useState<ConnectedAccount[]>([])
  const [publishingViaApi, setPublishingViaApi] = useState(false)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('publications')
  const [scope, setScope] = useState<Scope>('agence')
  const [selectedClient, setSelectedClient] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [filterPlatform, setFilterPlatform] = useState('all')
  const [calendarDate, setCalendarDate] = useState(new Date())
  const [filterStatus, setFilterStatus] = useState('all')

  // Documents CM
  const [cmDocuments, setCmDocuments] = useState<CmDocument[]>([])
  const [showDocModal, setShowDocModal] = useState(false)
  const [docUploading, setDocUploading] = useState(false)
  const [docFilterCategory, setDocFilterCategory] = useState('all')
  const [docForm, setDocForm] = useState({ title: '', description: '', category: 'calendrier_editorial', client_id: '', scope: 'agence' as 'agence' | 'clients' })
  const [docFile, setDocFile] = useState<File | null>(null)

  const [showPubModal, setShowPubModal] = useState(false)
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [showAccountModal, setShowAccountModal] = useState(false)
  const [showResponseModal, setShowResponseModal] = useState(false)
  const [showHashtagModal, setShowHashtagModal] = useState(false)
  const [editPub, setEditPub] = useState<Publication | null>(null)
  const [editReview, setEditReview] = useState<Review | null>(null)
  const [editAccount, setEditAccount] = useState<Account | null>(null)
  const [respondingReview, setRespondingReview] = useState<Review | null>(null)

  const [pubForm, setPubForm] = useState({ title: '', content: '', platform: 'instagram', content_type: 'post', status: 'a_creer', scheduled_at: '', client_id: '', assigned_to: '', notes: '', media_url: '', workflow_step: 'script', proof_url: '', proof_link: '', reach: 0, likes: 0, comments: 0, shares: 0 })
  const [aiGenPub, setAiGenPub] = useState(false)
  const [aiSuggestHash, setAiSuggestHash] = useState(false)
  const [aiSuggestedHashtags, setAiSuggestedHashtags] = useState<string[]>([])
  const [reviewForm, setReviewForm] = useState({ platform: 'Google', reviewer_name: '', rating: 5, content: '', account_type: 'agence', client_id: '', review_date: new Date().toISOString().split('T')[0] })
  const [accountForm, setAccountForm] = useState({ name: '', platform: 'Instagram', account_url: '', account_type: 'agence', client_id: '', followers_count: 0, bio: '' })
  const [responseText, setResponseText] = useState('')
  const [aiGenResponse, setAiGenResponse] = useState(false)
  const [hashtagForm, setHashtagForm] = useState({ tag: '', platform: 'Instagram', category: '', client_id: '' })
  const [saving, setSaving] = useState(false)
  const [charCount, setCharCount] = useState(0)
  const [showPreviewModal, setShowPreviewModal] = useState(false)

  const MAX_CHARS: Record<string, number> = {
    'twitter': 280, 'linkedin': 3000, 'instagram': 2200, 'facebook': 63206,
    'tiktok': 2200, 'youtube': 5000, 'autre': 5000
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const user = data?.user
      if (!user) return
      supabase.from('profiles').select('*').eq('id', user.id).single().then(({ data: profileData }) => {
        if (profileData) setProfile(profileData as Profile)
      })
    })
  }, [])

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [pubRes, revRes, accRes, clientRes, profRes, hashRes, docRes] = await Promise.all([
      supabase.from('publications').select('*, client:clients(company_name), assignee:profiles!publications_assigned_to_fkey(full_name)').order('created_at', { ascending: false }),
      supabase.from('community_reviews').select('*, client:clients(company_name)').order('review_date', { ascending: false }),
      supabase.from('community_accounts').select('*, client:clients(company_name)').order('created_at', { ascending: false }),
      supabase.from('clients').select('id, company_name, contact_name').order('company_name'),
      supabase.from('profiles').select('id, full_name, role').order('full_name'),
      supabase.from('community_hashtags').select('*, client:clients(company_name)').order('usage_count', { ascending: false }),
      supabase.from('cm_documents').select('*, client:clients(company_name), uploader:profiles!cm_documents_uploaded_by_fkey(full_name)').order('created_at', { ascending: false }),
    ])
    if (pubRes.data) setPublications(pubRes.data as Publication[])
    if (revRes.data) setReviews(revRes.data as Review[])
    if (accRes.data) setAccounts(accRes.data as Account[])
    if (clientRes.data) setClients(clientRes.data)
    if (profRes.data) setProfiles(profRes.data)
    if (hashRes.data) setHashtags(hashRes.data as Hashtag[])
    if (docRes.data) setCmDocuments(docRes.data as CmDocument[])

    // Load connected social accounts
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const res = await fetch(`/api/social/accounts?userId=${user.id}`)
      const data = await res.json()
      if (data.accounts) setConnectedAccounts(data.accounts)
    }

    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const permissions = profile ? getPermissions(profile.role) : null
  if (!loading && permissions && !permissions.canViewCommunity) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Accès non autorisé</div>
  }

  const totalPubs = publications.length
  const publiées = publications.filter(p => p.status === 'publie').length
  const planifiées = publications.filter(p => p.status === 'programme').length
  const enValidation = publications.filter(p => p.status === 'en_validation').length
  const avgRating = reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : '—'
  const pendingReviews = reviews.filter(r => r.status === 'pending').length
  const totalFollowers = accounts.reduce((s, a) => s + (a.followers_count || 0), 0)

  const filteredPubs = publications.filter(p => {
    const matchScope = scope === 'agence' ? !p.client_id : !!p.client_id
    const matchClient = selectedClient === 'all' || p.client_id === selectedClient
    const matchPlatform = filterPlatform === 'all' || p.platform === filterPlatform
    const matchStatus = filterStatus === 'all' || p.status === filterStatus
    const matchSearch = !search || p.title?.toLowerCase().includes(search.toLowerCase()) || p.content?.toLowerCase().includes(search.toLowerCase())
    return matchScope && matchClient && matchPlatform && matchStatus && matchSearch
  })

  const filteredReviews = reviews.filter(r => {
    const matchScope = scope === 'agence' ? r.account_type === 'agence' : r.account_type === 'client'
    const matchClient = selectedClient === 'all' || r.client_id === selectedClient
    const matchPlatform = filterPlatform === 'all' || r.platform === filterPlatform
    const matchSearch = !search || r.reviewer_name?.toLowerCase().includes(search.toLowerCase()) || r.content?.toLowerCase().includes(search.toLowerCase())
    return matchScope && matchClient && matchPlatform && matchSearch
  })

  const filteredAccounts = accounts.filter(a => {
    const matchScope = scope === 'agence' ? a.account_type === 'agence' : a.account_type === 'client'
    const matchClient = selectedClient === 'all' || a.client_id === selectedClient
    const matchPlatform = filterPlatform === 'all' || a.platform === filterPlatform
    const matchSearch = !search || a.name?.toLowerCase().includes(search.toLowerCase())
    return matchScope && matchClient && matchPlatform && matchSearch
  })

  async function savePub() {
    if (!profile) return
    setSaving(true)
    const payload = {
      title: pubForm.title.trim() || pubForm.platform + ' - ' + new Date().toLocaleDateString('fr-FR'),
      content: pubForm.content, platform: pubForm.platform,
      content_type: pubForm.content_type, status: pubForm.status,
      scheduled_at: pubForm.scheduled_at || null, client_id: pubForm.client_id || null,
      assigned_to: pubForm.assigned_to || null, notes: pubForm.notes || null,
      media_url: pubForm.media_url || null, created_by: profile.id,
      workflow_step: pubForm.workflow_step || 'script',
      proof_url: pubForm.proof_url || null,
      proof_link: pubForm.proof_link || null,
      reach: pubForm.reach || 0,
      likes: pubForm.likes || 0,
      comments: pubForm.comments || 0,
      shares: pubForm.shares || 0,
    }
    let error = null
      let savedPub: Publication | null = null
      if (editPub) {
        const res = await supabase.from('publications').update(payload).eq('id', editPub.id).select('*, client:clients(company_name), assignee:profiles!publications_assigned_to_fkey(full_name)').single()
        error = res.error
        if (res.data) savedPub = res.data as Publication
      } else {
        const res = await supabase.from('publications').insert(payload).select('*, client:clients(company_name), assignee:profiles!publications_assigned_to_fkey(full_name)').single()
        error = res.error
        if (res.data) savedPub = res.data as Publication
      }
      setSaving(false)
      if (error) { console.error('savePub error:', error); alert('Erreur: ' + error.message); return }
      // Mise à jour locale — évite de re-fetcher les 6 tables
      if (savedPub) {
        if (editPub) {
          setPublications(prev => prev.map(p => p.id === editPub.id ? savedPub! : p))
        } else {
          setPublications(prev => [savedPub!, ...prev])
        }
      }
      setShowPubModal(false)
      setEditPub(null)
      setPubForm({ title: '', content: '', platform: 'instagram', content_type: 'post', status: 'a_creer', scheduled_at: '', client_id: '', assigned_to: '', notes: '', media_url: '', workflow_step: 'script', proof_url: '', proof_link: '', reach: 0, likes: 0, comments: 0, shares: 0 })
      setAiSuggestedHashtags([])
  }

  async function saveReview() {
    if (!profile) return
    setSaving(true)
    const payload = {
      platform: reviewForm.platform, reviewer_name: reviewForm.reviewer_name,
      rating: reviewForm.rating, content: reviewForm.content,
      account_type: scope === 'agence' ? 'agence' : 'client',
      client_id: reviewForm.client_id || null, review_date: reviewForm.review_date, created_by: profile.id,
    }
    if (editReview) {
      await supabase.from('community_reviews').update(payload).eq('id', editReview.id)
    } else {
      await supabase.from('community_reviews').insert(payload)
    }
    setSaving(false)
    setShowReviewModal(false)
    setEditReview(null)
    setReviewForm({ platform: 'Google', reviewer_name: '', rating: 5, content: '', account_type: 'agence', client_id: '', review_date: new Date().toISOString().split('T')[0] })
    fetchData()
  }

  async function saveAccount() {
    if (!profile) return
    setSaving(true)
    const payload = {
      name: accountForm.name, platform: accountForm.platform,
      account_url: accountForm.account_url || null,
      account_type: scope === 'agence' ? 'agence' : 'client',
      client_id: accountForm.client_id || null, followers_count: accountForm.followers_count,
      bio: accountForm.bio || null, created_by: profile.id,
    }
    if (editAccount) {
        const { data } = await supabase.from('community_accounts').update(payload).eq('id', editAccount.id).select('*, client:clients(company_name)').single()
        if (data) setAccounts(prev => prev.map(a => a.id === editAccount.id ? data as Account : a))
      } else {
        const { data } = await supabase.from('community_accounts').insert(payload).select('*, client:clients(company_name)').single()
        if (data) setAccounts(prev => [...prev, data as Account])
      }
      setSaving(false)
      setShowAccountModal(false)
      setEditAccount(null)
      setAccountForm({ name: '', platform: 'Instagram', account_url: '', account_type: 'agence', client_id: '', followers_count: 0, bio: '' })
  }

  async function submitResponse() {
    if (!respondingReview || !profile) return
    setSaving(true)
    await supabase.from('community_reviews').update({
      response: responseText, status: 'responded',
      responded_by: profile.id, responded_at: new Date().toISOString(),
    }).eq('id', respondingReview.id)
    setSaving(false)
    // Mise à jour locale
    setReviews(prev => prev.map(r => r.id === respondingReview.id
      ? { ...r, response: responseText, status: 'responded' }
      : r
    ))
    setShowResponseModal(false)
    setRespondingReview(null)
    setResponseText('')
  }

  async function uploadDocument() {
    if (!profile || !docFile || !docForm.title.trim()) return
    setDocUploading(true)
    try {
      const path = `${profile.id}/${Date.now()}-${docFile.name}`
      const { error: storageErr } = await supabase.storage.from('cm-documents').upload(path, docFile, { upsert: false })
      if (storageErr) { alert('Erreur upload : ' + storageErr.message); return }
      const { data: urlData } = supabase.storage.from('cm-documents').getPublicUrl(path)
      const { data: inserted } = await supabase.from('cm_documents').insert({
        title: docForm.title.trim(),
        description: docForm.description || null,
        category: docForm.category,
        file_name: docFile.name,
        file_url: urlData.publicUrl,
        file_size: docFile.size,
        client_id: docForm.client_id || null,
        scope: docForm.scope,
        uploaded_by: profile.id,
      }).select('*, client:clients(company_name), uploader:profiles!cm_documents_uploaded_by_fkey(full_name)').single()
      if (inserted) setCmDocuments(prev => [inserted as CmDocument, ...prev])
      setShowDocModal(false)
      setDocFile(null)
      setDocForm({ title: '', description: '', category: 'calendrier_editorial', client_id: '', scope: 'agence' })
    } finally {
      setDocUploading(false)
    }
  }

  async function deleteDocument(doc: CmDocument) {
    if (!confirm('Supprimer ce document ?')) return
    const pathPart = doc.file_url.split('/cm-documents/')[1]
    if (pathPart) await supabase.storage.from('cm-documents').remove([pathPart])
    await supabase.from('cm_documents').delete().eq('id', doc.id)
    setCmDocuments(prev => prev.filter(d => d.id !== doc.id))
  }

  async function deletePub(id: string) { await supabase.from('publications').delete().eq('id', id); fetchData() }
  async function deleteReview(id: string) { await supabase.from('community_reviews').delete().eq('id', id); fetchData() }
  async function deleteAccount(id: string) { await supabase.from('community_accounts').delete().eq('id', id); fetchData() }

  async function saveHashtag() {
    if (!profile || !hashtagForm.tag.trim()) return
    setSaving(true)
    const tag = hashtagForm.tag.startsWith('#') ? hashtagForm.tag : `#${hashtagForm.tag}`
    const { data } = await supabase.from('community_hashtags').insert({
      tag, platform: hashtagForm.platform, category: hashtagForm.category || null,
      client_id: hashtagForm.client_id || null, created_by: profile.id,
    }).select('*, client:clients(company_name)').single()
    setSaving(false)
    if (data) setHashtags(prev => [data as Hashtag, ...prev])
    setShowHashtagModal(false)
    setHashtagForm({ tag: '', platform: 'Instagram', category: '', client_id: '' })
  }

  async function incrementHashtag(id: string, current: number) {
    await supabase.from('community_hashtags').update({ usage_count: current + 1 }).eq('id', id)
    setHashtags(prev => prev.map(h => h.id === id ? { ...h, usage_count: current + 1 } : h))
  }
  async function deleteHashtag(id: string) { await supabase.from('community_hashtags').delete().eq('id', id); setHashtags(prev => prev.filter(h => h.id !== id)) }

  function connectMeta(clientId?: string) {
    if (!profile) return
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin
    const redirectUri = `${appUrl}/api/social/meta/callback`
    const state = `${profile.id}:${clientId || 'null'}`
    const scopes = 'pages_manage_posts,pages_read_engagement,instagram_basic,instagram_content_publish,business_management'
    const url = `https://www.facebook.com/v22.0/dialog/oauth?client_id=${process.env.NEXT_PUBLIC_META_APP_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopes}&state=${encodeURIComponent(state)}&response_type=code`
    window.open(url, '_blank', 'width=600,height=700')
  }

  function connectLinkedIn(clientId?: string) {
    if (!profile) return
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin
    const redirectUri = `${appUrl}/api/social/linkedin/callback`
    const state = `${profile.id}:${clientId || 'null'}`
    const scopes = 'openid,profile,email,w_member_social'
    const url = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${process.env.NEXT_PUBLIC_LINKEDIN_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}&state=${encodeURIComponent(state)}`
    window.open(url, '_blank', 'width=600,height=700')
  }

  function connectTikTok(clientId?: string) {
    if (!profile) return
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin
    const redirectUri = `${appUrl}/api/social/tiktok/callback`
    const state = `${profile.id}:${clientId || 'null'}`
    const url = `https://www.tiktok.com/v2/auth/authorize/?client_key=${process.env.NEXT_PUBLIC_TIKTOK_CLIENT_KEY}&scope=user.info.basic,video.publish,video.upload&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}`
    window.open(url, '_blank', 'width=600,height=700')
  }

  async function disconnectAccount(id: string) {
    await fetch(`/api/social/accounts?id=${id}`, { method: 'DELETE' })
    fetchData()
  }

  async function publishViaApi(accountId: string, platform: string) {
    if (!editPub) return
    setPublishingViaApi(true)
    try {
      let endpoint = ''
      let body: Record<string, unknown> = {
        accountId,
        content: pubForm.content,
        mediaUrl: pubForm.media_url || undefined,
        publicationId: editPub.id,
      }

      if (platform === 'facebook' || platform === 'instagram') {
        endpoint = '/api/social/meta/publish'
        body.platform = platform
      } else if (platform === 'linkedin') {
        endpoint = '/api/social/linkedin/publish'
      } else if (platform === 'tiktok') {
        endpoint = '/api/social/tiktok/publish'
        body.videoUrl = pubForm.media_url
      }

      if (!endpoint) {
        alert('Plateforme non supportée pour la publication directe')
        return
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()

      if (data.success) {
        alert(`✅ Publié avec succès${data.postUrl ? ' !\n\n' + data.postUrl : ''}`)
        setShowPubModal(false)
        setEditPub(null)
        fetchData()
      } else {
        alert('❌ Erreur : ' + (data.error || 'Publication échouée'))
      }
    } finally {
      setPublishingViaApi(false)
    }
  }

  async function generatePubWithAI() {
    setAiGenPub(true)
    try {
      const platform = pubForm.platform || 'Instagram'
      const type = pubForm.content_type || 'Post'
      const clientName = pubForm.client_id ? clients.find(c => c.id === pubForm.client_id)?.company_name : null
      const maxC = MAX_CHARS[platform] || 2200
      const prompt = clientName
        ? `Génère un ${type} ${platform} engageant pour le client "${clientName}". Inclus un titre accrocheur et le texte complet avec emojis et hashtags pertinents. Limite : ${maxC} caractères. Réponds en JSON strict : {"title": "...", "content": "..."}`
        : `Génère un ${type} ${platform} engageant pour une agence de communication digitale. Inclus un titre accrocheur et le texte complet avec emojis et hashtags. Limite : ${maxC} caractères. Réponds en JSON strict : {"title": "...", "content": "..."}`
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: prompt }] })
      })
      const data = await res.json()
      if (data.reply) {
        const jsonMatch = data.reply.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0])
          setPubForm(f => ({ ...f, title: parsed.title ?? f.title, content: parsed.content ?? f.content }))
          setCharCount((parsed.content ?? '').length)
        }
      }
    } catch { /* silent */ } finally { setAiGenPub(false) }
  }

  async function suggestHashtags() {
    setAiSuggestHash(true)
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: `Propose 10 hashtags pertinents pour ce post ${pubForm.platform} : "${pubForm.content?.slice(0,200)}". Réponds uniquement avec un tableau JSON de strings : ["#tag1", "#tag2", ...]` }]
        })
      })
      const data = await res.json()
      if (data.reply) {
        const match = data.reply.match(/\[[\s\S]*\]/)
        if (match) setAiSuggestedHashtags(JSON.parse(match[0]))
      }
    } catch { /* silent */ } finally { setAiSuggestHash(false) }
  }

  async function generateAIResponse() {
    if (!respondingReview) return
    setAiGenResponse(true)
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: `Rédige une réponse professionnelle et empathique à cet avis ${respondingReview.rating}/5 étoiles sur ${respondingReview.platform} : "${respondingReview.content}". La réponse doit être courte (3-4 phrases), polie et constructive.` }]
        })
      })
      const data = await res.json()
      if (data.reply) setResponseText(data.reply)
    } catch { /* silent */ } finally { setAiGenResponse(false) }
  }

  function openEditPub(pub: Publication) {
    setEditPub(pub)
    setPubForm({
      title: pub.title || '', content: pub.content || '', platform: pub.platform || 'instagram',
      content_type: pub.content_type || 'post', status: pub.status || 'a_creer',
      scheduled_at: pub.scheduled_at ? pub.scheduled_at.slice(0, 16) : '',
      client_id: pub.client_id || '', assigned_to: pub.assigned_to || '',
      notes: pub.notes || '', media_url: pub.media_url || '',
      workflow_step: pub.workflow_step || 'script',
      proof_url: pub.proof_url || '', proof_link: pub.proof_link || '',
      reach: pub.reach || 0, likes: pub.likes || 0,
      comments: pub.comments || 0, shares: pub.shares || 0,
    })
    setCharCount((pub.content || '').length)
    setShowPubModal(true)
  }

  const previewAccountName = pubForm.client_id
    ? clients.find(c => c.id === pubForm.client_id)?.company_name || 'Votre compte'
    : profile?.full_name || 'Votre compte'

  const maxChars = MAX_CHARS[pubForm.platform] || 5000
  const charPercent = Math.min((charCount / maxChars) * 100, 100)
  const charColor = charPercent > 90 ? 'text-red-500' : charPercent > 70 ? 'text-orange-500' : 'text-muted-foreground'

    return (
      <div className="p-3 md:p-6 space-y-4 md:space-y-6 pt-14 md:pt-6">
        {/* ── Hero Header ── */}
        <div className="relative bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 rounded-2xl p-5 md:p-6 overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-64 h-64 bg-card rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-card rounded-full translate-y-1/2 -translate-x-1/2" />
          </div>
          <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Globe size={16} className="text-indigo-200" />
                <span className="text-indigo-200 text-xs font-semibold uppercase tracking-widest">Community Management</span>
              </div>
              <h1 className="text-xl md:text-2xl font-bold text-white">Gérez votre présence digitale</h1>
              <p className="text-indigo-200 text-sm mt-1 hidden sm:block">Publications · Avis · Comptes sociaux · Calendrier · Hashtags</p>
            </div>
            <button
              onClick={() => {
                if (tab === 'publications') setShowPubModal(true)
                else if (tab === 'avis') setShowReviewModal(true)
                else if (tab === 'hashtags') setShowHashtagModal(true)
                else if (tab === 'documents') setShowDocModal(true)
                else setShowAccountModal(true)
              }}
              className="flex items-center gap-2 bg-card text-indigo-700 px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-50 transition-colors shadow-sm shrink-0"
            >
              <Plus size={16} />
              {tab === 'publications' ? 'Nouvelle publication' : tab === 'avis' ? 'Ajouter un avis' : tab === 'hashtags' ? 'Ajouter hashtag' : tab === 'documents' ? 'Uploader un document' : 'Ajouter un compte'}
            </button>
          </div>
        </div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Publications', value: totalPubs, sub: `${publiées} publiées · ${planifiées} planifiées`, icon: <MessageSquare size={16} />, gradient: 'from-indigo-500 to-indigo-600', light: 'bg-indigo-50 text-indigo-600', bar: 'bg-indigo-500' },
            { label: 'En validation', value: enValidation, sub: `${totalPubs} publications totales`, icon: <Clock size={16} />, gradient: 'from-orange-400 to-orange-500', light: 'bg-orange-50 text-orange-600', bar: 'bg-orange-400' },
            { label: 'Note moyenne', value: avgRating, sub: `${pendingReviews} avis en attente`, icon: <Star size={16} />, gradient: 'from-yellow-400 to-amber-500', light: 'bg-yellow-50 text-yellow-600', bar: 'bg-yellow-400' },
            { label: 'Abonnés total', value: totalFollowers.toLocaleString(), sub: `${accounts.length} comptes gérés`, icon: <Users size={16} />, gradient: 'from-emerald-500 to-green-600', light: 'bg-emerald-50 text-emerald-600', bar: 'bg-emerald-500' },
          ].map((s, i) => (
            <div key={i} className="bg-card rounded-2xl border border-border p-4 shadow-sm hover:shadow-md transition-shadow overflow-hidden relative group">
              <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-br ${s.gradient} opacity-5 rounded-full translate-x-6 -translate-y-6 group-hover:opacity-10 transition-opacity`} />
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">{s.label}</span>
                <span className={`p-1.5 rounded-lg ${s.light}`}>{s.icon}</span>
              </div>
              <p className="text-2xl font-bold text-foreground mb-1">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* ── Tabs navigation ── */}
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          {/* Tabs pills */}
          <div className="flex items-center gap-1 p-3 border-b border-border overflow-x-auto scrollbar-hide">
                  {([
                    ['publications', 'Publications', MessageSquare, publications.length],
                      ['avis', 'Avis', Star, reviews.length],
                    ['comptes', 'Comptes', Globe, accounts.length],
                    ['calendrier', 'Calendrier', CalendarDays, null],
                    ['hashtags', 'Hashtags', Hash, hashtags.length],
                    ['documents', 'Documents', FolderOpen, cmDocuments.length],
                    ['stats', 'Stats', BarChart2, null],
                    ['connexions', 'Connexions API', Link2, connectedAccounts.length],
                  ] as const).map(([id, label, Icon, count]) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                  tab === id
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <Icon size={13} />
                <span className="hidden sm:inline">{label}</span>
                {count !== null && count > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${tab === id ? 'bg-card/20 text-foreground' : 'bg-muted text-muted-foreground'}`}>
                    {count}
                  </span>
                )}
              </button>
            ))}

            {/* Scope toggle */}
            <div className="ml-auto flex items-center gap-2 shrink-0">
              <div className="hidden sm:flex bg-muted rounded-lg p-0.5 gap-0.5">
                <button onClick={() => { setScope('agence'); setSelectedClient('all') }} className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${scope === 'agence' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                  <Building size={12} /> Agence
                </button>
                <button onClick={() => setScope('clients')} className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${scope === 'clients' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                  <Users size={12} /> Clients
                </button>
              </div>
            </div>
          </div>

          {/* Filters row */}
          <div className="flex items-center gap-2 p-3 flex-wrap">
            {/* Mobile scope toggle */}
            <div className="flex sm:hidden bg-muted rounded-lg p-0.5 gap-0.5">
              <button onClick={() => { setScope('agence'); setSelectedClient('all') }} className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${scope === 'agence' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground'}`}>
                <Building size={12} /> Agence
              </button>
              <button onClick={() => setScope('clients')} className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${scope === 'clients' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground'}`}>
                <Users size={12} /> Clients
              </button>
            </div>

            {scope === 'clients' && (
              <select value={selectedClient} onChange={e => setSelectedClient(e.target.value)} className="border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-card">
                <option value="all">Tous les clients</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
              </select>
            )}

            <div className="relative flex-1 min-w-[140px]">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..." className="w-full pl-7 pr-3 py-1.5 border border-border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>

            <select value={filterPlatform} onChange={e => setFilterPlatform(e.target.value)} className="border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-card">
              <option value="all">Toutes plateformes</option>
              {PLATFORMS.map(p => <option key={p} value={p}>{PLATFORM_LABELS[p] || p}</option>)}
            </select>

              {tab === 'publications' && (
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-card">
                  <option value="all">Tous statuts</option>
                  {STATUS_PUB.map(s => <option key={s} value={s}>{STATUS_PUB_LABELS[s] || s}</option>)}
                </select>
              )}
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="h-8 w-8 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
          </div>
        ) : (
        <>
          {tab === 'publications' && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {filteredPubs.length === 0 ? (
                <div className="col-span-full bg-card rounded-2xl border border-dashed border-border p-12 text-center">
                  <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <MessageSquare size={28} className="text-indigo-300" />
                  </div>
                  <p className="text-muted-foreground font-medium">Aucune publication trouvée</p>
                  <button onClick={() => setShowPubModal(true)} className="mt-3 text-sm text-indigo-600 font-semibold hover:underline">+ Nouvelle publication</button>
                </div>
              ) : filteredPubs.map(pub => (
                <div key={pub.id} className="bg-card rounded-2xl border border-border shadow-sm hover:shadow-md transition-all group overflow-hidden">
                  {/* Card top bar colored by platform */}
                  <div className={`h-1 w-full ${
                    pub.platform?.toLowerCase().includes('instagram') ? 'bg-gradient-to-r from-pink-500 to-purple-500' :
                    pub.platform?.toLowerCase().includes('facebook') ? 'bg-blue-600' :
                    pub.platform?.toLowerCase().includes('twitter') ? 'bg-sky-400' :
                    pub.platform?.toLowerCase().includes('linkedin') ? 'bg-blue-700' :
                    pub.platform?.toLowerCase().includes('youtube') ? 'bg-red-600' :
                    'bg-indigo-500'
                  }`} />
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="p-1.5 bg-background rounded-lg shrink-0"><PlatformIcon platform={pub.platform} size={16} /></div>
                        <span className="font-semibold text-foreground text-sm truncate">{pub.title || 'Sans titre'}</span>
                      </div>
                      <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEditPub(pub)} className="p-1.5 text-muted-foreground hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><Edit2 size={13} /></button>
                        <button onClick={() => deletePub(pub.id)} className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={13} /></button>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed mb-3">{pub.content || <span className="italic text-gray-300">Aucun contenu</span>}</p>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <StatusBadge status={pub.status} />
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{pub.content_type}</span>
                      {pub.client?.company_name && <span className="text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full font-medium">{pub.client.company_name}</span>}
                    </div>
                      {pub.scheduled_at && (
                        <div className="mt-3 pt-3 border-t border-border flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock size={11} />
                          {new Date(pub.scheduled_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      )}
                      {/* Workflow step */}
                      {pub.workflow_step && pub.workflow_step !== 'script' && (
                        <div className="mt-2 flex items-center gap-1 text-xs text-indigo-600">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 inline-block" />
                          {({ script: 'Script', visuel: 'Visuel', video: 'Vidéo', validation: 'Validation', programmation: 'Programmation' })[pub.workflow_step] || pub.workflow_step}
                        </div>
                      )}
                      {/* Stats mini */}
                      {pub.status === 'publie' && (pub.likes || pub.comments || pub.shares || pub.reach) ? (
                        <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground border-t border-border pt-2">
                          {pub.reach ? <span>👁 {pub.reach.toLocaleString()}</span> : null}
                          {pub.likes ? <span>❤️ {pub.likes}</span> : null}
                          {pub.comments ? <span>💬 {pub.comments}</span> : null}
                          {pub.shares ? <span>🔁 {pub.shares}</span> : null}
                          {pub.proof_link && <a href={pub.proof_link} target="_blank" rel="noopener noreferrer" className="ml-auto text-indigo-500 hover:text-indigo-700"><ExternalLink size={11} /></a>}
                        </div>
                      ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'avis' && (
            <div className="space-y-3">
              {filteredReviews.length === 0 ? (
                <div className="bg-card rounded-xl border border-dashed border-border p-12 text-center">
                  <Star size={36} className="mx-auto mb-3 text-gray-200" />
                  <p className="text-muted-foreground font-medium">Aucun avis trouvé</p>
                </div>
              ) : filteredReviews.map(review => (
                <div key={review.id} className={`bg-card rounded-xl border border-border p-4 hover:shadow-sm transition-shadow group ${review.status === 'pending' ? 'border-orange-200 bg-orange-500/10' : 'border-border'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="p-2 bg-background rounded-xl shrink-0"><PlatformIcon platform={review.platform} size={20} /></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-semibold text-foreground text-sm">{review.reviewer_name || 'Anonyme'}</span>
                          <StarRating rating={review.rating} />
                          <StatusBadge status={review.status} />
                          {review.client?.company_name && <span className="text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">{review.client.company_name}</span>}
                        </div>
                        <p className="text-sm text-foreground leading-relaxed">{review.content}</p>
                        {review.response && (
                          <div className="mt-2 p-3 bg-green-50 border border-green-100 rounded-xl">
                            <p className="text-xs font-semibold text-green-700 mb-1">Votre réponse</p>
                            <p className="text-xs text-green-800 leading-relaxed">{review.response}</p>
                          </div>
                        )}
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span>{review.platform}</span>
                          <span>{new Date(review.review_date).toLocaleDateString('fr-FR')}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      {review.status !== 'responded' && (
                        <button onClick={() => { setRespondingReview(review); setResponseText(''); setShowResponseModal(true) }} className="p-1.5 text-muted-foreground hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"><Send size={14} /></button>
                      )}
                      <button onClick={() => deleteReview(review.id)} className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={14} /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'comptes' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAccounts.length === 0 ? (
                <div className="col-span-full bg-card rounded-xl border border-dashed border-border p-12 text-center">
                  <Globe size={36} className="mx-auto mb-3 text-gray-200" />
                  <p className="text-muted-foreground font-medium">Aucun compte social</p>
                </div>
              ) : filteredAccounts.map(acc => (
                <div key={acc.id} className="bg-card rounded-xl border border-border p-4 hover:shadow-md transition-all group">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-background rounded-xl"><PlatformIcon platform={acc.platform} size={22} /></div>
                      <div>
                        <p className="font-semibold text-foreground text-sm">{acc.name}</p>
                        <p className="text-xs text-muted-foreground">{acc.platform}</p>
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {acc.account_url && <a href={acc.account_url} target="_blank" rel="noopener noreferrer" className="p-1.5 text-muted-foreground hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><ExternalLink size={13} /></a>}
                      <button onClick={() => { setEditAccount(acc); setAccountForm({ name: acc.name, platform: acc.platform, account_url: acc.account_url || '', account_type: acc.account_type, client_id: acc.client_id || '', followers_count: acc.followers_count, bio: acc.bio || '' }); setShowAccountModal(true) }} className="p-1.5 text-muted-foreground hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><Edit2 size={13} /></button>
                      <button onClick={() => deleteAccount(acc.id)} className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={13} /></button>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-2">
                    <TrendingUp size={16} className="text-green-500" />
                    <span className="text-2xl font-bold text-foreground">{acc.followers_count.toLocaleString()}</span>
                    <span className="text-sm text-muted-foreground">abonnés</span>
                  </div>
                  {acc.bio && <p className="text-xs text-muted-foreground mt-2 line-clamp-2 leading-relaxed">{acc.bio}</p>}
                  {acc.client?.company_name && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <span className="text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full font-medium">{acc.client.company_name}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {tab === 'calendrier' && (
              <CalendrierEditorial publications={publications} calendarDate={calendarDate} setCalendarDate={setCalendarDate} onEdit={openEditPub} clients={clients} />
            )}

          {tab === 'hashtags' && (
              <div className="space-y-4">
                {PLATFORMS.filter(p => p !== 'Autre').map(platform => {
                  const tags = hashtags.filter(h => h.platform === platform)
                  if (tags.length === 0) return null
                  return (
                    <div key={platform} className="bg-card rounded-xl border border-border p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <PlatformIcon platform={platform} size={18} />
                        <h3 className="font-semibold text-foreground text-sm">{platform}</h3>
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{tags.length}</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {tags.map(h => (
                          <div key={h.id} className="group flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 rounded-full px-3 py-1 transition-colors cursor-default">
                            <span className="text-sm font-medium text-indigo-700">{h.tag}</span>
                            {h.usage_count > 0 && <span className="text-xs text-indigo-400">{h.usage_count}x</span>}
                            {h.client?.company_name && <span className="text-xs text-muted-foreground">· {h.client.company_name}</span>}
                            <button onClick={() => incrementHashtag(h.id, h.usage_count)} className="opacity-0 group-hover:opacity-100 text-indigo-400 hover:text-indigo-700 transition-all"><TrendingUp size={12} /></button>
                            <button onClick={() => deleteHashtag(h.id)} className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all"><X size={12} /></button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
                {hashtags.length === 0 && (
                  <div className="bg-card rounded-xl border border-dashed border-border p-12 text-center">
                    <Hash size={36} className="mx-auto mb-3 text-gray-200" />
                    <p className="text-muted-foreground font-medium">Aucun hashtag enregistré</p>
                  </div>
                )}
              </div>
            )}

            {tab === 'connexions' && (
              <div className="p-4 md:p-6 space-y-6">
                {/* Intro banner */}
                <div className="bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-200 rounded-2xl p-5">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 bg-indigo-100 rounded-xl shrink-0"><Link2 size={20} className="text-indigo-600" /></div>
                    <div>
                      <h3 className="font-bold text-foreground mb-1">Connexion directe aux plateformes sociales</h3>
                      <p className="text-sm text-muted-foreground">Connectez vos comptes Meta (Facebook + Instagram), LinkedIn et TikTok pour publier directement depuis l&apos;app sans sortir.</p>
                    </div>
                  </div>
                </div>

                {/* Plateformes disponibles */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    {
                      platform: 'facebook',
                      label: 'Facebook',
                      icon: <Facebook size={24} className="text-blue-600" />,
                      bg: 'bg-blue-50',
                      border: 'border-blue-200',
                      desc: 'Pages Facebook · Publications · Inbox',
                      color: 'text-blue-600',
                      btnClass: 'bg-blue-600 hover:bg-blue-700',
                    },
                    {
                      platform: 'instagram',
                      label: 'Instagram',
                      icon: <Instagram size={24} className="text-pink-500" />,
                      bg: 'bg-pink-50',
                      border: 'border-pink-200',
                      desc: 'Comptes Pro · Posts · Reels · Stories',
                      color: 'text-pink-600',
                      btnClass: 'bg-gradient-to-r from-pink-500 via-purple-500 to-orange-400 hover:opacity-90',
                    },
                    {
                      platform: 'linkedin',
                      label: 'LinkedIn',
                      icon: <Linkedin size={24} className="text-blue-700" />,
                      bg: 'bg-blue-50',
                      border: 'border-blue-300',
                      desc: 'Profil · Pages entreprise · Articles',
                      color: 'text-blue-700',
                      btnClass: 'bg-blue-700 hover:bg-blue-800',
                    },
                    {
                      platform: 'tiktok',
                      label: 'TikTok',
                      icon: (
                        <svg width={24} height={24} viewBox="0 0 24 24" fill="currentColor" className="text-black dark:text-white">
                          <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.32 6.32 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.16 8.16 0 004.78 1.52V6.75a4.85 4.85 0 01-1.01-.06z"/>
                        </svg>
                      ),
                      bg: 'bg-gray-50',
                      border: 'border-gray-200',
                      desc: 'Vidéos · Upload direct · Créateur',
                      color: 'text-gray-800',
                      btnClass: 'bg-gray-900 hover:bg-black',
                    },
                  ].map(p => {
                    const connected = connectedAccounts.filter(a => a.platform === p.platform)
                    return (
                      <div key={p.platform} className={`border ${p.border} ${p.bg} rounded-2xl p-5 flex flex-col gap-4`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {p.icon}
                            <div>
                              <p className="font-bold text-foreground text-sm">{p.label}</p>
                              <p className="text-xs text-muted-foreground">{p.desc}</p>
                            </div>
                          </div>
                          {connected.length > 0 && (
                            <span className="flex items-center gap-1 text-xs text-green-600 font-medium bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                              <CheckCircle size={11} /> {connected.length}
                            </span>
                          )}
                        </div>
                        {connected.length > 0 && (
                          <div className="space-y-2">
                            {connected.map(acc => (
                              <div key={acc.id} className="flex items-center gap-2 bg-card rounded-xl px-3 py-2 border border-border">
                                {acc.avatar_url ? (
                                  <img src={acc.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover shrink-0" />
                                ) : (
                                  <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">
                                    {(acc.platform_page_name || acc.platform_username || acc.platform).charAt(0).toUpperCase()}
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-semibold text-foreground truncate">{acc.platform_page_name || acc.platform_username || 'Compte connecté'}</p>
                                  {acc.followers_count > 0 && <p className="text-[10px] text-muted-foreground">{acc.followers_count.toLocaleString()} abonnés</p>}
                                </div>
                                <button
                                  onClick={() => disconnectAccount(acc.id)}
                                  className="p-1 text-muted-foreground hover:text-red-500 transition-colors shrink-0"
                                  title="Déconnecter"
                                >
                                  <Unlink size={13} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        <button
                          onClick={() => {
                            if (p.platform === 'facebook' || p.platform === 'instagram') connectMeta()
                            else if (p.platform === 'linkedin') connectLinkedIn()
                            else if (p.platform === 'tiktok') connectTikTok()
                          }}
                          className={`w-full flex items-center justify-center gap-2 py-2 px-4 text-sm font-semibold text-white rounded-xl transition-all ${p.btnClass}`}
                        >
                          <Plus size={14} />
                          {connected.length > 0 ? 'Ajouter un autre compte' : `Connecter ${p.label}`}
                        </button>
                      </div>
                    )
                  })}
                </div>

                {/* Tous les comptes connectés */}
                {connectedAccounts.length > 0 && (
                  <div className="bg-card border border-border rounded-2xl overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                      <h3 className="font-bold text-foreground text-sm">Tous les comptes connectés</h3>
                      <button onClick={fetchData} className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-700 font-medium">
                        <RefreshCw size={12} /> Actualiser
                      </button>
                    </div>
                    <div className="divide-y divide-border">
                      {connectedAccounts.map(acc => (
                        <div key={acc.id} className="flex items-center gap-4 px-5 py-3 hover:bg-muted/30 transition-colors">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            {acc.avatar_url ? (
                              <img src={acc.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
                            ) : (
                              <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                                <PlatformIcon platform={acc.platform} size={16} />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-foreground truncate">{acc.platform_page_name || acc.platform_username || 'Compte'}</p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <PlatformIcon platform={acc.platform} size={11} />
                                <span className="capitalize">{acc.platform}</span>
                                {acc.followers_count > 0 && <span>· {acc.followers_count.toLocaleString()} abonnés</span>}
                                {acc.client_id && <span>· {clients.find(c => c.id === acc.client_id)?.company_name}</span>}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              acc.token_expires_at && new Date(acc.token_expires_at) < new Date()
                                ? 'bg-red-100 text-red-600'
                                : 'bg-green-100 text-green-600'
                            }`}>
                              {acc.token_expires_at && new Date(acc.token_expires_at) < new Date() ? '⚠ Expiré' : '✓ Actif'}
                            </span>
                            <button
                              onClick={() => disconnectAccount(acc.id)}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-600 border border-red-200 bg-red-50 rounded-lg hover:bg-red-100 transition-colors font-medium"
                            >
                              <Unlink size={11} /> Déconnecter
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {connectedAccounts.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="p-4 bg-muted rounded-2xl mb-4"><Link2 size={32} className="text-muted-foreground" /></div>
                    <p className="font-semibold text-foreground mb-1">Aucun compte connecté</p>
                    <p className="text-sm text-muted-foreground max-w-xs">Connectez vos comptes ci-dessus pour publier directement depuis votre dashboard.</p>
                  </div>
                )}

                {/* Note configuration */}
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3">
                  <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-800 space-y-1">
                    <p className="font-semibold">Configuration requise</p>
                    <p>Pour activer les connexions API, ajoutez dans vos variables d&apos;environnement :</p>
                    <ul className="list-disc list-inside space-y-0.5 mt-1 font-mono text-[10px]">
                      <li>NEXT_PUBLIC_META_APP_ID + META_APP_SECRET → Facebook & Instagram</li>
                      <li>NEXT_PUBLIC_LINKEDIN_CLIENT_ID + LINKEDIN_CLIENT_SECRET → LinkedIn</li>
                      <li>NEXT_PUBLIC_TIKTOK_CLIENT_KEY + TIKTOK_CLIENT_SECRET → TikTok</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {tab === 'documents' && (() => {
              const DOC_CATEGORIES = [
                { key: 'calendrier_editorial', label: 'Calendrier éditorial', icon: CalendarDays, color: 'text-indigo-600 bg-indigo-50' },
                { key: 'strategie_publicitaire', label: 'Stratégie publicitaire', icon: TrendingUp, color: 'text-violet-600 bg-violet-50' },
                { key: 'analyse', label: 'Analyse & Rapport', icon: BarChart2, color: 'text-blue-600 bg-blue-50' },
                { key: 'brief_client', label: 'Brief client', icon: FileText, color: 'text-emerald-600 bg-emerald-50' },
                { key: 'contrat', label: 'Contrat', icon: FileSpreadsheet, color: 'text-orange-600 bg-orange-50' },
                { key: 'visuel', label: 'Visuel / Créatif', icon: FileImage, color: 'text-pink-600 bg-pink-50' },
                { key: 'presentation', label: 'Présentation', icon: Presentation, color: 'text-amber-600 bg-amber-50' },
                { key: 'autre', label: 'Autre', icon: File, color: 'text-gray-600 bg-gray-100' },
              ]
              const getCatConfig = (key: string) => DOC_CATEGORIES.find(c => c.key === key) || DOC_CATEGORIES[DOC_CATEGORIES.length - 1]
              const formatSize = (bytes: number) => bytes < 1024 ? `${bytes} o` : bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(0)} Ko` : `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
              const getFileIcon = (name: string) => {
                const ext = name.split('.').pop()?.toLowerCase()
                if (['pdf'].includes(ext || '')) return <FileText size={22} className="text-red-500" />
                if (['xls', 'xlsx', 'csv'].includes(ext || '')) return <FileSpreadsheet size={22} className="text-green-600" />
                if (['ppt', 'pptx'].includes(ext || '')) return <Presentation size={22} className="text-orange-500" />
                if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext || '')) return <FileImage size={22} className="text-pink-500" />
                if (['doc', 'docx'].includes(ext || '')) return <FileText size={22} className="text-blue-600" />
                return <File size={22} className="text-muted-foreground" />
              }
              const filtered = cmDocuments.filter(d => docFilterCategory === 'all' || d.category === docFilterCategory)
              return (
                <div className="space-y-4">
                  {/* Header filters */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-1 bg-muted rounded-xl p-1 flex-wrap">
                      <button onClick={() => setDocFilterCategory('all')} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${docFilterCategory === 'all' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                        Tous ({cmDocuments.length})
                      </button>
                      {DOC_CATEGORIES.map(cat => {
                        const count = cmDocuments.filter(d => d.category === cat.key).length
                        if (count === 0) return null
                        return (
                          <button key={cat.key} onClick={() => setDocFilterCategory(cat.key)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${docFilterCategory === cat.key ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                            {cat.label} ({count})
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Documents grid */}
                  {filtered.length === 0 ? (
                    <div className="bg-card rounded-2xl border border-dashed border-border p-16 text-center">
                      <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <FolderOpen size={32} className="text-indigo-300" />
                      </div>
                      <p className="font-semibold text-foreground mb-1">Aucun document</p>
                      <p className="text-sm text-muted-foreground mb-4">Uploadez vos calendriers éditoriaux, analyses, stratégies et plus</p>
                      <button onClick={() => setShowDocModal(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors">
                        <Upload size={14} /> Uploader un document
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {filtered.map(doc => {
                        const cat = getCatConfig(doc.category)
                        const CatIcon = cat.icon
                        return (
                          <div key={doc.id} className="bg-card rounded-2xl border border-border shadow-sm hover:shadow-md transition-all group overflow-hidden flex flex-col">
                            {/* Top color bar by category */}
                            <div className={`h-1 w-full ${
                              doc.category === 'calendrier_editorial' ? 'bg-indigo-500' :
                              doc.category === 'strategie_publicitaire' ? 'bg-violet-500' :
                              doc.category === 'analyse' ? 'bg-blue-500' :
                              doc.category === 'brief_client' ? 'bg-emerald-500' :
                              doc.category === 'contrat' ? 'bg-orange-500' :
                              doc.category === 'visuel' ? 'bg-pink-500' :
                              doc.category === 'presentation' ? 'bg-amber-500' :
                              'bg-gray-400'
                            }`} />
                            <div className="p-4 flex flex-col gap-3 flex-1">
                              {/* Icon + title */}
                              <div className="flex items-start gap-3">
                                <div className="shrink-0 p-2.5 bg-background rounded-xl border border-border">
                                  {getFileIcon(doc.file_name)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-foreground text-sm leading-snug line-clamp-2">{doc.title}</p>
                                  {doc.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{doc.description}</p>}
                                </div>
                              </div>
                              {/* Category badge */}
                              <span className={`self-start inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${cat.color}`}>
                                <CatIcon size={11} /> {cat.label}
                              </span>
                              {/* Meta */}
                              <div className="space-y-1 text-xs text-muted-foreground">
                                <div className="flex items-center gap-1.5">
                                  <File size={11} />
                                  <span className="truncate">{doc.file_name}</span>
                                  <span className="shrink-0">· {formatSize(doc.file_size)}</span>
                                </div>
                                {doc.client?.company_name && (
                                  <div className="flex items-center gap-1.5">
                                    <Building size={11} />
                                    <span className="text-indigo-600 font-medium">{doc.client.company_name}</span>
                                  </div>
                                )}
                                <div className="flex items-center gap-1.5">
                                  <Clock size={11} />
                                  {new Date(doc.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </div>
                              </div>
                              {/* Actions */}
                              <div className="flex items-center gap-2 mt-auto pt-2 border-t border-border opacity-0 group-hover:opacity-100 transition-opacity">
                                <a
                                  href={doc.file_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  download={doc.file_name}
                                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
                                >
                                  <Download size={12} /> Télécharger
                                </a>
                                <button
                                  onClick={() => deleteDocument(doc)}
                                  className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })()}

            {tab === 'stats' && (() => {
              const published = publications.filter(p => p.status === 'publie')
              const totalReach = published.reduce((s, p) => s + (p.reach || 0), 0)
              const totalLikes = published.reduce((s, p) => s + (p.likes || 0), 0)
              const totalComments = published.reduce((s, p) => s + (p.comments || 0), 0)
              const totalShares = published.reduce((s, p) => s + (p.shares || 0), 0)
              const totalEngagements = totalLikes + totalComments + totalShares
              const engagementRate = totalReach > 0 ? ((totalEngagements / totalReach) * 100).toFixed(1) : '0'
              const byPlatform = PLATFORMS.map(p => ({
                platform: p,
                count: published.filter(pub => pub.platform === p).length,
                likes: published.filter(pub => pub.platform === p).reduce((s, pub) => s + (pub.likes || 0), 0),
              })).filter(p => p.count > 0)
              return (
                <div className="space-y-5">
                  {/* KPI row */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { label: 'Portée totale', value: totalReach.toLocaleString(), icon: <Eye size={15} />, color: 'text-indigo-600 bg-indigo-50' },
                      { label: 'Likes', value: totalLikes.toLocaleString(), icon: <Heart size={15} />, color: 'text-pink-600 bg-pink-50' },
                      { label: 'Commentaires', value: totalComments.toLocaleString(), icon: <MessageCircle size={15} />, color: 'text-orange-600 bg-orange-50' },
                      { label: 'Taux engagement', value: `${engagementRate}%`, icon: <TrendingUp size={15} />, color: 'text-green-600 bg-green-50' },
                    ].map((kpi, i) => (
                      <div key={i} className="bg-card rounded-xl border border-border p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-muted-foreground font-medium">{kpi.label}</span>
                          <span className={`p-1.5 rounded-lg ${kpi.color}`}>{kpi.icon}</span>
                        </div>
                        <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
                      </div>
                    ))}
                  </div>
                  {/* Par plateforme */}
                  <div className="bg-card rounded-xl border border-border p-4">
                    <h3 className="font-semibold text-foreground text-sm mb-4">Performance par plateforme</h3>
                    {byPlatform.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-6">Aucun post publié avec statistiques</p>
                    ) : (
                      <div className="space-y-3">
                        {byPlatform.map(p => (
                          <div key={p.platform} className="flex items-center gap-3">
                            <div className="flex items-center gap-2 w-32 shrink-0">
                              <PlatformIcon platform={p.platform} size={16} />
                              <span className="text-xs font-medium text-foreground">{PLATFORM_LABELS[p.platform] || p.platform}</span>
                            </div>
                            <div className="flex-1 bg-muted rounded-full h-2">
                              <div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${Math.min((p.count / published.length) * 100, 100)}%` }} />
                            </div>
                            <span className="text-xs text-muted-foreground w-16 text-right">{p.count} posts · {p.likes} ♥</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* Top posts */}
                  <div className="bg-card rounded-xl border border-border p-4">
                    <h3 className="font-semibold text-foreground text-sm mb-4">Top posts par engagement</h3>
                    {published.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-6">Aucun post publié</p>
                    ) : (
                      <div className="space-y-2">
                        {[...published].sort((a, b) => ((b.likes||0)+(b.comments||0)+(b.shares||0)) - ((a.likes||0)+(a.comments||0)+(a.shares||0))).slice(0, 5).map(pub => (
                          <div key={pub.id} className="flex items-center gap-3 p-3 bg-background rounded-xl border border-border hover:border-indigo-200 transition-colors cursor-pointer" onClick={() => openEditPub(pub)}>
                            <div className="p-1.5 bg-card rounded-lg shrink-0"><PlatformIcon platform={pub.platform} size={14} /></div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{pub.title || pub.content?.slice(0, 40) || 'Sans titre'}</p>
                              <p className="text-xs text-muted-foreground">{pub.client?.company_name || 'Agence'}</p>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                              <span className="flex items-center gap-1"><Heart size={11} className="text-pink-400" />{pub.likes || 0}</span>
                              <span className="flex items-center gap-1"><MessageCircle size={11} className="text-orange-400" />{pub.comments || 0}</span>
                              <span className="flex items-center gap-1"><Share2 size={11} className="text-blue-400" />{pub.shares || 0}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            })()}
        </>
      )}

      {/* ======================== MODAL PUBLICATION PRO ======================== */}
      {showPubModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-stretch justify-end" onClick={e => { if (e.target === e.currentTarget) { setShowPubModal(false); setEditPub(null) } }}>
          <div className="bg-card w-full max-w-5xl flex flex-col h-full shadow-2xl">
            {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-background shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-100 rounded-lg"><PlatformIcon platform={pubForm.platform} size={18} /></div>
                  <div>
                    <h2 className="font-bold text-foreground">{editPub ? 'Modifier la publication' : 'Nouvelle publication'}</h2>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground">{pubForm.platform} · {pubForm.content_type}</span>
                      <StatusBadge status={pubForm.status} />
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowPreviewModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 border border-indigo-200 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
                  >
                    <Eye size={13} /> Aperçu
                  </button>
                  <button onClick={() => { setShowPubModal(false); setEditPub(null) }} className="p-2 text-muted-foreground hover:text-muted-foreground hover:bg-muted rounded-lg transition-colors"><X size={18} /></button>
                </div>
              </div>

              {/* Body full width */}
              <div className="flex flex-1 overflow-hidden">
                <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Plateforme</label>
                      <select value={pubForm.platform} onChange={e => setPubForm(f => ({ ...f, platform: e.target.value }))} className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-card focus:outline-none focus:ring-2 focus:ring-indigo-300">
                        {PLATFORMS.map(p => <option key={p} value={p}>{PLATFORM_LABELS[p] || p}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Format</label>
                      <select value={pubForm.content_type} onChange={e => setPubForm(f => ({ ...f, content_type: e.target.value }))} className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-card focus:outline-none focus:ring-2 focus:ring-indigo-300">
                        {CONTENT_TYPES.map(t => <option key={t} value={t}>{CONTENT_TYPE_LABELS[t] || t}</option>)}
                      </select>
                    </div>
                  </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Titre interne</label>
                  <input value={pubForm.title} onChange={e => setPubForm(f => ({ ...f, title: e.target.value }))} className="w-full border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" placeholder="Pour vous repérer dans la liste..." />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Contenu</label>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium ${charColor}`}>{charCount}/{maxChars}</span>
                      <button onClick={generatePubWithAI} disabled={aiGenPub} className="flex items-center gap-1.5 text-xs bg-indigo-600 text-white px-2.5 py-1 rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition-colors font-medium">
                        {aiGenPub ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                        {aiGenPub ? 'Génération...' : 'Générer avec IA'}
                      </button>
                    </div>
                  </div>
                  <textarea
                    value={pubForm.content}
                    onChange={e => { setPubForm(f => ({ ...f, content: e.target.value })); setCharCount(e.target.value.length) }}
                    rows={8}
                    className="w-full border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none leading-relaxed"
                    placeholder={`Écrivez votre ${pubForm.content_type?.toLowerCase()} ${pubForm.platform}...`}
                  />
                  <div className="mt-1.5 bg-muted rounded-full h-1">
                    <div className={`h-1 rounded-full transition-all ${charPercent > 90 ? 'bg-red-500' : charPercent > 70 ? 'bg-orange-400' : 'bg-indigo-500'}`} style={{ width: `${charPercent}%` }} />
                  </div>
                </div>

                {pubForm.content && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Hashtags suggérés par IA</label>
                      <button onClick={suggestHashtags} disabled={aiSuggestHash} className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium disabled:opacity-50">
                        {aiSuggestHash ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
                        {aiSuggestHash ? 'Analyse...' : 'Générer'}
                      </button>
                    </div>
                    {aiSuggestedHashtags.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {aiSuggestedHashtags.map((tag, i) => (
                          <button key={i} onClick={() => setPubForm(f => ({ ...f, content: f.content + ' ' + tag }))} className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded-full hover:bg-indigo-100 transition-colors font-medium">
                            {tag}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">Cliquez sur &quot;Générer&quot; pour obtenir des hashtags adaptés</p>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">URL du visuel</label>
                    <input value={pubForm.media_url} onChange={e => setPubForm(f => ({ ...f, media_url: e.target.value }))} className="w-full border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" placeholder="https://..." />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Statut</label>
                      <select value={pubForm.status} onChange={e => setPubForm(f => ({ ...f, status: e.target.value }))} className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-card focus:outline-none focus:ring-2 focus:ring-indigo-300">
                        {STATUS_PUB.map(s => <option key={s} value={s}>{STATUS_PUB_LABELS[s] || s}</option>)}
                      </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Date de publication</label>
                    <input type="datetime-local" value={pubForm.scheduled_at} onChange={e => setPubForm(f => ({ ...f, scheduled_at: e.target.value }))} className="w-full border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Assigné à</label>
                    <select value={pubForm.assigned_to} onChange={e => setPubForm(f => ({ ...f, assigned_to: e.target.value }))} className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-card focus:outline-none focus:ring-2 focus:ring-indigo-300">
                      <option value="">Non assigné</option>
                      {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                    </select>
                  </div>
                </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Client</label>
                      <select value={pubForm.client_id} onChange={e => setPubForm(f => ({ ...f, client_id: e.target.value }))} className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-card focus:outline-none focus:ring-2 focus:ring-indigo-300">
                        <option value="">Agence (interne)</option>
                        {clients.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Notes internes</label>
                      <input value={pubForm.notes} onChange={e => setPubForm(f => ({ ...f, notes: e.target.value }))} className="w-full border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" placeholder="Consignes, remarques..." />
                    </div>
                  </div>

                  {/* ── Workflow de production ── */}
                  <div className="border border-border rounded-xl p-4 bg-background">
                    <label className="block text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Workflow de production</label>
                    <div className="flex items-center gap-1 overflow-x-auto pb-1">
                      {[
                        { key: 'script', label: 'Script', icon: '📝' },
                        { key: 'visuel', label: 'Visuel', icon: '🎨' },
                        { key: 'video', label: 'Vidéo', icon: '🎬' },
                        { key: 'validation', label: 'Validation', icon: '✅' },
                        { key: 'programmation', label: 'Programmation', icon: '📅' },
                      ].map((step, idx, arr) => {
                        const steps = ['script', 'visuel', 'video', 'validation', 'programmation']
                        const currentIdx = steps.indexOf(pubForm.workflow_step || 'script')
                        const stepIdx = steps.indexOf(step.key)
                        const isDone = stepIdx < currentIdx
                        const isActive = step.key === pubForm.workflow_step
                        return (
                          <div key={step.key} className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => setPubForm(f => ({ ...f, workflow_step: step.key }))}
                              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium transition-all border ${
                                isActive ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' :
                                isDone ? 'bg-green-50 text-green-700 border-green-200' :
                                'bg-card text-muted-foreground border-border hover:border-indigo-200'
                              }`}
                            >
                              <span>{isDone ? '✓' : step.icon}</span>
                              <span className="whitespace-nowrap">{step.label}</span>
                            </button>
                            {idx < arr.length - 1 && <div className={`w-4 h-0.5 shrink-0 ${stepIdx < currentIdx ? 'bg-green-400' : 'bg-border'}`} />}
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* ── Preuve de publication ── */}
                  {(pubForm.status === 'publie' || pubForm.status === 'programme') && (
                    <div className="border border-border rounded-xl p-4 bg-background space-y-3">
                      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide">Preuve de publication</label>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-muted-foreground mb-1">Lien du post</label>
                          <input value={pubForm.proof_link} onChange={e => setPubForm(f => ({ ...f, proof_link: e.target.value }))} className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" placeholder="https://instagram.com/p/..." />
                        </div>
                        <div>
                          <label className="block text-xs text-muted-foreground mb-1">URL capture d&apos;écran</label>
                          <input value={pubForm.proof_url} onChange={e => setPubForm(f => ({ ...f, proof_url: e.target.value }))} className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" placeholder="https://..." />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── Stats post ── */}
                  {pubForm.status === 'publie' && (
                    <div className="border border-border rounded-xl p-4 bg-background">
                      <label className="block text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Statistiques du post</label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {[
                          { key: 'reach', label: 'Portée', icon: '👁️' },
                          { key: 'likes', label: 'Likes', icon: '❤️' },
                          { key: 'comments', label: 'Commentaires', icon: '💬' },
                          { key: 'shares', label: 'Partages', icon: '🔁' },
                        ].map(s => (
                          <div key={s.key}>
                            <label className="block text-xs text-muted-foreground mb-1">{s.icon} {s.label}</label>
                            <input
                              type="number"
                              min="0"
                              value={pubForm[s.key as keyof typeof pubForm] as number}
                              onChange={e => setPubForm(f => ({ ...f, [s.key]: parseInt(e.target.value) || 0 }))}
                              className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-background shrink-0 flex-wrap gap-2">
              <button onClick={() => { setShowPubModal(false); setEditPub(null) }} className="px-4 py-2 text-sm text-muted-foreground border border-border rounded-xl hover:bg-muted transition-colors">Annuler</button>
              <div className="flex items-center gap-2 flex-wrap">
                {/* Publier directement via API si compte connecté compatible */}
                {editPub && connectedAccounts.filter(a => a.platform === pubForm.platform).length > 0 && (
                  <div className="flex items-center gap-1.5">
                    {connectedAccounts.filter(a => a.platform === pubForm.platform).map(acc => (
                      <button
                        key={acc.id}
                        onClick={() => publishViaApi(acc.id, acc.platform)}
                        disabled={publishingViaApi || !pubForm.content}
                        className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-700 border border-emerald-200 bg-emerald-50 rounded-xl hover:bg-emerald-100 transition-colors disabled:opacity-50"
                      >
                        {publishingViaApi ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
                        Publier sur {acc.platform_page_name || acc.platform_username || acc.platform}
                      </button>
                    ))}
                  </div>
                )}
                <button
                  onClick={() => { setPubForm(f => ({ ...f, status: 'en_validation' })); setTimeout(savePub, 50) }}
                  disabled={saving || !pubForm.content}
                  className="px-4 py-2 text-sm text-orange-600 border border-orange-200 bg-orange-50 rounded-xl hover:bg-orange-100 transition-colors disabled:opacity-50 font-medium"
                >
                  Soumettre pour validation
                </button>
                <button onClick={savePub} disabled={saving || !pubForm.content} className="flex items-center gap-2 px-5 py-2 text-sm bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors font-medium">
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  {saving ? 'Enregistrement...' : editPub ? 'Mettre à jour' : 'Enregistrer'}
                </button>
              </div>
            </div>
        </div>
        </div>
      )}

      {/* ======================== MODAL APERÇU ======================== */}
      {showPreviewModal && (
        <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4" onClick={() => setShowPreviewModal(false)}>
          <div className="bg-muted rounded-2xl p-6 max-w-sm w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <PlatformIcon platform={pubForm.platform} size={18} />
                <span className="font-semibold text-foreground text-sm">Aperçu {pubForm.platform}</span>
              </div>
              <button onClick={() => setShowPreviewModal(false)} className="p-1.5 text-muted-foreground hover:text-muted-foreground hover:bg-muted rounded-lg transition-colors"><X size={16} /></button>
            </div>
            <div className="flex justify-center">
              <PostPreview
                platform={pubForm.platform}
                content={pubForm.content}
                mediaUrl={pubForm.media_url || undefined}
                accountName={previewAccountName}
              />
            </div>
          </div>
        </div>
      )}

      {/* MODAL AVIS */}
      {showReviewModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="font-bold text-foreground">{editReview ? 'Modifier l\'avis' : 'Ajouter un avis'}</h2>
              <button onClick={() => { setShowReviewModal(false); setEditReview(null) }} className="text-muted-foreground hover:text-muted-foreground"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Plateforme</label>
                  <select value={reviewForm.platform} onChange={e => setReviewForm(f => ({ ...f, platform: e.target.value }))} className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                    {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Date</label>
                  <input type="date" value={reviewForm.review_date} onChange={e => setReviewForm(f => ({ ...f, review_date: e.target.value }))} className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Nom du rédacteur</label>
                <input value={reviewForm.reviewer_name} onChange={e => setReviewForm(f => ({ ...f, reviewer_name: e.target.value }))} className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" placeholder="Jean Dupont" />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Note</label>
                <div className="flex gap-2 items-center">
                  {[1,2,3,4,5].map(n => (
                    <button key={n} onClick={() => setReviewForm(f => ({ ...f, rating: n }))} className="transition-transform hover:scale-125">
                      <Star size={26} className={n <= reviewForm.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'} />
                    </button>
                  ))}
                  <span className="text-sm font-semibold text-foreground ml-1">{reviewForm.rating}/5</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Contenu de l&apos;avis</label>
                <textarea value={reviewForm.content} onChange={e => setReviewForm(f => ({ ...f, content: e.target.value }))} rows={3} className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none" placeholder="Texte de l'avis..." />
              </div>
              {scope === 'clients' && (
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Client concerné</label>
                  <select value={reviewForm.client_id} onChange={e => setReviewForm(f => ({ ...f, client_id: e.target.value }))} className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                    <option value="">Sélectionner un client</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                  </select>
                </div>
              )}
            </div>
            <div className="p-5 border-t flex justify-end gap-3">
              <button onClick={() => { setShowReviewModal(false); setEditReview(null) }} className="px-4 py-2 text-sm text-muted-foreground border border-border rounded-lg hover:bg-background">Annuler</button>
              <button onClick={saveReview} disabled={saving} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                {saving ? 'Enregistrement...' : editReview ? 'Mettre à jour' : 'Ajouter'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL COMPTE */}
      {showAccountModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="font-bold text-foreground">{editAccount ? 'Modifier le compte' : 'Ajouter un compte'}</h2>
              <button onClick={() => { setShowAccountModal(false); setEditAccount(null) }} className="text-muted-foreground hover:text-muted-foreground"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Nom du compte</label>
                <input value={accountForm.name} onChange={e => setAccountForm(f => ({ ...f, name: e.target.value }))} className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" placeholder="@popy_tech" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Plateforme</label>
                  <select value={accountForm.platform} onChange={e => setAccountForm(f => ({ ...f, platform: e.target.value }))} className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                    {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Abonnés</label>
                  <input type="number" value={accountForm.followers_count} onChange={e => setAccountForm(f => ({ ...f, followers_count: parseInt(e.target.value) || 0 }))} className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">URL du compte</label>
                <input value={accountForm.account_url} onChange={e => setAccountForm(f => ({ ...f, account_url: e.target.value }))} className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" placeholder="https://instagram.com/..." />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Bio</label>
                <textarea value={accountForm.bio} onChange={e => setAccountForm(f => ({ ...f, bio: e.target.value }))} rows={2} className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none" placeholder="Description courte..." />
              </div>
              {scope === 'clients' && (
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Client concerné</label>
                  <select value={accountForm.client_id} onChange={e => setAccountForm(f => ({ ...f, client_id: e.target.value }))} className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                    <option value="">Sélectionner un client</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                  </select>
                </div>
              )}
            </div>
            <div className="p-5 border-t flex justify-end gap-3">
              <button onClick={() => { setShowAccountModal(false); setEditAccount(null) }} className="px-4 py-2 text-sm text-muted-foreground border border-border rounded-lg hover:bg-background">Annuler</button>
              <button onClick={saveAccount} disabled={saving || !accountForm.name} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                {saving ? 'Enregistrement...' : editAccount ? 'Mettre à jour' : 'Ajouter'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL RÉPONSE AVIS */}
      {showResponseModal && respondingReview && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="font-bold text-foreground">Répondre à l&apos;avis</h2>
              <button onClick={() => setShowResponseModal(false)} className="text-muted-foreground hover:text-muted-foreground"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="p-4 bg-background rounded-xl border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-semibold text-sm text-foreground">{respondingReview.reviewer_name}</span>
                  <StarRating rating={respondingReview.rating} size={13} />
                  <span className="text-xs text-muted-foreground">{respondingReview.platform}</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{respondingReview.content}</p>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Votre réponse</label>
                  <button onClick={generateAIResponse} disabled={aiGenResponse} className="flex items-center gap-1.5 text-xs bg-indigo-600 text-white px-2.5 py-1 rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition-colors font-medium">
                    {aiGenResponse ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                    {aiGenResponse ? 'Rédaction...' : 'Rédiger avec IA'}
                  </button>
                </div>
                <textarea value={responseText} onChange={e => setResponseText(e.target.value)} rows={5} className="w-full border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none leading-relaxed" placeholder="Bonjour, merci pour votre avis..." />
              </div>
            </div>
            <div className="p-5 border-t flex justify-end gap-3">
              <button onClick={() => setShowResponseModal(false)} className="px-4 py-2 text-sm text-muted-foreground border border-border rounded-lg hover:bg-background">Annuler</button>
              <button onClick={submitResponse} disabled={saving || !responseText.trim()} className="flex items-center gap-2 px-4 py-2 text-sm bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50 transition-colors font-medium">
                <Send size={14} /> {saving ? 'Envoi...' : 'Envoyer la réponse'}
              </button>
            </div>
          </div>
        </div>
      )}

       {/* MODAL UPLOAD DOCUMENT */}
       {showDocModal && (
         <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
           <div className="bg-card rounded-2xl shadow-xl w-full max-w-lg">
             <div className="flex items-center justify-between p-5 border-b border-border">
               <div className="flex items-center gap-3">
                 <div className="p-2 bg-indigo-100 rounded-xl"><Upload size={18} className="text-indigo-600" /></div>
                 <h2 className="font-bold text-foreground">Uploader un document</h2>
               </div>
               <button onClick={() => setShowDocModal(false)} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
             </div>
             <div className="p-5 space-y-4">
               {/* Zone de dépôt de fichier */}
               <label className="block cursor-pointer">
                 <div className={`border-2 border-dashed rounded-2xl p-8 text-center transition-colors ${docFile ? 'border-indigo-400 bg-indigo-50' : 'border-border hover:border-indigo-300 hover:bg-indigo-50/50'}`}>
                   {docFile ? (
                     <div className="flex flex-col items-center gap-2">
                       <div className="p-3 bg-indigo-100 rounded-xl"><FileText size={28} className="text-indigo-600" /></div>
                       <p className="font-semibold text-foreground text-sm">{docFile.name}</p>
                       <p className="text-xs text-muted-foreground">{(docFile.size / 1024).toFixed(0)} Ko</p>
                       <span className="text-xs text-indigo-600 font-medium">Cliquez pour changer</span>
                     </div>
                   ) : (
                     <div className="flex flex-col items-center gap-2">
                       <div className="p-3 bg-muted rounded-xl"><Upload size={28} className="text-muted-foreground" /></div>
                       <p className="font-medium text-foreground text-sm">Glissez un fichier ou cliquez</p>
                       <p className="text-xs text-muted-foreground">PDF, Word, Excel, PowerPoint, Images — 20 Mo max</p>
                     </div>
                   )}
                 </div>
                 <input type="file" className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.png,.jpg,.jpeg,.gif,.webp,.zip" onChange={e => {
                   const f = e.target.files?.[0]
                   if (f) {
                     setDocFile(f)
                     if (!docForm.title) setDocForm(prev => ({ ...prev, title: f.name.replace(/\.[^.]+$/, '') }))
                   }
                 }} />
               </label>

               <div>
                 <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Titre du document</label>
                 <input value={docForm.title} onChange={e => setDocForm(f => ({ ...f, title: e.target.value }))} className="w-full border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-background" placeholder="Ex: Calendrier éditorial Mars 2026..." />
               </div>

               <div>
                 <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Description (optionnel)</label>
                 <textarea value={docForm.description} onChange={e => setDocForm(f => ({ ...f, description: e.target.value }))} rows={2} className="w-full border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none bg-background" placeholder="Notes ou contexte..." />
               </div>

               <div className="grid grid-cols-2 gap-3">
                 <div>
                   <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Catégorie</label>
                   <select value={docForm.category} onChange={e => setDocForm(f => ({ ...f, category: e.target.value }))} className="w-full border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-background">
                     <option value="calendrier_editorial">Calendrier éditorial</option>
                     <option value="strategie_publicitaire">Stratégie publicitaire</option>
                     <option value="analyse">Analyse & Rapport</option>
                     <option value="brief_client">Brief client</option>
                     <option value="contrat">Contrat</option>
                     <option value="visuel">Visuel / Créatif</option>
                     <option value="presentation">Présentation</option>
                     <option value="autre">Autre</option>
                   </select>
                 </div>
                   <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Client associé</label>
                    <select value={docForm.client_id} onChange={e => setDocForm(f => ({ ...f, client_id: e.target.value, scope: e.target.value ? 'clients' : 'agence' }))} className="w-full border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-background">
                      <option value="">Agence (interne uniquement)</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                    </select>
                  </div>
                </div>

                {/* Toggle partage client */}
                {docForm.client_id && (
                  <div className="flex items-center justify-between bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-indigo-100 rounded-lg"><Send size={14} className="text-indigo-600" /></div>
                      <div>
                        <p className="text-sm font-semibold text-indigo-900">Partager avec le client</p>
                        <p className="text-xs text-indigo-600">Le client verra ce document dans son portail</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setDocForm(f => ({ ...f, scope: f.scope === 'clients' ? 'agence' : 'clients' }))}
                      className={`relative w-12 h-6 rounded-full transition-colors ${docForm.scope === 'clients' ? 'bg-indigo-600' : 'bg-gray-300'}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${docForm.scope === 'clients' ? 'translate-x-6' : ''}`} />
                    </button>
                  </div>
                )}
             </div>
             <div className="p-5 border-t border-border flex justify-end gap-3">
               <button onClick={() => { setShowDocModal(false); setDocFile(null) }} className="px-4 py-2 text-sm text-muted-foreground border border-border rounded-xl hover:bg-muted transition-colors">Annuler</button>
               <button
                 onClick={uploadDocument}
                 disabled={docUploading || !docFile || !docForm.title.trim()}
                 className="flex items-center gap-2 px-5 py-2 text-sm bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors font-medium"
               >
                 {docUploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                 {docUploading ? 'Upload en cours...' : 'Uploader'}
               </button>
             </div>
           </div>
         </div>
       )}

        {/* MODAL HASHTAG */}
      {showHashtagModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="font-bold text-foreground">Ajouter un hashtag</h2>
              <button onClick={() => setShowHashtagModal(false)} className="text-muted-foreground hover:text-muted-foreground"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Hashtag</label>
                <input value={hashtagForm.tag} onChange={e => setHashtagForm(f => ({ ...f, tag: e.target.value }))} className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" placeholder="#marketing" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Plateforme</label>
                  <select value={hashtagForm.platform} onChange={e => setHashtagForm(f => ({ ...f, platform: e.target.value }))} className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                    {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Catégorie</label>
                  <input value={hashtagForm.category} onChange={e => setHashtagForm(f => ({ ...f, category: e.target.value }))} className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" placeholder="Tech, Mode..." />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Client (optionnel)</label>
                <select value={hashtagForm.client_id} onChange={e => setHashtagForm(f => ({ ...f, client_id: e.target.value }))} className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                  <option value="">Agence (aucun client)</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                </select>
              </div>
            </div>
            <div className="p-5 border-t flex justify-end gap-3">
              <button onClick={() => setShowHashtagModal(false)} className="px-4 py-2 text-sm text-muted-foreground border border-border rounded-lg hover:bg-background">Annuler</button>
              <button onClick={saveHashtag} disabled={saving || !hashtagForm.tag.trim()} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                {saving ? 'Ajout...' : 'Ajouter'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
