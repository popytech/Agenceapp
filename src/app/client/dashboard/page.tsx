'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { formatGNF } from '@/lib/utils'
import {
  Zap, LogOut, Building, Clock, CheckCircle2,
  FolderOpen, MessageSquare, BarChart3, ChevronRight,
  Calendar, FileText, Send, CreditCard, AlertCircle,
  CheckCheck, Inbox, Download, Activity, TrendingUp, Sparkles
} from 'lucide-react'

interface ClientSession {
  id: string
  company_name: string
  email: string
}

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  payee:         { label: 'Payée',       color: '#00E5A0', bg: 'rgba(0,229,160,0.12)',  border: 'rgba(0,229,160,0.3)' },
  impayee:       { label: 'Impayée',     color: '#FF4D4D', bg: 'rgba(255,77,77,0.12)',  border: 'rgba(255,77,77,0.3)' },
  partielle:     { label: 'Partielle',   color: '#FFB41E', bg: 'rgba(255,180,30,0.12)', border: 'rgba(255,180,30,0.3)' },
  en_cours:      { label: 'En cours',    color: '#0066FF', bg: 'rgba(0,102,255,0.12)',  border: 'rgba(0,102,255,0.3)' },
  termine:       { label: 'Terminé',     color: '#00E5A0', bg: 'rgba(0,229,160,0.12)',  border: 'rgba(0,229,160,0.3)' },
  'terminé':     { label: 'Terminé',     color: '#00E5A0', bg: 'rgba(0,229,160,0.12)',  border: 'rgba(0,229,160,0.3)' },
  en_attente:    { label: 'En attente',  color: '#8A8F98', bg: 'rgba(138,143,152,0.1)', border: 'rgba(138,143,152,0.25)' },
  publie:        { label: 'Publié',      color: '#00E5FF', bg: 'rgba(0,229,255,0.12)',  border: 'rgba(0,229,255,0.3)' },
  'publié':      { label: 'Publié',      color: '#00E5FF', bg: 'rgba(0,229,255,0.12)',  border: 'rgba(0,229,255,0.3)' },
  programme:     { label: 'Programmé',   color: '#6A00FF', bg: 'rgba(106,0,255,0.12)',  border: 'rgba(106,0,255,0.3)' },
  'planifié':    { label: 'Planifié',    color: '#6A00FF', bg: 'rgba(106,0,255,0.12)',  border: 'rgba(106,0,255,0.3)' },
  brouillon:     { label: 'Brouillon',   color: '#8A8F98', bg: 'rgba(138,143,152,0.1)', border: 'rgba(138,143,152,0.25)' },
  en_validation: { label: 'Validation',  color: '#FFB41E', bg: 'rgba(255,180,30,0.12)', border: 'rgba(255,180,30,0.3)' },
  bloque:        { label: 'Bloqué',      color: '#FF4D4D', bg: 'rgba(255,77,77,0.12)',  border: 'rgba(255,77,77,0.3)' },
}

function StatusBadge({ status }: { status: string }) {
  const c = STATUS_CFG[status] || { label: status, color: '#8A8F98', bg: 'rgba(138,143,152,0.1)', border: 'rgba(138,143,152,0.25)' }
  return (
    <span className="inline-flex items-center text-xs px-2.5 py-0.5 rounded-full font-medium whitespace-nowrap"
      style={{ color: c.color, background: c.bg, border: `1px solid ${c.border}` }}>
      <span className="inline-block h-1.5 w-1.5 rounded-full mr-1.5" style={{ background: c.color }} />
      {c.label}
    </span>
  )
}

const PLATFORM_ICONS: Record<string, string> = {
  facebook: '📘', instagram: '📸', tiktok: '🎵',
  linkedin: '💼', twitter: '🐦', youtube: '▶️', autre: '🌐'
}

type Tab = 'overview' | 'projects' | 'publications' | 'invoices' | 'messages'

export default function ClientDashboard() {
  const router = useRouter()
  const [client, setClient] = useState<ClientSession | null>(null)
  const [projects, setProjects] = useState<any[]>([])
  const [publications, setPublications] = useState<any[]>([])
  const [invoices, setInvoices] = useState<any[]>([])
  const [messages, setMessages] = useState<any[]>([])
  const [newMsg, setNewMsg] = useState('')
  const [sendingMsg, setSendingMsg] = useState(false)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const stored = localStorage.getItem('client_session')
    if (!stored) { router.push('/client/login'); return }
    const session: ClientSession = JSON.parse(stored)
    setClient(session)
    loadData(session.id)
  }, [])

  useEffect(() => {
    if (!client) return
    const channel = supabase
      .channel('client-messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'client_messages', filter: `client_id=eq.${client.id}` },
        (payload) => {
          setMessages(prev => [...prev, payload.new])
          setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
        })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [client])

  useEffect(() => {
    if (activeTab === 'messages') {
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    }
  }, [activeTab, messages])

  async function loadData(clientId: string) {
    setLoading(true)
    const [projRes, pubRes, invRes, msgRes] = await Promise.all([
      supabase.from('projects').select('id,name,title,status,description,created_at,deadline,end_date').eq('client_id', clientId).order('created_at', { ascending: false }),
      supabase.from('publications').select('id,title,content,platform,status,scheduled_at,published_at,content_type').eq('client_id', clientId).order('created_at', { ascending: false }),
      supabase.from('invoices').select('id,invoice_number,total_amount,paid_amount,status,due_date,invoice_date,currency,notes,terms,discount,tax_rate,company_name,company_address,company_email,company_phone,tax_number').eq('client_id', clientId).order('created_at', { ascending: false }),
      supabase.from('client_messages').select('*').eq('client_id', clientId).order('created_at', { ascending: true }),
    ])
    setProjects(projRes.data || [])
    setPublications(pubRes.data || [])
    // Charger les lignes de chaque facture
    const invData = invRes.data || []
    if (invData.length > 0) {
      const ids = invData.map((i: any) => i.id)
      const { data: itemsData } = await supabase.from('invoice_items').select('*').in('invoice_id', ids)
      const grouped = (itemsData || []).reduce((acc: any, item: any) => {
        acc[item.invoice_id] = acc[item.invoice_id] || []
        acc[item.invoice_id].push(item)
        return acc
      }, {})
      setInvoices(invData.map((inv: any) => ({ ...inv, _items: grouped[inv.id] || [] })))
    } else {
      setInvoices([])
    }
    setMessages(msgRes.data || [])
    setLoading(false)
  }

  async function sendMessage() {
    if (!newMsg.trim() || !client) return
    setSendingMsg(true)
    const { error } = await supabase.from('client_messages').insert({ client_id: client.id, sender: 'client', message: newMsg.trim() })
    if (error) toast.error('Erreur envoi message')
    else setNewMsg('')
    setSendingMsg(false)
  }

  function handleLogout() {
    localStorage.removeItem('client_session')
    toast.success('Déconnexion réussie')
    router.push('/client/login')
  }

  async function downloadInvoicePDF(inv: any) {
    const { jsPDF } = await import('jspdf')
    const cur = inv.currency || 'GNF'
    const fmt = (n: number) => cur === 'GNF'
      ? formatGNF(n)
      : `${cur} ${Number(n).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}`

    const items = (inv._items || []).filter((i: any) => i.description)
    const subtotal     = items.reduce((s: number, i: any) => s + Number(i.quantity) * Number(i.unit_price), 0)
    const discountAmt  = subtotal * ((inv.discount || 0) / 100)
    const afterDiscount = subtotal - discountAmt
    const hasPerLineTax = items.some((i: any) => Number(i.tax_rate) > 0)
    const taxAmt = hasPerLineTax
      ? items.reduce((s: number, i: any) => s + Number(i.quantity) * Number(i.unit_price) * (1 - (inv.discount||0)/100) * (Number(i.tax_rate)/100), 0)
      : afterDiscount * ((inv.tax_rate || 0) / 100)
    const total  = afterDiscount + taxAmt
    const paid   = Number(inv.paid_amount) || 0
    const balance = Math.max(0, total - paid)

    const BG:    [number,number,number] = [11,  15,  20]
    const NEON:  [number,number,number] = [0,  102, 255]
    const CYAN:  [number,number,number] = [0,  229, 255]
    const VIO:   [number,number,number] = [106,  0, 255]
    const METAL: [number,number,number] = [138,143,152]
    const WHITE: [number,number,number] = [255,255,255]
    const DARK:  [number,number,number] = [15,  20,  35]
    const GREEN: [number,number,number] = [0,  200, 120]
    const RED:   [number,number,number] = [255,  60,  80]
    const AMB:   [number,number,number] = [255,180,  30]

    const statusLabel: Record<string, string> = { payee: 'PAYÉE', impayee: 'IMPAYÉE', partielle: 'PARTIELLE' }
    const statusClr: Record<string, [number,number,number]> = { payee: GREEN, impayee: RED, partielle: AMB }
    const sClr = statusClr[inv.status] || METAL

    const doc = new jsPDF({ unit: 'mm', format: 'a4' })
    const W = 210; const H = 297; const M = 14
    let y = 0

    // ── HEADER ──
    doc.setFillColor(...BG); doc.rect(0, 0, W, 62, 'F')
    doc.setFillColor(...NEON); doc.rect(0, 0, 4, 62, 'F')
    doc.setFillColor(...CYAN); doc.rect(4, 0, 1.5, 62, 'F')
    doc.setFillColor(...NEON); doc.rect(0, 62, W, 0.8, 'F')

    doc.setFontSize(22); doc.setFont('helvetica', 'bold'); doc.setTextColor(...WHITE)
    doc.text('POPY TECH AGENCY', M + 6, 20)
    doc.setFontSize(8); doc.setFont('helvetica', 'italic'); doc.setTextColor(...CYAN)
    doc.text('Agence de communication & marketing digital', M + 6, 27)
    doc.setFontSize(7.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(...METAL)
    const cParts: string[] = []
    if (inv.company_phone)   cParts.push(`Tél : ${inv.company_phone}`)
    if (inv.company_email)   cParts.push(inv.company_email)
    if (inv.company_address) cParts.push(inv.company_address)
    doc.text(cParts.length ? cParts.join('   ·   ') : 'Tél : +224 629 37 13 60   ·   contact@popytech.com   ·   Conakry, Guinée', M + 6, 34)

    doc.setFontSize(34); doc.setFont('helvetica', 'bold'); doc.setTextColor(...CYAN)
    doc.text('FACTURE', W - M, 25, { align: 'right' })
    doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(...METAL)
    doc.text(inv.invoice_number || '', W - M, 32, { align: 'right' })
    doc.setFontSize(7.5); doc.setTextColor(160, 180, 210)
    doc.text(`Émise le : ${inv.invoice_date ? new Date(inv.invoice_date).toLocaleDateString('fr-FR') : '—'}`, W - M, 39, { align: 'right' })
    doc.text(`Échéance : ${inv.due_date   ? new Date(inv.due_date).toLocaleDateString('fr-FR')   : '—'}`, W - M, 45, { align: 'right' })
    doc.setFillColor(...sClr); doc.roundedRect(W - M - 38, 50, 40, 8, 2, 2, 'F')
    doc.setFontSize(7.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(...BG)
    doc.text(statusLabel[inv.status] || (inv.status?.toUpperCase() || ''), W - M - 18, 55.5, { align: 'center' })

    y = 74

    // ── BLOCS DE / FACTURÉ À ──
    doc.setFillColor(18, 24, 38); doc.roundedRect(M, y - 4, 85, 42, 2, 2, 'F')
    doc.setDrawColor(...NEON); doc.setLineWidth(0.4); doc.roundedRect(M, y - 4, 85, 42, 2, 2)
    doc.setFillColor(18, 24, 38); doc.roundedRect(W / 2 + 4, y - 4, 85, 42, 2, 2, 'F')
    doc.setDrawColor(...VIO); doc.setLineWidth(0.4); doc.roundedRect(W / 2 + 4, y - 4, 85, 42, 2, 2)

    doc.setFontSize(6.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(...NEON)
    doc.text('DE', M + 4, y + 2)
    doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(...WHITE)
    doc.text(inv.company_name ? inv.company_name + ' AGENCY' : 'POPY TECH AGENCY', M + 4, y + 9)
    doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(...METAL)
    let ey = y + 16
    if (inv.company_address) { doc.text(inv.company_address, M + 4, ey); ey += 5.5 }
    if (inv.company_phone)   { doc.text(inv.company_phone,   M + 4, ey); ey += 5.5 }
    if (inv.company_email)   { doc.text(inv.company_email,   M + 4, ey) }

    const CX = W / 2 + 8
    doc.setFontSize(6.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(...VIO)
    doc.text('FACTURÉ À', CX, y + 2)
    doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(...WHITE)
    doc.text(client?.company_name || '—', CX, y + 9)
    doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(...METAL)
    doc.text(client?.email || '', CX, y + 16)

    y += 50

    // ── TABLEAU DES PRESTATIONS ──
    const colDesc = M; const colQty = 120; const colPU = 147; const colTVA = 165; const colMnt = W - M

    doc.setFillColor(...NEON); doc.rect(M, y, W - M * 2, 9, 'F')
    doc.setFontSize(7.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(...BG)
    doc.text('DÉSIGNATION / PRESTATION', colDesc + 4, y + 6)
    doc.text('QTÉ',     colQty + 4, y + 6, { align: 'center' })
    doc.text('P.U HT',  colPU,      y + 6, { align: 'right' })
    doc.text('TVA',     colTVA + 3, y + 6, { align: 'center' })
    doc.text('MONTANT', colMnt,     y + 6, { align: 'right' })
    y += 9

    const displayItems = items.length > 0
      ? items
      : [{ description: `Services agence — ${inv.invoice_number || 'Facture'}`, quantity: 1, unit_price: Number(inv.total_amount), tax_rate: 0 }]

    displayItems.forEach((item: any, idx: number) => {
      const rowH = 9
      doc.setFillColor(idx % 2 === 0 ? 20 : 14, idx % 2 === 0 ? 26 : 18, idx % 2 === 0 ? 42 : 30)
      doc.rect(M, y, W - M * 2, rowH, 'F')
      doc.setDrawColor(30, 40, 65); doc.setLineWidth(0.15); doc.line(M, y + rowH, W - M, y + rowH)
      doc.setFontSize(8.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(...WHITE)
      const descText = doc.splitTextToSize(item.description || '', 66)
      doc.text(descText[0], colDesc + 4, y + 6)
      doc.setTextColor(...METAL)
      doc.text(String(item.quantity ?? 1), colQty + 4, y + 6, { align: 'center' })
      doc.text(fmt(Number(item.unit_price ?? 0)), colPU, y + 6, { align: 'right' })
      doc.text(`${item.tax_rate || 0}%`, colTVA + 3, y + 6, { align: 'center' })
      doc.setFont('helvetica', 'bold'); doc.setTextColor(...CYAN)
      doc.text(fmt(Number(item.quantity ?? 1) * Number(item.unit_price ?? 0)), colMnt, y + 6, { align: 'right' })
      y += rowH
    })

    doc.setDrawColor(...NEON); doc.setLineWidth(0.6); doc.line(M, y, W - M, y); y += 8

    // ── TOTAUX ──
    const TL = 126; const TV = W - M
    doc.setFontSize(8.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(...METAL)
    doc.text('Sous-total HT', TL, y)
    doc.setFont('helvetica', 'bold'); doc.setTextColor(...WHITE)
    doc.text(fmt(subtotal), TV, y, { align: 'right' }); y += 7

    if ((inv.discount || 0) > 0) {
      doc.setFont('helvetica', 'normal'); doc.setTextColor(...AMB)
      doc.text(`Remise  −${inv.discount}%`, TL, y)
      doc.setFont('helvetica', 'bold'); doc.text(`− ${fmt(discountAmt)}`, TV, y, { align: 'right' }); y += 7
    }
    if (taxAmt > 0) {
      doc.setFont('helvetica', 'normal'); doc.setTextColor(...METAL)
      doc.text('TVA', TL, y)
      doc.setFont('helvetica', 'bold'); doc.setTextColor(...WHITE)
      doc.text(`+ ${fmt(taxAmt)}`, TV, y, { align: 'right' }); y += 7
    }

    doc.setDrawColor(...CYAN); doc.setLineWidth(0.4); doc.line(TL, y + 1, W - M, y + 1); y += 5

    doc.setFillColor(...NEON); doc.roundedRect(TL - 2, y, W - TL - M + 2, 14, 2, 2, 'F')
    doc.setFontSize(9.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(...BG)
    doc.text(`TOTAL TTC (${cur})`, TL + 3, y + 9.5)
    doc.setFontSize(12); doc.text(fmt(total), TV, y + 9.5, { align: 'right' }); y += 19

    if (paid > 0) {
      doc.setFillColor(14, 35, 30); doc.setDrawColor(...GREEN); doc.setLineWidth(0.5)
      doc.roundedRect(TL - 2, y, W - TL - M + 2, 18, 2, 2, 'FD')
      doc.setFontSize(8.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(...METAL)
      doc.text('Déjà encaissé', TL + 3, y + 6)
      doc.setFont('helvetica', 'bold'); doc.setTextColor(...GREEN)
      doc.text(fmt(paid), TV, y + 6, { align: 'right' })
      doc.setFont('helvetica', 'normal'); doc.setTextColor(...METAL)
      doc.text('Solde restant', TL + 3, y + 13)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(balance > 0 ? RED[0] : GREEN[0], balance > 0 ? RED[1] : GREEN[1], balance > 0 ? RED[2] : GREEN[2])
      doc.text(balance > 0 ? fmt(balance) : 'SOLDÉE', TV, y + 13, { align: 'right' }); y += 24
    }

    // ── NOTES & CONDITIONS ──
    const FOOTER_H = 22; const NOTES_H = 40; const STAMP_H = 28
    const zoneBottom = H - FOOTER_H - 4
    const stampY = zoneBottom - STAMP_H
    const notesBottom = inv.status === 'payee' ? stampY - 4 : zoneBottom
    const notesTop = notesBottom - NOTES_H
    const notesY = Math.min(y + 2, notesTop)

    if (inv.notes || inv.terms) {
      doc.setFillColor(16, 22, 36); doc.setDrawColor(30, 50, 90); doc.setLineWidth(0.3)
      doc.roundedRect(M, notesY, W - M * 2, NOTES_H, 2, 2, 'FD')
      doc.setFillColor(...NEON); doc.rect(M, notesY, W - M * 2, 0.8, 'F')
      if (inv.notes) {
        const noteW = inv.terms ? (W - M * 2) / 2 - 6 : W - M * 2 - 8
        doc.setFontSize(7); doc.setFont('helvetica', 'bold'); doc.setTextColor(...NEON)
        doc.text('NOTES', M + 4, notesY + 7)
        doc.setFont('helvetica', 'normal'); doc.setTextColor(...METAL)
        doc.text(doc.splitTextToSize(inv.notes, noteW).slice(0, 5), M + 4, notesY + 13)
      }
      if (inv.terms) {
        const tx = inv.notes ? W / 2 + 2 : M + 4
        const tw = inv.notes ? (W - M * 2) / 2 - 6 : W - M * 2 - 8
        doc.setFontSize(7); doc.setFont('helvetica', 'bold'); doc.setTextColor(...VIO)
        doc.text('CONDITIONS DE PAIEMENT', tx, notesY + 7)
        doc.setFont('helvetica', 'normal'); doc.setTextColor(...METAL)
        doc.text(doc.splitTextToSize(inv.terms, tw).slice(0, 5), tx, notesY + 13)
      }
    }

    // ── TAMPON PAYÉE ──
    if (inv.status === 'payee') {
      doc.setDrawColor(...GREEN); doc.setLineWidth(2.5)
      doc.roundedRect(W / 2 - 38, stampY + 4, 76, 20, 4, 4)
      doc.setFontSize(16); doc.setFont('helvetica', 'bold'); doc.setTextColor(...GREEN)
      doc.text('✓  PAYÉE', W / 2, stampY + 17, { align: 'center' })
    }

    // ── FOOTER ──
    doc.setFillColor(...NEON); doc.rect(0, H - FOOTER_H, W, 0.8, 'F')
    doc.setFillColor(...BG); doc.rect(0, H - FOOTER_H + 0.8, W, FOOTER_H, 'F')
    doc.setFontSize(7); doc.setFont('helvetica', 'bold'); doc.setTextColor(...CYAN)
    doc.text('POPY TECH AGENCY', M + 5, H - 10)
    doc.setFont('helvetica', 'normal'); doc.setTextColor(...METAL)
    doc.text('Merci pour votre confiance — tout retard entraîne des pénalités.', W / 2, H - 10, { align: 'center' })
    doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, W - M, H - 10, { align: 'right' })

    doc.save(`Facture_${inv.invoice_number || 'facture'}.pdf`)
    toast.success('Facture téléchargée')
  }

  if (!client) return null

  const activeProjects    = projects.filter(p => p.status === 'en_cours').length
  const completedProjects = projects.filter(p => p.status === 'terminé' || p.status === 'termine').length
  const publishedPubs     = publications.filter(p => p.status === 'publié' || p.status === 'publie').length
  const unpaidInvoices    = invoices.filter(i => i.status === 'impayee').length
  const totalUnpaidAmount = invoices
    .filter(i => i.status !== 'payee')
    .reduce((s, i) => s + Math.max(0, Number(i.total_amount) - Number(i.paid_amount || 0)), 0)
  const unreadMsgs        = messages.filter(m => m.sender === 'agency' && !m.read).length

  const tabs: { id: Tab; label: string; icon: any; count?: number }[] = [
    { id: 'overview',     label: 'Accueil',      icon: BarChart3 },
    { id: 'projects',     label: 'Projets',      icon: FolderOpen,    count: projects.length },
    { id: 'publications', label: 'Publications', icon: MessageSquare, count: publications.length },
    { id: 'invoices',     label: 'Factures',     icon: FileText,      count: unpaidInvoices || undefined },
    { id: 'messages',     label: 'Messages',     icon: Inbox,         count: unreadMsgs || undefined },
  ]

  return (
    <div className="min-h-screen" style={{ background: '#0B0F14' }}>

      {/* ── HEADER ── */}
      <header className="sticky top-0 z-10" style={{ background: 'rgba(11,15,20,0.95)', borderBottom: '1px solid rgba(255,255,255,0.07)', backdropFilter: 'blur(12px)' }}>
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl flex items-center justify-center bg-white p-1 shadow-sm border border-white/10">
              <img 
                src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/project-uploads/25eb9797-83ec-431b-8731-1404e452f4c6/popy-tech-pro-2026-resized-1772085194508.webp?width=100&height=100&resize=contain" 
                alt="Logo"
                className="h-full w-full object-contain"
              />
            </div>
            <div>
              <p className="font-bold text-white text-sm leading-tight">POPY TECH</p>
              <p className="text-xs" style={{ color: '#8A8F98' }}>Portail Client</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl"
              style={{ background: 'rgba(0,102,255,0.12)', border: '1px solid rgba(0,102,255,0.25)' }}>
              <Building className="h-3.5 w-3.5" style={{ color: '#0066FF' }} />
              <span className="text-sm font-semibold" style={{ color: '#0066FF' }}>{client.company_name}</span>
            </div>
            <button onClick={handleLogout}
              className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg transition-colors"
              style={{ color: '#8A8F98', border: '1px solid rgba(255,255,255,0.07)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#FF4D4D'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,77,77,0.3)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#8A8F98'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.07)' }}>
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Déconnexion</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">

        {/* ── WELCOME BANNER ── */}
        <div className="relative rounded-2xl overflow-hidden p-6"
          style={{ background: 'linear-gradient(135deg, rgba(0,102,255,0.2), rgba(106,0,255,0.15))', border: '1px solid rgba(0,102,255,0.25)' }}>
          <div className="absolute top-0 right-0 w-64 h-full opacity-10"
            style={{ background: 'radial-gradient(circle at 80% 50%, #00E5FF, transparent 70%)' }} />
          <div className="relative">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-4 w-4" style={{ color: '#00E5FF' }} />
              <p className="text-sm font-medium" style={{ color: '#00E5FF' }}>Bienvenue dans votre espace</p>
            </div>
            <h1 className="text-2xl font-bold text-white">{client.company_name}</h1>
            <p className="text-sm mt-1" style={{ color: '#8A8F98' }}>
              {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>

        {/* ── KPI CARDS ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Projets actifs',    value: activeProjects,    icon: FolderOpen,    color: '#0066FF',  glow: 'rgba(0,102,255,0.25)',  isAmount: false },
            { label: 'Projets terminés',  value: completedProjects, icon: CheckCircle2,  color: '#00E5A0',  glow: 'rgba(0,229,160,0.2)',   isAmount: false },
            { label: 'Publications live', value: publishedPubs,     icon: TrendingUp,    color: '#00E5FF',  glow: 'rgba(0,229,255,0.2)',   isAmount: false },
            { label: 'Factures impayées', value: unpaidInvoices,    icon: AlertCircle,   color: '#FF4D4D',  glow: 'rgba(255,77,77,0.2)',   isAmount: false },
          ].map(kpi => (
            <div key={kpi.label} className="rounded-2xl p-4 flex items-center gap-3"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: `${kpi.color}1A`, boxShadow: `0 0 14px ${kpi.glow}` }}>
                <kpi.icon className="h-4.5 w-4.5" style={{ color: kpi.color }} />
              </div>
              <div>
                <p className="text-xl font-bold text-white">{kpi.value}</p>
                <p className="text-xs" style={{ color: '#8A8F98' }}>{kpi.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── MONTANT TOTAL IMPAYÉ ── */}
        {totalUnpaidAmount > 0 && (
          <div className="rounded-2xl p-4 flex items-center justify-between gap-4"
            style={{ background: 'rgba(255,77,77,0.07)', border: '1px solid rgba(255,77,77,0.2)' }}>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'rgba(255,77,77,0.15)', boxShadow: '0 0 14px rgba(255,77,77,0.25)' }}>
                <CreditCard className="h-4.5 w-4.5" style={{ color: '#FF4D4D' }} />
              </div>
              <div>
                <p className="text-xs font-medium" style={{ color: '#FF4D4D' }}>Montant total impayé</p>
                <p className="text-2xl font-bold text-white">{formatGNF(totalUnpaidAmount)}</p>
                <p className="text-xs" style={{ color: '#8A8F98' }}>{unpaidInvoices} facture{unpaidInvoices > 1 ? 's' : ''} en attente de règlement</p>
              </div>
            </div>
            <button onClick={() => setActiveTab('invoices')}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg shrink-0"
              style={{ background: 'rgba(255,77,77,0.15)', color: '#FF4D4D', border: '1px solid rgba(255,77,77,0.3)' }}>
              Voir les factures <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* ── TABS ── */}
        <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
          {/* Tab bar */}
          <div className="flex overflow-x-auto" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-2 px-4 py-3.5 text-sm font-medium whitespace-nowrap transition-all relative"
                style={activeTab === tab.id
                  ? { color: '#00E5FF', borderBottom: '2px solid #00E5FF', marginBottom: '-1px' }
                  : { color: '#8A8F98' }}>
                <tab.icon className="h-4 w-4" />
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                    style={activeTab === tab.id
                      ? { background: 'rgba(0,229,255,0.15)', color: '#00E5FF' }
                      : { background: 'rgba(255,77,77,0.15)', color: '#FF4D4D' }}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="p-4 md:p-5">
            {loading ? (
              <div className="flex items-center justify-center h-40">
                <div className="h-8 w-8 rounded-full border-2 border-t-transparent animate-spin"
                  style={{ borderColor: 'rgba(0,102,255,0.3)', borderTopColor: '#0066FF' }} />
              </div>
            ) : (
              <>
                {/* ─── OVERVIEW ─── */}
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    {/* Projets en cours */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                          <FolderOpen className="h-4 w-4" style={{ color: '#0066FF' }} /> Projets en cours
                        </h3>
                        <button onClick={() => setActiveTab('projects')}
                          className="text-xs flex items-center gap-0.5 transition-colors"
                          style={{ color: '#0066FF' }}>
                          Voir tout <ChevronRight className="h-3 w-3" />
                        </button>
                      </div>
                      {projects.filter(p => p.status === 'en_cours').length === 0 ? (
                        <p className="text-sm text-center py-6" style={{ color: '#8A8F98' }}>Aucun projet en cours</p>
                      ) : projects.filter(p => p.status === 'en_cours').slice(0, 3).map(proj => (
                        <div key={proj.id} className="flex items-center justify-between py-3"
                          style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
                              style={{ background: 'rgba(0,102,255,0.15)' }}>
                              <FolderOpen className="h-3.5 w-3.5" style={{ color: '#0066FF' }} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-white truncate">{proj.title || proj.name}</p>
                              {(proj.deadline || proj.end_date) && (
                                <p className="text-xs" style={{ color: '#8A8F98' }}>
                                  Deadline : {new Date(proj.deadline || proj.end_date).toLocaleDateString('fr-FR')}
                                </p>
                              )}
                            </div>
                          </div>
                          <StatusBadge status={proj.status} />
                        </div>
                      ))}
                    </div>

                    {/* Publications récentes */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                          <MessageSquare className="h-4 w-4" style={{ color: '#6A00FF' }} /> Dernières publications
                        </h3>
                        <button onClick={() => setActiveTab('publications')}
                          className="text-xs flex items-center gap-0.5" style={{ color: '#0066FF' }}>
                          Voir tout <ChevronRight className="h-3 w-3" />
                        </button>
                      </div>
                      {publications.slice(0, 3).length === 0 ? (
                        <p className="text-sm text-center py-6" style={{ color: '#8A8F98' }}>Aucune publication</p>
                      ) : publications.slice(0, 3).map(pub => (
                        <div key={pub.id} className="flex items-center justify-between py-3"
                          style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="text-lg shrink-0">{PLATFORM_ICONS[pub.platform?.toLowerCase()] || '🌐'}</span>
                            <p className="text-sm font-medium text-white truncate">{pub.title || pub.platform}</p>
                          </div>
                          <StatusBadge status={pub.status} />
                        </div>
                      ))}
                    </div>

                    {/* Alerte factures impayées */}
                    {unpaidInvoices > 0 && (
                      <div className="rounded-xl p-4 flex items-center gap-3"
                        style={{ background: 'rgba(255,77,77,0.08)', border: '1px solid rgba(255,77,77,0.25)' }}>
                        <AlertCircle className="h-5 w-5 shrink-0" style={{ color: '#FF4D4D' }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold" style={{ color: '#FF4D4D' }}>
                            {unpaidInvoices} facture{unpaidInvoices > 1 ? 's' : ''} impayée{unpaidInvoices > 1 ? 's' : ''}
                          </p>
                          <p className="text-xs" style={{ color: '#8A8F98' }}>Veuillez régulariser votre situation</p>
                        </div>
                        <button onClick={() => setActiveTab('invoices')}
                          className="text-xs font-semibold flex items-center gap-0.5" style={{ color: '#FF4D4D' }}>
                          Voir <ChevronRight className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* ─── PROJECTS ─── */}
                {activeTab === 'projects' && (
                  <div className="space-y-3">
                    {projects.length === 0 ? (
                      <div className="text-center py-16">
                        <FolderOpen className="h-12 w-12 mx-auto mb-3" style={{ color: '#8A8F98', opacity: 0.3 }} />
                        <p style={{ color: '#8A8F98' }}>Aucun projet</p>
                      </div>
                    ) : projects.map(proj => (
                      <div key={proj.id} className="rounded-xl p-4 transition-all"
                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0"
                              style={{ background: 'rgba(0,102,255,0.15)' }}>
                              <FolderOpen className="h-4 w-4" style={{ color: '#0066FF' }} />
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-white text-sm">{proj.title || proj.name}</p>
                              {proj.description && (
                                <p className="text-xs mt-0.5 line-clamp-2" style={{ color: '#8A8F98' }}>{proj.description}</p>
                              )}
                            </div>
                          </div>
                          <StatusBadge status={proj.status} />
                        </div>
                        {(proj.deadline || proj.end_date) && (
                          <div className="flex items-center gap-1.5 mt-3 text-xs" style={{ color: '#8A8F98' }}>
                            <Clock className="h-3.5 w-3.5" />
                            Deadline : {new Date(proj.deadline || proj.end_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* ─── PUBLICATIONS ─── */}
                {activeTab === 'publications' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {publications.length === 0 ? (
                      <div className="col-span-full text-center py-16">
                        <MessageSquare className="h-12 w-12 mx-auto mb-3" style={{ color: '#8A8F98', opacity: 0.3 }} />
                        <p style={{ color: '#8A8F98' }}>Aucune publication</p>
                      </div>
                    ) : publications.map(pub => (
                      <div key={pub.id} className="rounded-xl overflow-hidden"
                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                        <div className="h-1" style={{
                          background: pub.platform?.toLowerCase().includes('instagram') ? 'linear-gradient(90deg, #E1306C, #833AB4)' :
                            pub.platform?.toLowerCase().includes('facebook') ? '#1877F2' :
                            pub.platform?.toLowerCase().includes('linkedin') ? '#0A66C2' :
                            pub.platform?.toLowerCase().includes('tiktok') ? '#010101' :
                            'linear-gradient(90deg, #0066FF, #00E5FF)'
                        }} />
                        <div className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                              style={{ background: 'rgba(255,255,255,0.07)', color: '#8A8F98' }}>
                              {PLATFORM_ICONS[pub.platform?.toLowerCase()] || '🌐'} {pub.platform}
                            </span>
                            <StatusBadge status={pub.status} />
                          </div>
                          <p className="font-medium text-white text-sm mb-1">{pub.title || 'Sans titre'}</p>
                          <p className="text-xs line-clamp-2 leading-relaxed" style={{ color: '#8A8F98' }}>{pub.content}</p>
                          {pub.scheduled_at && (
                            <div className="flex items-center gap-1 mt-2 text-xs" style={{ color: '#8A8F98' }}>
                              <Calendar className="h-3 w-3" />
                              {new Date(pub.scheduled_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* ─── INVOICES ─── */}
                {activeTab === 'invoices' && (
                  <div className="space-y-3">
                    {invoices.length === 0 ? (
                      <div className="text-center py-16">
                        <FileText className="h-12 w-12 mx-auto mb-3" style={{ color: '#8A8F98', opacity: 0.3 }} />
                        <p style={{ color: '#8A8F98' }}>Aucune facture</p>
                      </div>
                    ) : invoices.map(inv => {
                      const sc = STATUS_CFG[inv.status] || STATUS_CFG.en_attente
                      const isUnpaid = inv.status === 'impayee'
                      return (
                        <div key={inv.id} className="rounded-xl p-4"
                          style={{
                            background: isUnpaid ? 'rgba(255,77,77,0.06)' : 'rgba(255,255,255,0.03)',
                            border: `1px solid ${isUnpaid ? 'rgba(255,77,77,0.25)' : 'rgba(255,255,255,0.07)'}`,
                          }}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
                                style={{ background: `${sc.color}1A` }}>
                                <CreditCard className="h-4.5 w-4.5" style={{ color: sc.color }} />
                              </div>
                              <div>
                                <p className="font-semibold text-white text-sm">{inv.invoice_number || 'Facture'}</p>
                                {inv.invoice_date && (
                                  <p className="text-xs" style={{ color: '#8A8F98' }}>
                                    Émise le {new Date(inv.invoice_date).toLocaleDateString('fr-FR')}
                                  </p>
                                )}
                              </div>
                            </div>
                            <StatusBadge status={inv.status} />
                          </div>
                          <div className="mt-3 flex items-end justify-between">
                            <div>
                              <p className="text-xl font-bold text-white">
                                {Number(inv.total_amount).toLocaleString('fr-FR')} {inv.currency || 'GNF'}
                              </p>
                              {inv.status === 'partielle' && (
                                <p className="text-xs mt-0.5" style={{ color: '#FFB41E' }}>
                                  Payé : {Number(inv.paid_amount).toLocaleString('fr-FR')} {inv.currency || 'GNF'} —
                                  Reste : {(Number(inv.total_amount) - Number(inv.paid_amount)).toLocaleString('fr-FR')} {inv.currency || 'GNF'}
                                </p>
                              )}
                              {inv.due_date && (
                                <div className={`flex items-center gap-1 mt-1 text-xs ${new Date(inv.due_date) < new Date() && inv.status !== 'payee' ? 'font-semibold' : ''}`}
                                  style={{ color: new Date(inv.due_date) < new Date() && inv.status !== 'payee' ? '#FF4D4D' : '#8A8F98' }}>
                                  <Clock className="h-3 w-3" />
                                  Échéance : {new Date(inv.due_date).toLocaleDateString('fr-FR')}
                                </div>
                              )}
                            </div>
                            <button onClick={() => downloadInvoicePDF(inv)}
                              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg transition-all"
                              style={{ background: 'rgba(0,102,255,0.15)', color: '#0066FF', border: '1px solid rgba(0,102,255,0.3)' }}
                              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,102,255,0.25)')}
                              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,102,255,0.15)')}>
                              <Download className="h-3.5 w-3.5" />
                              Télécharger PDF
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* ─── MESSAGES ─── */}
                {activeTab === 'messages' && (
                  <div className="flex flex-col" style={{ height: '440px' }}>
                    <div className="flex-1 overflow-y-auto space-y-2.5 pb-2 pr-1">
                      {messages.length === 0 ? (
                        <div className="text-center py-16">
                          <Inbox className="h-12 w-12 mx-auto mb-3" style={{ color: '#8A8F98', opacity: 0.3 }} />
                          <p style={{ color: '#8A8F98' }}>Aucun message</p>
                          <p className="text-xs mt-1" style={{ color: '#8A8F98', opacity: 0.6 }}>Envoyez un message à votre agence</p>
                        </div>
                      ) : messages.map(msg => (
                        <div key={msg.id} className={`flex ${msg.sender === 'client' ? 'justify-end' : 'justify-start'}`}>
                          <div className="max-w-[75%] rounded-2xl px-4 py-2.5 text-sm"
                            style={msg.sender === 'client'
                              ? { background: 'linear-gradient(135deg, #0066FF, #00E5FF)', color: '#fff', borderBottomRightRadius: 4 }
                              : { background: 'rgba(255,255,255,0.07)', color: '#fff', borderBottomLeftRadius: 4 }}>
                            <p className="leading-relaxed">{msg.message}</p>
                            <p className="text-[10px] mt-1" style={{ color: msg.sender === 'client' ? 'rgba(255,255,255,0.6)' : '#8A8F98' }}>
                              {new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                              {msg.sender === 'client' && msg.read && <CheckCheck className="h-3 w-3 inline ml-1" />}
                            </p>
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                    <div className="pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newMsg}
                          onChange={e => setNewMsg(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                          placeholder="Écrire un message à votre agence..."
                          className="flex-1 rounded-xl px-4 py-2.5 text-sm outline-none text-white placeholder:text-white/30"
                          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                        />
                        <button onClick={sendMessage} disabled={!newMsg.trim() || sendingMsg}
                          className="px-4 py-2.5 rounded-xl disabled:opacity-40 transition-all"
                          style={{ background: 'linear-gradient(135deg, #0066FF, #00E5FF)' }}>
                          <Send className="h-4 w-4 text-white" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* FOOTER */}
        <div className="text-center pb-4">
          <p className="text-xs" style={{ color: '#8A8F98' }}>© 2026 POPY TECH — Portail Client</p>
          <p className="text-xs mt-1" style={{ color: '#8A8F98', opacity: 0.5 }}>contact@popytech.com</p>
        </div>
      </div>
    </div>
  )
}
