import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

// ── Palette Popytech 2026 — Minimaliste Corporate Tech ────────────────────────
// Blanc pur · Bleu néon #0066FF · Cyan IA #00E5FF
const WHITE:   [number,number,number] = [255, 255, 255]
const OFF_WHITE:[number,number,number]= [248, 250, 255]   // fond page légèrement teinté
const BLUE:    [number,number,number] = [0,   102, 255]   // #0066FF — autorité tech
const BLUE_D:  [number,number,number] = [0,    60, 180]   // bleu foncé (titres, headers)
const BLUE_L:  [number,number,number] = [230, 240, 255]   // bleu très clair (fonds alternés)
const CYAN:    [number,number,number] = [0,   229, 255]   // #00E5FF — accent innovation
const CYAN_L:  [number,number,number] = [220, 253, 255]   // cyan très clair
const INK:     [number,number,number] = [15,   23,  42]   // #0F172A — texte principal ultra sombre
const SLATE:   [number,number,number] = [71,   85, 105]   // #475569 — texte secondaire
const MUTED:   [number,number,number] = [148, 163, 184]   // #94A3B8 — labels, sous-textes
const RULE:    [number,number,number] = [226, 232, 240]   // #E2E8F0 — séparateurs
const GREEN:   [number,number,number] = [16,  185, 129]   // #10B981
const RED:     [number,number,number] = [239,  68,  68]   // #EF4444
const AMB:     [number,number,number] = [245, 158,  11]   // #F59E0B

const AGENCY = {
  name:    'Popytech',
  brand:   'POPYTECH',
  tagline: 'Agence digitale — Communication & Marketing',
  email:   'contact@popytech.com',
  phone:   '+224 629 37 13 60',
  city:    'Conakry, Guinée',
  website: 'www.popytech.com',
  rib:     'IBAN: GN00 0000 0000 0000 0000',
  bank:    'Banque Islamique de Guinée',
}

// ── Formatage ─────────────────────────────────────────────────────────────────
function fmtGNF(n: number | null | undefined): string {
  if (n == null) return '0 GNF'
  // Formatage manuel pour éviter les espaces insécables non supportés par jsPDF
  const parts = Math.round(Number(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  return parts + ' GNF'
}
function fmtNum(n: number | null | undefined): string {
  if (n == null) return '0'
  return Math.round(Number(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

// ── Nombre en lettres ─────────────────────────────────────────────────────────
function numberToWords(n: number): string {
  const units = ['', 'Un', 'Deux', 'Trois', 'Quatre', 'Cinq', 'Six', 'Sept', 'Huit', 'Neuf',
    'Dix', 'Onze', 'Douze', 'Treize', 'Quatorze', 'Quinze', 'Seize', 'Dix-Sept', 'Dix-Huit', 'Dix-Neuf']
  const tens = ['', '', 'Vingt', 'Trente', 'Quarante', 'Cinquante', 'Soixante', 'Soixante-Dix', 'Quatre-Vingt', 'Quatre-Vingt-Dix']
  if (n === 0) return 'Zéro'
  if (n < 0) return 'Moins ' + numberToWords(-n)
  let result = ''
  if (n >= 1000000000) { result += numberToWords(Math.floor(n / 1000000000)) + ' Milliard' + (Math.floor(n / 1000000000) > 1 ? 's' : '') + ' '; n %= 1000000000 }
  if (n >= 1000000)    { result += numberToWords(Math.floor(n / 1000000)) + ' Million' + (Math.floor(n / 1000000) > 1 ? 's' : '') + ' '; n %= 1000000 }
  if (n >= 1000)       { result += (Math.floor(n / 1000) === 1 ? 'Mille' : numberToWords(Math.floor(n / 1000)) + ' Mille') + ' '; n %= 1000 }
  if (n >= 100)        { result += (Math.floor(n / 100) === 1 ? 'Cent' : numberToWords(Math.floor(n / 100)) + ' Cent') + ' '; n %= 100 }
  if (n >= 20)         { result += tens[Math.floor(n / 10)] + (n % 10 !== 0 ? '-' + units[n % 10] : '') + ' '; n = 0 }
  else if (n > 0)      { result += units[n] + ' ' }
  return result.trim()
}

// ── Helper : ligne horizontale colorée ───────────────────────────────────────
function hLine(doc: jsPDF, x: number, y: number, w: number, color: [number,number,number], h = 0.5) {
  doc.setFillColor(...color)
  doc.rect(x, y, w, h, 'F')
}

// ── Header commun listes ──────────────────────────────────────────────────────
function addHeader(doc: jsPDF, docType: string, W: number = 210) {
  // Fond blanc
  doc.setFillColor(...WHITE)
  doc.rect(0, 0, W, 48, 'F')

  // Barre supérieure bleu néon pleine largeur
  doc.setFillColor(...BLUE)
  doc.rect(0, 0, W, 5, 'F')

  // Accent cyan sous la barre
  doc.setFillColor(...CYAN)
  doc.rect(0, 5, W, 1.5, 'F')

  // Nom agence
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...BLUE_D)
  doc.text(AGENCY.brand, 14, 20)

  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...MUTED)
  doc.text(AGENCY.tagline, 14, 27)
  doc.text(`${AGENCY.phone}  ·  ${AGENCY.email}  ·  ${AGENCY.website}`, 14, 33)

  // Type document à droite
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...BLUE)
  doc.text(docType, W - 14, 24, { align: 'right' })

  // Trait séparateur bas header
  hLine(doc, 0, 42, W, RULE)
  hLine(doc, 14, 43, 50, BLUE, 1.5)
}

// ── Footer commun listes ──────────────────────────────────────────────────────
function addFooter(doc: jsPDF, W: number = 210, H: number = 297) {
  const pageCount = (doc as any).internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    hLine(doc, 0, H - 14, W, RULE)
    hLine(doc, 0, H - 13.5, 40, BLUE, 1)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...BLUE_D)
    doc.text(AGENCY.brand, 14, H - 7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...MUTED)
    doc.text(`${AGENCY.phone}  ·  ${AGENCY.email}  ·  ${AGENCY.website}`, 14, H - 3)
    doc.text(`Page ${i} / ${pageCount}`, W - 14, H - 5, { align: 'right' })
  }
}

/* ═══════════════════════════════════════════════════════════════════════════════
   FACTURE PDF — Design Minimaliste Corporate Tech 2026
   Format A4 portrait · Blanc / Bleu néon / Cyan IA
═══════════════════════════════════════════════════════════════════════════════ */
export function downloadInvoicePDF(inv: any) {
  const cur = inv.currency || 'GNF'
  const fmt = (n: number) => cur === 'GNF'
    ? fmtGNF(n)
    : `${cur} ${Math.round(Number(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}`

  const items = (inv._items || []).filter((i: any) => i.description)
  const subtotal      = items.reduce((s: number, i: any) => s + Number(i.quantity) * Number(i.unit_price), 0)
  const discountAmt   = subtotal * ((inv.discount || 0) / 100)
  const afterDiscount = subtotal - discountAmt
  const hasPerLineTax = items.some((i: any) => Number(i.tax_rate) > 0)
  const taxAmt = hasPerLineTax
    ? items.reduce((s: number, i: any) => s + Number(i.quantity) * Number(i.unit_price) * (1 - (inv.discount || 0) / 100) * (Number(i.tax_rate) / 100), 0)
    : afterDiscount * ((inv.tax_rate || 0) / 100)
  const total   = afterDiscount + taxAmt
  const paid    = Number(inv.paid_amount) || 0
  const balance = Math.max(0, total - paid)

  const statusLabel: Record<string, string> = { payee: 'PAYEE', impayee: 'IMPAYEE', partielle: 'PARTIELLE', en_attente: 'EN ATTENTE' }
  const statusBg: Record<string, [number,number,number]>  = { payee: [220, 252, 231], impayee: [254, 226, 226], partielle: [254, 243, 199], en_attente: [241, 245, 249] }
  const statusClr: Record<string, [number,number,number]> = { payee: GREEN, impayee: RED, partielle: AMB, en_attente: MUTED }

  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const W = 210; const H = 297
  const M = 14       // marge latérale
  let y = 0

  // ── FOND PAGE ──
  doc.setFillColor(...OFF_WHITE)
  doc.rect(0, 0, W, H, 'F')

  // ── HEADER BANDE BLEUE ──
  doc.setFillColor(...BLUE)
  doc.rect(0, 0, W, 38, 'F')

  // Accent cyan bas du header
  doc.setFillColor(...CYAN)
  doc.rect(0, 36, W, 2, 'F')

  // Nom agence (blanc sur bleu)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...WHITE)
  doc.text(AGENCY.brand, M, 16)

  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(180, 210, 255)
  doc.text(AGENCY.tagline, M, 23)
  doc.text(`${AGENCY.phone}  ·  ${AGENCY.email}  ·  ${AGENCY.website}`, M, 29)

  // Titre FACTURE à droite (blanc)
  doc.setFontSize(28)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...WHITE)
  doc.text('FACTURE', W - M, 22, { align: 'right' })

  // Numéro facture en cyan sous le titre
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...CYAN)
  doc.text(inv.invoice_number || '', W - M, 32, { align: 'right' })

  y = 46

  // ── ZONE META (dates + client côte à côte) ──
  // Bloc client (gauche)
  doc.setFillColor(...WHITE)
  doc.roundedRect(M, y, 88, 36, 2, 2, 'F')
  // Trait bleu gauche
  doc.setFillColor(...BLUE)
  doc.rect(M, y, 2, 36, 'F')

  doc.setFontSize(6.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...BLUE)
  doc.text('FACTURÉ À', M + 6, y + 8)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...INK)
  const clientName = inv.clients?.company_name || '—'
  const cLines = doc.splitTextToSize(clientName, 76)
  doc.text(cLines, M + 6, y + 15)

  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...SLATE)
  let cy = y + 15 + cLines.length * 5.5
  if (inv.clients?.contact_name) { doc.text(inv.clients.contact_name, M + 6, cy); cy += 5 }
  if (inv.clients?.email)        { doc.text(inv.clients.email, M + 6, cy); cy += 5 }
  if (inv.clients?.phone)        { doc.text(inv.clients.phone, M + 6, cy) }

  // Bloc dates (droite)
  doc.setFillColor(...WHITE)
  doc.roundedRect(W - M - 88, y, 88, 36, 2, 2, 'F')
  doc.setFillColor(...CYAN)
  doc.rect(W - M - 2, y, 2, 36, 'F')

  // Dates
  const colL = W - M - 86
  const colR = W - M - 48

  doc.setFontSize(6.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...MUTED)
  doc.text("DATE D'ÉMISSION", colL, y + 8)
  doc.text("DATE D'ÉCHÉANCE", colR, y + 8)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...INK)
  doc.text(inv.invoice_date ? new Date(inv.invoice_date).toLocaleDateString('fr-FR') : '—', colL, y + 16)
  doc.text(inv.due_date ? new Date(inv.due_date).toLocaleDateString('fr-FR') : '—', colR, y + 16)

  // Statut badge
  const sLabel = statusLabel[inv.status] || (inv.status?.toUpperCase() || '—')
  const sBg    = statusBg[inv.status]    || [241, 245, 249] as [number,number,number]
  const sClr   = statusClr[inv.status]  || MUTED
  doc.setFillColor(...sBg)
  doc.roundedRect(colL, y + 22, 40, 9, 2, 2, 'F')
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...sClr)
  doc.text(sLabel, colL + 20, y + 28, { align: 'center' })

  y += 44

  // ── TABLEAU PRESTATIONS ──
  const TW = W - M * 2   // largeur tableau

  // En-tête tableau bleu
  doc.setFillColor(...BLUE)
  doc.rect(M, y, TW, 9, 'F')

  // Colonnes — largeurs ajustées pour que les montants GNF ne débordent pas
  const cDesc = M + 3       // Désignation (gauche)
  const cQty  = M + 96      // Qté (centre)
  const cPU   = M + 110     // P.U. (droite à cPU+28)
  const cTVA  = M + 143     // TVA (centre)
  const cMnt  = W - M       // Montant total (droite)

  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...WHITE)
  doc.text('DÉSIGNATION / PRESTATION', cDesc, y + 6)
  doc.text('QTÉ',   cQty + 5,  y + 6, { align: 'center' })
  doc.text('P.U.',  cPU + 14,  y + 6, { align: 'right' })
  doc.text('TVA',   cTVA + 5,  y + 6, { align: 'center' })
  doc.text('TOTAL', cMnt,      y + 6, { align: 'right' })
  y += 9

  items.forEach((item: any, idx: number) => {
    const rH = 9
    doc.setFillColor(...(idx % 2 === 0 ? WHITE : BLUE_L))
    doc.rect(M, y, TW, rH, 'F')

    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...INK)
    doc.text(doc.splitTextToSize(item.description || '', 98)[0], cDesc, y + 6)

    doc.setTextColor(...SLATE)
    doc.setFontSize(7.5)
    doc.text(String(item.quantity), cQty + 5, y + 6, { align: 'center' })
    doc.text(fmt(Number(item.unit_price)), cPU + 14, y + 6, { align: 'right' })
    doc.text(`${item.tax_rate || 0}%`, cTVA + 5, y + 6, { align: 'center' })

    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...INK)
    doc.text(fmt(Number(item.quantity) * Number(item.unit_price)), cMnt, y + 6, { align: 'right' })

    y += rH
  })

  // Trait cyan fin sous tableau
  hLine(doc, M, y, TW, CYAN, 1.5)
  y += 10

  // ── TOTAUX ──
  const TX = M + 100
  const TV = W - M

  const drawTotal = (label: string, value: string, bold = false, clr: [number,number,number] = SLATE) => {
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...MUTED)
    doc.text(label, TX, y)
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    doc.setTextColor(...clr)
    doc.text(value, TV, y, { align: 'right' })
    y += 7
  }

  drawTotal('Sous-total HT', fmt(subtotal))
  if ((inv.discount || 0) > 0) drawTotal(`Remise −${inv.discount}%`, `− ${fmt(discountAmt)}`, false, AMB)
  if (taxAmt > 0) drawTotal('TVA', `+ ${fmt(taxAmt)}`)

  hLine(doc, TX, y - 2, TV - TX, RULE)
  y += 2

  // Box total bleu — hauteur augmentée + layout label/montant sur 2 lignes si besoin
  const totalStr = fmt(total)
  doc.setFillColor(...BLUE)
  doc.roundedRect(TX - 2, y, TV - TX + 4, 16, 2, 2, 'F')
  // Accent cyan bas box total
  doc.setFillColor(...CYAN)
  doc.roundedRect(TX - 2, y + 14, TV - TX + 4, 2, 1, 1, 'F')

  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...CYAN)
  doc.text(`TOTAL TTC (${cur})`, TX + 3, y + 7)

  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...WHITE)
  doc.text(totalStr, TV - 3, y + 12, { align: 'right' })
  y += 22

  // Paiements partiels
  if (paid > 0) {
    doc.setFillColor(...WHITE)
    doc.setDrawColor(...RULE)
    doc.setLineWidth(0.3)
    doc.roundedRect(TX - 2, y, TV - TX + 4, 18, 2, 2, 'FD')

    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...MUTED)
    doc.text('Déjà encaissé', TX + 2, y + 6)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...GREEN)
    doc.text(fmt(paid), TV - 2, y + 6, { align: 'right' })

    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...MUTED)
    doc.text('Solde restant', TX + 2, y + 14)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...(balance > 0 ? RED : GREEN))
    doc.text(balance > 0 ? fmt(balance) : 'SOLDEE', TV - 2, y + 14, { align: 'right' })
    y += 24
  }

  // ── MONTANT EN LETTRES ──
  const amtWords = numberToWords(Math.round(total)) + ' Francs Guinéens'
  doc.setFontSize(7)
  doc.setFont('helvetica', 'italic')
  doc.setTextColor(...MUTED)
  doc.text(`Arrêté à la somme de : ${amtWords}`, M, y, { maxWidth: TW })
  y += 8

  // ── NOTES / CONDITIONS ──
  const FOOTER_TOP = H - 50
  if (inv.notes || inv.terms) {
    const notesY = Math.min(y + 4, FOOTER_TOP - 32)
    const half = (TW - 6) / 2

    if (inv.notes) {
      doc.setFillColor(...WHITE)
      doc.setDrawColor(...RULE)
      doc.setLineWidth(0.3)
      doc.roundedRect(M, notesY, half, 26, 2, 2, 'FD')
      hLine(doc, M, notesY, half, BLUE, 2)
      doc.setFontSize(6.5)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...BLUE)
      doc.text('NOTES', M + 4, notesY + 9)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7)
      doc.setTextColor(...SLATE)
      doc.text(doc.splitTextToSize(inv.notes, half - 8).slice(0, 4), M + 4, notesY + 16)
    }

    if (inv.terms) {
      const tx = inv.notes ? M + half + 6 : M
      const tw = inv.notes ? half : TW
      doc.setFillColor(...WHITE)
      doc.setDrawColor(...RULE)
      doc.setLineWidth(0.3)
      doc.roundedRect(tx, notesY, tw, 26, 2, 2, 'FD')
      hLine(doc, tx, notesY, tw, CYAN, 2)
      doc.setFontSize(6.5)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...BLUE_D)
      doc.text('CONDITIONS DE PAIEMENT', tx + 4, notesY + 9)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7)
      doc.setTextColor(...SLATE)
      doc.text(doc.splitTextToSize(inv.terms, tw - 8).slice(0, 4), tx + 4, notesY + 16)
    }
  }

  // ── TAMPON PAYÉE ──
  if (inv.status === 'payee') {
    const stampX = M + 2
    const stampY = FOOTER_TOP - 26
    doc.setDrawColor(...GREEN)
    doc.setLineWidth(2)
    doc.roundedRect(stampX, stampY, 56, 18, 3, 3)
    doc.setFontSize(15)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...GREEN)
    doc.text('PAYEE', stampX + 28, stampY + 13, { align: 'center' })
  }

  // ── COORDONNÉES BANCAIRES ──
  const bankY = H - 44
  doc.setFillColor(...BLUE_L)
  doc.roundedRect(M, bankY, TW, 14, 2, 2, 'F')
  hLine(doc, M, bankY, TW, BLUE, 1.5)
  doc.setFontSize(6.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...BLUE)
  doc.text('COORDONNÉES BANCAIRES', M + 4, bankY + 7)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...SLATE)
  doc.text(`${AGENCY.bank}  ·  ${AGENCY.rib}`, M + 4, bankY + 13)

  // ── FOOTER ──
  const footY = H - 26
  hLine(doc, 0, footY, W, RULE)
  hLine(doc, 0, footY + 0.5, 50, BLUE, 1)

  doc.setFontSize(6.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...MUTED)
  doc.text(
    'Tout retard de paiement est soumis à pénalités selon la législation en vigueur.',
    M, footY + 8
  )
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...BLUE_D)
  doc.text(AGENCY.website, W - M, footY + 8, { align: 'right' })

  doc.setFontSize(6)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...MUTED)
  doc.text(
    `${AGENCY.name}  ·  ${AGENCY.city}  ·  ${AGENCY.email}  ·  Généré le ${new Date().toLocaleDateString('fr-FR')}`,
    M, footY + 15
  )
  doc.text(`Page 1 / 1`, W - M, footY + 15, { align: 'right' })

  doc.save(`Facture_${inv.invoice_number || 'facture'}.pdf`)
}

/* ═══════════════════════════════════════════════════════════════════════════════
   REÇU DE PAIEMENT PDF — Design minimaliste Corporate Tech 2026
═══════════════════════════════════════════════════════════════════════════════ */
export function downloadPaymentReceipt(payment: {
  id: string
  amount: number
  payment_method: string
  payment_date: string
  notes?: string | null
}, invoice: any) {
  const methodLabels: Record<string, string> = {
    orange_money: 'Orange Money', mtn_money: 'MTN Money', wave: 'Wave',
    cash: 'Espèces', bank_transfer: 'Virement bancaire', stripe: 'Stripe', autre: 'Autre'
  }

  const clientName  = invoice.clients?.company_name || invoice.clients?.contact_name || '—'
  const totalPaid   = invoice.paid_amount || 0
  const balance     = Math.max(0, (invoice.total_amount || 0) - totalPaid)
  const amtNum      = Math.round(payment.amount)
  const amountWords = numberToWords(amtNum) + ' Francs Guinéens'
  const dateStr     = new Date(payment.payment_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
  const receiptNum  = `REC-${payment.id.slice(0, 8).toUpperCase()}`

  const doc = new jsPDF({ unit: 'mm', format: 'a5', orientation: 'portrait' })
  const W = 148; const H = 210; const M = 12
  let y = 0

  // Fond
  doc.setFillColor(...OFF_WHITE)
  doc.rect(0, 0, W, H, 'F')

  // Header bande bleue A5
  doc.setFillColor(...BLUE)
  doc.rect(0, 0, W, 36, 'F')
  doc.setFillColor(...CYAN)
  doc.rect(0, 34, W, 2, 'F')

  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...WHITE)
  doc.text(AGENCY.brand, M, 14)

  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...CYAN)
  doc.text('REÇU DE PAIEMENT', W - M, 14, { align: 'right' })

  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(180, 210, 255)
  doc.text(receiptNum, W - M, 22, { align: 'right' })
  doc.text(dateStr, W - M, 29, { align: 'right' })

  y = 46

  // Box montant central
  doc.setFillColor(...WHITE)
  doc.setDrawColor(...RULE)
  doc.setLineWidth(0.3)
  doc.roundedRect(M, y, W - M * 2, 34, 3, 3, 'FD')
  hLine(doc, M, y, W - M * 2, BLUE, 2)
  hLine(doc, M, y + 32, W - M * 2, CYAN, 2)

  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...MUTED)
  doc.text('MONTANT ENCAISSÉ', W / 2, y + 10, { align: 'center' })

  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...BLUE)
  doc.text(fmtGNF(payment.amount), W / 2, y + 24, { align: 'center' })

  y += 40

  // Montant en lettres
  doc.setFontSize(6.5)
  doc.setFont('helvetica', 'italic')
  doc.setTextColor(...MUTED)
  const wLines = doc.splitTextToSize(`"${amountWords}"`, W - M * 2)
  doc.text(wLines, W / 2, y, { align: 'center' })
  y += wLines.length * 4.5 + 6

  hLine(doc, M, y, W - M * 2, RULE)
  y += 7

  // Lignes détails
  const rows: [string, string, ([number,number,number])?][] = [
    ['Client',           clientName],
    ['Facture',          invoice.invoice_number || '—'],
    ['Mode de paiement', methodLabels[payment.payment_method] || payment.payment_method],
    ['Total facture',    fmtGNF(invoice.total_amount || 0)],
    ['Total encaissé',  fmtGNF(totalPaid),  GREEN],
    ['Solde restant',   balance > 0 ? fmtGNF(balance) : 'Solde - NEANT', balance > 0 ? RED : GREEN],
  ]

  rows.forEach(([label, value, color], idx) => {
    const ry = y + idx * 9
    doc.setFillColor(...(idx % 2 === 0 ? WHITE : BLUE_L))
    doc.rect(M, ry - 3, W - M * 2, 9, 'F')
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...MUTED)
    doc.text(label, M + 3, ry + 3)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...(color || INK))
    doc.text(value, W - M - 3, ry + 3, { align: 'right' })
    hLine(doc, M, ry + 6, W - M * 2, RULE, 0.2)
  })
  y += rows.length * 9 + 6

  if (payment.notes) {
    doc.setFillColor(...WHITE)
    doc.setDrawColor(...RULE)
    doc.setLineWidth(0.3)
    doc.roundedRect(M, y, W - M * 2, 18, 2, 2, 'FD')
    hLine(doc, M, y, W - M * 2, CYAN, 1.5)
    doc.setFontSize(6.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...BLUE_D)
    doc.text('NOTE', M + 4, y + 8)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(...SLATE)
    doc.text(doc.splitTextToSize(payment.notes, W - M * 2 - 8).slice(0, 2), M + 4, y + 14)
    y += 22
  }

  // Tampon SOLDÉE
  if (balance === 0) {
    doc.setDrawColor(...GREEN)
    doc.setLineWidth(1.5)
    doc.roundedRect(W / 2 - 24, y + 2, 48, 14, 3, 3)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...GREEN)
    doc.text('SOLDEE', W / 2, y + 11, { align: 'center' })
  }

  // Footer
  hLine(doc, 0, H - 12, W, RULE)
  hLine(doc, 0, H - 11.5, 35, BLUE, 1)
  doc.setFontSize(6.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...MUTED)
  doc.text(`${AGENCY.name}  ·  Document officiel  ·  ${new Date().toLocaleDateString('fr-FR')}`, W / 2, H - 5, { align: 'center' })

  doc.save(`Recu_${invoice.invoice_number}_${payment.id.slice(0, 6).toUpperCase()}.pdf`)
}

/* ═══════════════════════════════════════════════════════════════════════════════
   LISTE FACTURES PDF
═══════════════════════════════════════════════════════════════════════════════ */
export function downloadInvoicesListPDF(invoices: any[]) {
  const doc = new jsPDF()
  const W = 210; const H = 297
  addHeader(doc, 'FACTURES', W)

  const rows = invoices.map(inv => [
    inv.invoice_number || '—',
    inv.clients?.company_name || '—',
    inv.due_date ? new Date(inv.due_date).toLocaleDateString('fr-FR') : '—',
    fmtNum(inv.total_amount),
    fmtNum(inv.paid_amount),
    { payee: 'Payee', impayee: 'Impayee', partielle: 'Partielle' }[inv.status as string] || inv.status,
  ])

  autoTable(doc, {
    startY: 52,
    head: [['N° Facture', 'Client', 'Echeance', 'Total (GNF)', 'Paye (GNF)', 'Statut']],
    body: rows,
    theme: 'plain',
    headStyles: { fillColor: BLUE, textColor: WHITE, fontSize: 8, fontStyle: 'bold', cellPadding: 4 },
    bodyStyles: { fontSize: 8, textColor: INK, fillColor: WHITE, cellPadding: 4 },
    alternateRowStyles: { fillColor: BLUE_L },
    margin: { left: 14, right: 14 },
    columnStyles: { 3: { halign: 'right' }, 4: { halign: 'right' } },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 5) {
        const v = data.cell.raw as string
        if (v === 'Payee') data.cell.styles.textColor = GREEN
        else if (v === 'Impayee') data.cell.styles.textColor = RED
        else if (v === 'Partielle') data.cell.styles.textColor = AMB
      }
    },
  })

  const totalCA      = invoices.reduce((s, i) => s + (i.paid_amount || 0), 0)
  const totalPending = invoices.reduce((s, i) => s + Math.max(0, (i.total_amount || 0) - (i.paid_amount || 0)), 0)
  const fy = (doc as any).lastAutoTable.finalY + 8

  doc.setFillColor(...BLUE)
  doc.roundedRect(14, fy, W - 28, 14, 2, 2, 'F')
  doc.setFillColor(...CYAN)
  doc.roundedRect(14, fy + 12, W - 28, 2, 1, 1, 'F')
  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(180, 255, 230)
  doc.text(`Encaissé : ${fmtGNF(totalCA)}`, 20, fy + 9)
  doc.setTextColor(...CYAN)
  doc.text(`En attente : ${fmtGNF(totalPending)}`, W / 2, fy + 9, { align: 'center' })
  doc.setTextColor(...WHITE)
  doc.text(`${invoices.length} facture${invoices.length > 1 ? 's' : ''}`, W - 20, fy + 9, { align: 'right' })

  addFooter(doc, W, H)
  doc.save(`factures-${new Date().toISOString().split('T')[0]}.pdf`)
}

/* ═══════════════════════════════════════════════════════════════════════════════
   LISTE CLIENTS PDF
═══════════════════════════════════════════════════════════════════════════════ */
export function downloadClientsPDF(clients: any[]) {
  const doc = new jsPDF()
  const W = 210; const H = 297
  addHeader(doc, 'CLIENTS', W)

  const rows = clients.map(c => [
    c.company_name || '—',
    c.contact_name || '—',
    c.email || '—',
    c.phone || '—',
    c.status === 'actif' ? 'Actif' : c.status === 'prospect' ? 'Prospect' : c.status === 'inactif' ? 'Inactif' : c.status || '—',
    c.created_at ? new Date(c.created_at).toLocaleDateString('fr-FR') : '—',
  ])

  autoTable(doc, {
    startY: 52,
    head: [['Entreprise', 'Contact', 'Email', 'Téléphone', 'Statut', 'Depuis']],
    body: rows,
    theme: 'plain',
    headStyles: { fillColor: BLUE, textColor: WHITE, fontSize: 8, fontStyle: 'bold', cellPadding: 4 },
    bodyStyles: { fontSize: 8, textColor: INK, fillColor: WHITE, cellPadding: 4 },
    alternateRowStyles: { fillColor: BLUE_L },
    margin: { left: 14, right: 14 },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 4) {
        const v = data.cell.raw as string
        if (v === 'Actif') data.cell.styles.textColor = GREEN
        else if (v === 'Inactif') data.cell.styles.textColor = RED
        else if (v === 'Prospect') data.cell.styles.textColor = AMB
      }
    },
  })

  const fy = (doc as any).lastAutoTable.finalY + 8
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...MUTED)
  doc.text(`${clients.length} client(s) au total`, 14, fy)

  addFooter(doc, W, H)
  doc.save(`clients-${new Date().toISOString().split('T')[0]}.pdf`)
}

/* ═══════════════════════════════════════════════════════════════════════════════
   LISTE PROJETS PDF
═══════════════════════════════════════════════════════════════════════════════ */
export function downloadProjectsPDF(projects: any[]) {
  const doc = new jsPDF()
  const W = 210; const H = 297
  addHeader(doc, 'PROJETS', W)

  const rows = projects.map(p => [
    p.name || '—',
    p.clients?.company_name || '—',
    { en_cours: 'En cours', termine: 'Terminé', en_attente: 'En attente', annule: 'Annulé' }[p.status as string] || p.status || '—',
    p.budget ? fmtGNF(Number(p.budget)) : '—',
    p.deadline ? new Date(p.deadline).toLocaleDateString('fr-FR') : '—',
    p.created_at ? new Date(p.created_at).toLocaleDateString('fr-FR') : '—',
  ])

  autoTable(doc, {
    startY: 52,
    head: [['Projet', 'Client', 'Statut', 'Budget', 'Deadline', 'Créé le']],
    body: rows,
    theme: 'plain',
    headStyles: { fillColor: BLUE, textColor: WHITE, fontSize: 8, fontStyle: 'bold', cellPadding: 4 },
    bodyStyles: { fontSize: 8, textColor: INK, fillColor: WHITE, cellPadding: 4 },
    alternateRowStyles: { fillColor: BLUE_L },
    margin: { left: 14, right: 14 },
    columnStyles: { 3: { halign: 'right' } },
  })

  const totalBudget = projects.reduce((s, p) => s + (Number(p.budget) || 0), 0)
  const fy = (doc as any).lastAutoTable.finalY + 8

  doc.setFillColor(...BLUE)
  doc.roundedRect(14, fy, W - 28, 14, 2, 2, 'F')
  doc.setFillColor(...CYAN)
  doc.roundedRect(14, fy + 12, W - 28, 2, 1, 1, 'F')
  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...WHITE)
  doc.text(`${projects.length} projet(s)   ·   Budget total : ${fmtGNF(totalBudget)}`, W / 2, fy + 9, { align: 'center' })

  addFooter(doc, W, H)
  doc.save(`projets-${new Date().toISOString().split('T')[0]}.pdf`)
}

/* ═══════════════════════════════════════════════════════════════════════════════
   DEVIS PDF — Design Minimaliste Corporate Tech 2026
═══════════════════════════════════════════════════════════════════════════════ */
export function downloadQuotePDF(quote: any) {
  const doc = new jsPDF()
  const W = 210; const H = 297
  const M = 14
  let y = 0

  const statusMap: Record<string, string> = { draft: 'BROUILLON', sent: 'ENVOYÉ', accepted: 'ACCEPTÉ', rejected: 'REFUSÉ', expired: 'EXPIRÉ' }
  const statusBg: Record<string, [number,number,number]>  = { accepted: [220, 252, 231], rejected: [254, 226, 226], sent: BLUE_L, draft: [241, 245, 249], expired: [254, 243, 199] }
  const statusClr: Record<string, [number,number,number]> = { accepted: GREEN, rejected: RED, sent: BLUE, draft: MUTED, expired: AMB }

  // Fond
  doc.setFillColor(...OFF_WHITE)
  doc.rect(0, 0, W, H, 'F')

  // Header bleu
  doc.setFillColor(...BLUE)
  doc.rect(0, 0, W, 38, 'F')
  doc.setFillColor(...CYAN)
  doc.rect(0, 36, W, 2, 'F')

  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...WHITE)
  doc.text(AGENCY.brand, M, 16)

  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(180, 210, 255)
  doc.text(AGENCY.tagline, M, 23)
  doc.text(`${AGENCY.phone}  ·  ${AGENCY.email}  ·  ${AGENCY.website}`, M, 29)

  doc.setFontSize(28)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...WHITE)
  doc.text('DEVIS', W - M, 22, { align: 'right' })

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...CYAN)
  doc.text(quote.quote_number || '', W - M, 32, { align: 'right' })

  y = 46

  // Zone meta client + dates
  // Bloc client
  doc.setFillColor(...WHITE)
  doc.roundedRect(M, y, 88, 36, 2, 2, 'F')
  doc.setFillColor(...BLUE)
  doc.rect(M, y, 2, 36, 'F')

  doc.setFontSize(6.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...BLUE)
  doc.text('CLIENT', M + 6, y + 8)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...INK)
  const cLines2 = doc.splitTextToSize(quote.clients?.company_name || '—', 76)
  doc.text(cLines2, M + 6, y + 15)

  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...SLATE)
  let cy2 = y + 15 + cLines2.length * 5.5
  if (quote.clients?.contact_name) { doc.text(quote.clients.contact_name, M + 6, cy2); cy2 += 5 }
  if (quote.clients?.email)        { doc.text(quote.clients.email, M + 6, cy2) }

  // Bloc dates + statut
  doc.setFillColor(...WHITE)
  doc.roundedRect(W - M - 88, y, 88, 36, 2, 2, 'F')
  doc.setFillColor(...CYAN)
  doc.rect(W - M - 2, y, 2, 36, 'F')

  const colL2 = W - M - 86
  const colR2 = W - M - 46

  doc.setFontSize(6.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...MUTED)
  doc.text('CRÉÉ LE', colL2, y + 8)
  doc.text('VALIDE JUSQU\'AU', colR2, y + 8)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...INK)
  doc.text(quote.created_at ? new Date(quote.created_at).toLocaleDateString('fr-FR') : '—', colL2, y + 16)
  doc.text(quote.valid_until ? new Date(quote.valid_until).toLocaleDateString('fr-FR') : '—', colR2, y + 16)

  // Statut badge
  const sBg2  = statusBg[quote.status]  || [241, 245, 249] as [number,number,number]
  const sClr2 = statusClr[quote.status] || MUTED
  doc.setFillColor(...sBg2)
  doc.roundedRect(colL2, y + 22, 42, 9, 2, 2, 'F')
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...sClr2)
  doc.text(statusMap[quote.status] || (quote.status || '').toUpperCase(), colL2 + 21, y + 28, { align: 'center' })

  y += 44

  // Tableau prestations
  const TW = W - M * 2
  const items: any[] = quote.items || []

  const tableRows = items.length > 0
    ? items.map((item: any) => [
        item.description || '—',
        String(item.quantity || 1),
        fmtNum(item.unit_price || 0) + ' GNF',
        fmtNum(Number(item.quantity || 1) * Number(item.unit_price || 0)) + ' GNF',
      ])
    : [['Prestation de services', '1', fmtNum(quote.total_amount || 0) + ' GNF', fmtNum(quote.total_amount || 0) + ' GNF']]

  autoTable(doc, {
    startY: y,
    head: [['DÉSIGNATION / PRESTATION', 'QTÉ', 'PRIX UNITAIRE', 'MONTANT HT']],
    body: tableRows,
    theme: 'plain',
    headStyles: { fillColor: BLUE, textColor: WHITE, fontSize: 7, fontStyle: 'bold', cellPadding: 3.5 },
    bodyStyles: { fontSize: 8.5, textColor: INK, fillColor: WHITE, cellPadding: 4 },
    alternateRowStyles: { fillColor: BLUE_L },
    columnStyles: {
      2: { halign: 'right', textColor: SLATE },
      3: { halign: 'right', fontStyle: 'bold', textColor: BLUE_D },
    },
    margin: { left: M, right: M },
  })

  y = (doc as any).lastAutoTable.finalY

  // Trait cyan fin sous tableau
  hLine(doc, M, y, TW, CYAN, 1.5)
  y += 10

  // Totaux
  const boxX = M + 100
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...MUTED)
  doc.text('Sous-total HT', boxX, y)
  doc.text(`TVA (${quote.tax_rate || 18}%)`, boxX, y + 7)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...SLATE)
  doc.text(fmtGNF(quote.subtotal), W - M, y, { align: 'right' })
  doc.text(fmtGNF(quote.tax_amount), W - M, y + 7, { align: 'right' })

  hLine(doc, boxX, y + 11, W - M - boxX, RULE)

  // Box total bleu
  doc.setFillColor(...BLUE)
  doc.roundedRect(boxX - 2, y + 14, W - M - boxX + 4, 14, 2, 2, 'F')
  doc.setFillColor(...CYAN)
  doc.roundedRect(boxX - 2, y + 26, W - M - boxX + 4, 2, 1, 1, 'F')
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...WHITE)
  doc.text('TOTAL TTC', boxX + 2, y + 22)
  doc.setFontSize(10)
  doc.text(fmtGNF(quote.total_amount), W - M - 2, y + 22, { align: 'right' })
  y += 34

  // Notes
  if (quote.notes) {
    doc.setFillColor(...WHITE)
    doc.setDrawColor(...RULE)
    doc.setLineWidth(0.3)
    doc.roundedRect(M, y, TW, 22, 2, 2, 'FD')
    hLine(doc, M, y, TW, BLUE, 2)
    doc.setFontSize(6.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...BLUE)
    doc.text('NOTES', M + 4, y + 9)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(...SLATE)
    doc.text(doc.splitTextToSize(quote.notes, TW - 10).slice(0, 3), M + 4, y + 16)
    y += 28
  }

  // Mentions légales
  const legalY = H - 28
  doc.setFontSize(6.5)
  doc.setFont('helvetica', 'italic')
  doc.setTextColor(...MUTED)
  doc.text(
    'Ce devis est valable jusqu\'à la date indiquée. Toute acceptation doit être confirmée par écrit.',
    M, legalY, { maxWidth: TW }
  )
  doc.text(`Devis établi par ${AGENCY.name}  ·  ${AGENCY.city}  ·  ${AGENCY.email}`, M, legalY + 6)

  // Footer
  hLine(doc, 0, H - 16, W, RULE)
  hLine(doc, 0, H - 15.5, 50, BLUE, 1)
  doc.setFontSize(6.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...MUTED)
  doc.text('Merci pour votre confiance.', M, H - 9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...BLUE_D)
  doc.text(AGENCY.website, W - M, H - 9, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...MUTED)
  doc.text(`${AGENCY.name}  ·  ${AGENCY.city}  ·  Généré le ${new Date().toLocaleDateString('fr-FR')}`, M, H - 4)

  doc.save(`${quote.quote_number || 'devis'}.pdf`)
}

/* ═══════════════════════════════════════════════════════════════════════════════
   RAPPORT FINANCIER PDF — par mois sélectionné
═══════════════════════════════════════════════════════════════════════════════ */
const MONTHS_FR_FULL = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']

export function downloadFinanceReportPDF(data: {
  totalRevenue: number
  totalExpenses: number
  invoices: any[]
  expenses: any[]
  payments?: any[]
  selectedMonth?: number
  selectedYear?: number
}) {
  const doc = new jsPDF()
  const W = 210; const H = 297; const M = 14

  const now   = new Date()
  const month = data.selectedMonth ?? now.getMonth()
  const year  = data.selectedYear  ?? now.getFullYear()
  const monthLabel = `${MONTHS_FR_FULL[month]} ${year}`

  const payments = (data.payments || []).filter(p => {
    if (!p.payment_date) return false
    const d = new Date(p.payment_date + 'T00:00:00')
    return d.getMonth() === month && d.getFullYear() === year
  })
  const expenses = data.expenses.filter(e => {
    if (!e.expense_date) return false
    const d = new Date(e.expense_date + 'T00:00:00')
    return d.getMonth() === month && d.getFullYear() === year
  })
  const invoices = data.invoices.filter(inv => {
    if (!inv.invoice_date) return false
    const d = new Date(inv.invoice_date + 'T00:00:00')
    return d.getMonth() === month && d.getFullYear() === year
  })

  const totalRevenue  = payments.reduce((s, p) => s + Number(p.amount || 0), 0)
  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount || 0), 0)
  const totalInvoiced = invoices.reduce((s, i) => s + Number(i.total_amount || 0), 0)
  const profit = totalRevenue - totalExpenses

  addHeader(doc, 'RAPPORT', W)

  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...BLUE_D)
  doc.text(`Rapport Financier — ${monthLabel}`, M, 55)
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...MUTED)
  doc.text(`Généré le ${now.toLocaleDateString('fr-FR')}`, W - M, 55, { align: 'right' })

  let y = 64

  // KPI Cards
  const cards = [
    { label: 'ENCAISSÉ',     value: totalRevenue,  top: GREEN,  text: GREEN  },
    { label: 'FACTURÉ',      value: totalInvoiced, top: BLUE,   text: BLUE   },
    { label: 'DÉPENSES',     value: totalExpenses, top: RED,    text: RED    },
    { label: 'BÉNÉFICE NET', value: profit,        top: profit >= 0 ? CYAN : RED, text: profit >= 0 ? BLUE_D : RED },
  ] as const

  cards.forEach((c, i) => {
    const x = M + i * 45.5
    doc.setFillColor(...WHITE)
    doc.setDrawColor(...RULE)
    doc.setLineWidth(0.3)
    doc.roundedRect(x, y, 43, 24, 2, 2, 'FD')
    // Trait couleur en haut de chaque card
    doc.setFillColor(...c.top)
    doc.roundedRect(x, y, 43, 2, 1, 1, 'F')
    doc.setFontSize(6)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...MUTED)
    doc.text(c.label, x + 3, y + 10)
    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...c.text)
    doc.text(fmtGNF(c.value), x + 3, y + 20)
  })
  y += 32

  if (payments.length > 0) {
    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...GREEN)
    doc.text(`PAIEMENTS REÇUS (${payments.length})`, M, y)
    y += 3
    autoTable(doc, {
      startY: y,
      head: [['Date', 'Mode', 'Montant']],
      body: payments.map(p => [
        p.payment_date ? new Date(p.payment_date + 'T00:00:00').toLocaleDateString('fr-FR') : '—',
        (p.payment_method || 'autre').replace(/_/g, ' '),
        fmtGNF(p.amount),
      ]),
      theme: 'plain',
      headStyles: { fillColor: [16, 185, 129] as [number,number,number], textColor: WHITE, fontSize: 7.5, fontStyle: 'bold', cellPadding: 3 },
      bodyStyles: { fontSize: 8, textColor: INK, fillColor: WHITE, cellPadding: 3 },
      alternateRowStyles: { fillColor: BLUE_L },
      margin: { left: M, right: M },
      columnStyles: { 2: { halign: 'right', fontStyle: 'bold', textColor: GREEN } },
    })
    y = (doc as any).lastAutoTable.finalY + 10
  }

  if (invoices.length > 0) {
    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...BLUE)
    doc.text(`FACTURES ÉMISES (${invoices.length})`, M, y)
    y += 3
    autoTable(doc, {
      startY: y,
      head: [['N° Facture', 'Client', 'Montant', 'Paye', 'Statut']],
      body: invoices.map(inv => [
        inv.invoice_number || '—',
        inv.clients?.company_name || '—',
        fmtGNF(inv.total_amount),
        fmtGNF(inv.paid_amount),
        { payee: 'Payee', impayee: 'Impayee', partielle: 'Partielle' }[inv.status as string] || inv.status,
      ]),
      theme: 'plain',
      headStyles: { fillColor: BLUE, textColor: WHITE, fontSize: 7.5, fontStyle: 'bold', cellPadding: 3 },
      bodyStyles: { fontSize: 8, textColor: INK, fillColor: WHITE, cellPadding: 3 },
      alternateRowStyles: { fillColor: BLUE_L },
      margin: { left: M, right: M },
      columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right' } },
    })
    y = (doc as any).lastAutoTable.finalY + 10
  }

  if (expenses.length > 0) {
    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...RED)
    doc.text(`DÉPENSES (${expenses.length})`, M, y)
    y += 3
    autoTable(doc, {
      startY: y,
      head: [['Titre', 'Catégorie', 'Montant', 'Date']],
      body: expenses.map(e => [
        e.title || '—',
        e.category || '—',
        fmtGNF(e.amount),
        e.expense_date ? new Date(e.expense_date + 'T00:00:00').toLocaleDateString('fr-FR') : '—',
      ]),
      theme: 'plain',
      headStyles: { fillColor: [185, 28, 28] as [number,number,number], textColor: WHITE, fontSize: 7.5, fontStyle: 'bold', cellPadding: 3 },
      bodyStyles: { fontSize: 8, textColor: INK, fillColor: WHITE, cellPadding: 3 },
      alternateRowStyles: { fillColor: BLUE_L },
      margin: { left: M, right: M },
      columnStyles: { 2: { halign: 'right', textColor: RED } },
    })
  }

  const finalY = Math.max((doc as any).lastAutoTable?.finalY ?? y, y) + 10
  if (finalY < H - 40) {
    doc.setFillColor(...BLUE)
    doc.roundedRect(M, finalY, W - M * 2, 14, 2, 2, 'F')
    doc.setFillColor(...CYAN)
    doc.roundedRect(M, finalY + 12, W - M * 2, 2, 1, 1, 'F')
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(180, 255, 230)
    doc.text(`Encaissé : ${fmtGNF(totalRevenue)}`, M + 5, finalY + 9)
    doc.setTextColor(...CYAN)
    doc.text(`Dépenses : ${fmtGNF(totalExpenses)}`, W / 2, finalY + 9, { align: 'center' })
    doc.setTextColor(...(profit >= 0 ? [180, 255, 230] as [number,number,number] : [255, 180, 180] as [number,number,number]))
    doc.text(`Bénéfice : ${fmtGNF(profit)}`, W - M - 5, finalY + 9, { align: 'right' })
  }

  addFooter(doc, W, H)
  doc.save(`rapport-${monthLabel.replace(/\s/g, '-')}.pdf`)
}

/* ═══════════════════════════════════════════════════════════════════════════════
   LISTE INSCRITS FORMATION PDF
═══════════════════════════════════════════════════════════════════════════════ */
export function downloadRegistrationsListPDF(registrations: {
  registration_number?: string | null
  student_name: string
  student_email: string
  student_phone?: string | null
  student_company?: string | null
  training_id?: string | null
  payment_status: string
  registration_status: string
  amount_due?: number | null
  amount_paid?: number | null
  created_at: string
  trainings?: { title?: string } | null
}[], trainingTitle?: string) {
  const doc = new jsPDF({ orientation: 'landscape' })
  const W = 297; const H = 210

  const statusPayLabel: Record<string, string> = { paid: 'Soldé', partial: 'Partiel', pending: 'Impayé' }
  const statusRegLabel: Record<string, string> = { confirmed: 'Confirmé', cancelled: 'Annulé', pending: 'En attente', completed: 'Terminé' }

  addHeader(doc, 'INSCRITS', W)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...MUTED)
  const subtitle = trainingTitle ? `Formation : ${trainingTitle}` : 'Toutes formations'
  doc.text(subtitle, 14, 55)
  doc.text(`Exporté le ${new Date().toLocaleDateString('fr-FR')}  ·  ${registrations.length} inscrit(s)`, W - 14, 55, { align: 'right' })

  const rows = registrations.map(r => [
    r.registration_number || '—',
    r.student_name,
    r.student_email,
    r.student_phone || '—',
    r.student_company || '—',
    r.trainings?.title || trainingTitle || '—',
    statusRegLabel[r.registration_status] || r.registration_status,
    statusPayLabel[r.payment_status] || r.payment_status,
    r.amount_due ? fmtGNF(r.amount_due) : '—',
    r.amount_paid ? fmtGNF(r.amount_paid) : '0 GNF',
    new Date(r.created_at).toLocaleDateString('fr-FR'),
  ])

  autoTable(doc, {
    startY: 60,
    head: [['N° Inscr.', 'Apprenant', 'Email', 'Téléphone', 'Entreprise', 'Formation', 'Statut', 'Paiement', 'Dû', 'Payé', 'Date']],
    body: rows,
    theme: 'plain',
    headStyles: { fillColor: BLUE, textColor: WHITE, fontSize: 7, fontStyle: 'bold', cellPadding: 3 },
    bodyStyles: { fontSize: 7, textColor: INK, fillColor: WHITE, cellPadding: 3 },
    alternateRowStyles: { fillColor: BLUE_L },
    margin: { left: 14, right: 14 },
    columnStyles: { 8: { halign: 'right' }, 9: { halign: 'right' } },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 7) {
        const val = data.cell.raw as string
        if (val === 'Soldé')   data.cell.styles.textColor = GREEN
        else if (val === 'Impayé') data.cell.styles.textColor = RED
        else if (val === 'Partiel') data.cell.styles.textColor = AMB
      }
    },
  })

  const finalY = (doc as any).lastAutoTable.finalY + 8
  const totalDu    = registrations.reduce((s, r) => s + (r.amount_due || 0), 0)
  const totalPaye  = registrations.reduce((s, r) => s + (r.amount_paid || 0), 0)
  const totalReste = Math.max(0, totalDu - totalPaye)

  doc.setFillColor(...BLUE)
  doc.roundedRect(14, finalY, W - 28, 14, 2, 2, 'F')
  doc.setFillColor(...CYAN)
  doc.roundedRect(14, finalY + 12, W - 28, 2, 1, 1, 'F')
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...WHITE)
  doc.text(`Total dû : ${fmtGNF(totalDu)}`, 20, finalY + 9)
  doc.setTextColor(180, 255, 230)
  doc.text(`Encaissé : ${fmtGNF(totalPaye)}`, W / 2, finalY + 9, { align: 'center' })
  doc.setTextColor(...CYAN)
  doc.text(`Reste : ${fmtGNF(totalReste)}`, W - 20, finalY + 9, { align: 'right' })

  addFooter(doc, W, H)
  const slug = trainingTitle ? trainingTitle.slice(0, 30).replace(/\s+/g, '-') : 'toutes'
  doc.save(`inscrits-${slug}-${new Date().toISOString().split('T')[0]}.pdf`)
}

/* ═══════════════════════════════════════════════════════════════════════════════
   REÇU FORMATION PDF — Design Corporate Tech 2026
═══════════════════════════════════════════════════════════════════════════════ */
export function downloadFormationReceiptPDF(p: {
  id: string
  receipt_number: string
  student_name: string
  amount: number
  payment_method: string
  payment_date: string
  reference?: string | null
  notes?: string | null
  training_id?: string | null
  registration_id?: string | null
}, training?: { title?: string; duration_hours?: number } | null, registration?: {
  registration_number?: string
  student_email?: string
  student_phone?: string | null
  student_company?: string | null
  amount_due?: number
  amount_paid?: number
} | null) {
  const methodLabels: Record<string, string> = {
    cash: 'Espèces', bank_transfer: 'Virement bancaire', card: 'Carte bancaire',
    cheque: 'Chèque', online: 'Paiement en ligne'
  }

  const amtNum      = Math.round(p.amount)
  const amountWords = numberToWords(amtNum) + ' Francs Guinéens'
  const payDate     = new Date(p.payment_date)
  const dateStr     = payDate.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })

  const doc = new jsPDF({ unit: 'mm', format: 'a5', orientation: 'portrait' })
  const W = 148; const H = 210; const M = 12
  let y = 0

  // Fond
  doc.setFillColor(...OFF_WHITE)
  doc.rect(0, 0, W, H, 'F')

  // Header bleu A5
  doc.setFillColor(...BLUE)
  doc.rect(0, 0, W, 38, 'F')
  doc.setFillColor(...CYAN)
  doc.rect(0, 36, W, 2, 'F')

  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...WHITE)
  doc.text('Popytech Academy', W / 2, 13, { align: 'center' })

  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(180, 210, 255)
  doc.text('contact@popytech.com   ·   Conakry, Guinée', W / 2, 20, { align: 'center' })

  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...CYAN)
  doc.text('REÇU DE PAIEMENT', W / 2, 28, { align: 'center' })

  // N° reçu badge
  doc.setFillColor(0, 50, 140)
  doc.roundedRect(W / 2 - 28, 30, 56, 6, 2, 2, 'F')
  doc.setFontSize(7)
  doc.setTextColor(...WHITE)
  doc.text(`N° ${p.receipt_number}`, W / 2, 35, { align: 'center' })

  y = 48

  // Date
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...BLUE_D)
  doc.text(dateStr, W - M, y, { align: 'right' })
  hLine(doc, M, y + 3, W - M * 2, RULE)
  y += 10

  // Box montant
  doc.setFillColor(...WHITE)
  doc.setDrawColor(...BLUE)
  doc.setLineWidth(0.5)
  doc.roundedRect(M, y, W - M * 2, 32, 3, 3, 'FD')
  hLine(doc, M, y, W - M * 2, BLUE, 2)
  hLine(doc, M, y + 30, W - M * 2, CYAN, 2)

  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...MUTED)
  doc.text('MONTANT ENCAISSÉ', W / 2, y + 10, { align: 'center' })
  doc.setFontSize(21)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...BLUE)
  doc.text(fmtGNF(p.amount), W / 2, y + 24, { align: 'center' })
  y += 38

  // Montant en lettres
  doc.setFontSize(6.5)
  doc.setFont('helvetica', 'italic')
  doc.setTextColor(...MUTED)
  const wordsLines = doc.splitTextToSize(`"${amountWords}"`, W - M * 2)
  doc.text(wordsLines, W / 2, y, { align: 'center' })
  y += wordsLines.length * 4.5 + 6

  hLine(doc, M, y, W - M * 2, RULE)
  y += 7

  // Lignes détail
  const rows: [string, string][] = [
    ['Apprenant', p.student_name],
    ['Formation', training?.title || '—'],
    ['Mode de paiement', methodLabels[p.payment_method] || p.payment_method],
    ['Date', dateStr],
  ]
  if (registration?.registration_number) rows.push(['N° Inscription', registration.registration_number])
  if (registration?.student_email)       rows.push(['Email', registration.student_email])
  if (registration?.student_phone)       rows.push(['Téléphone', registration.student_phone])
  if (registration?.student_company)     rows.push(['Entreprise', registration.student_company])
  if (p.reference)                       rows.push(['Référence', p.reference])
  if (registration?.amount_due)          rows.push(['Total dû', fmtGNF(registration.amount_due)])
  if (registration?.amount_paid)         rows.push(['Total payé', fmtGNF(registration.amount_paid)])
  if (registration?.amount_due && registration?.amount_paid) {
    const reste = Math.max(0, registration.amount_due - registration.amount_paid)
    rows.push(['Reste a payer', reste > 0 ? fmtGNF(reste) : 'Solde - NEANT'])
  }

  doc.setFontSize(8.5)
  rows.forEach(([label, value], idx) => {
    const rowY = y + idx * 8.5
    doc.setFillColor(...(idx % 2 === 0 ? WHITE : BLUE_L))
    doc.rect(M, rowY - 2.5, W - M * 2, 8.5, 'F')
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...MUTED)
    doc.text(label, M + 3, rowY + 3)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...SLATE)
    doc.text(value, W - M - 3, rowY + 3, { align: 'right' })
  })
  y += rows.length * 8.5 + 6

  // Tampon SOLDÉ
  if (registration?.amount_due && registration?.amount_paid && registration.amount_paid >= registration.amount_due) {
    doc.setDrawColor(...GREEN)
    doc.setLineWidth(1.5)
    doc.roundedRect(W / 2 - 22, y, 44, 14, 3, 3)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...GREEN)
    doc.text('SOLDE', W / 2, y + 10, { align: 'center' })
    y += 18
  }

  // Footer
  hLine(doc, 0, H - 12, W, RULE)
  hLine(doc, 0, H - 11.5, 35, BLUE, 1)
  doc.setFontSize(6.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...MUTED)
  doc.text(
    `Popytech Academy   ·   Généré le ${new Date().toLocaleDateString('fr-FR')}   ·   Document officiel`,
    W / 2, H - 5, { align: 'center' }
  )

  doc.save(`Recu-Formation-${p.receipt_number}.pdf`)
}

/* ═══════════════════════════════════════════════════════════════════════════════
   CERTIFICAT FORMATION PDF — 3 templates Corporate Tech 2026
═══════════════════════════════════════════════════════════════════════════════ */
type CertificateTemplate = 'classique' | 'moderne' | 'premium'

export interface CertificateOverrides {
  studentName?: string
  trainingTitle?: string
  certNumber?: string
  issuedAt?: string        // ISO date string
  intro?: string           // "Ce certificat est décerné à"
  middle?: string          // "pour avoir complété avec succès la formation :"
  orgName?: string         // "POPYTECH ACADEMY"
  contactEmail?: string
  website?: string
}

export function downloadFormationCertificatePDF(cert: {
  id: string
  certificate_number: string | null
  issued_at: string
  status: string
}, studentName: string, trainingTitle: string, template: CertificateTemplate = 'moderne', overrides?: CertificateOverrides) {
  const resolvedDate    = overrides?.issuedAt || cert.issued_at
  const resolvedName    = overrides?.studentName  || studentName
  const resolvedTitle   = overrides?.trainingTitle || trainingTitle
  const resolvedNum     = overrides?.certNumber    || cert.certificate_number || 'N/A'
  const resolvedOrg     = overrides?.orgName       || 'POPYTECH ACADEMY'
  const resolvedEmail   = overrides?.contactEmail  || AGENCY.email
  const resolvedSite    = overrides?.website       || AGENCY.website
  const resolvedIntro   = overrides?.intro         || 'Ce certificat est décerné à'
  const resolvedMiddle  = overrides?.middle        || 'pour avoir complété avec succès la formation :'
  const resolvedMiddle2 = overrides?.middle        || 'pour avoir complété avec succès :'
  const resolvedMiddle3 = overrides?.middle        || 'pour avoir maîtrisé avec excellence la formation :'

  const dateStr = new Date(resolvedDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
  const num = resolvedNum

  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' })
  const W = 297; const H = 210; const M = 20

  if (template === 'classique') {
    // ── Classique : blanc pur, bordure bleu néon, accents cyan
    doc.setFillColor(...WHITE)
    doc.rect(0, 0, W, H, 'F')

    // Double bordure bleue
    doc.setDrawColor(...BLUE)
    doc.setLineWidth(2.5)
    doc.rect(8, 8, W - 16, H - 16)
    doc.setLineWidth(0.5)
    doc.rect(12, 12, W - 24, H - 24)

    // Coins cyan
    const cs = 8
    const corners: [number, number][] = [[8,8],[W-8-cs,8],[8,H-8-cs],[W-8-cs,H-8-cs]]
    corners.forEach(([cx, cy]) => {
      doc.setFillColor(...CYAN)
      doc.rect(cx, cy, cs, cs, 'F')
    })

    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...BLUE)
    doc.text(resolvedOrg, W / 2, 32, { align: 'center' })

    // Trait cyan centre
    doc.setFillColor(...CYAN)
    doc.rect(W / 2 - 40, 35, 80, 1.5, 'F')

    doc.setFontSize(30)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...BLUE_D)
    doc.text('Certificat de Réussite', W / 2, 58, { align: 'center' })

    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...SLATE)
    doc.text(resolvedIntro, W / 2, 76, { align: 'center' })

    doc.setFontSize(26)
    doc.setFont('helvetica', 'bolditalic')
    doc.setTextColor(...BLUE)
    doc.text(resolvedName, W / 2, 94, { align: 'center' })
    doc.setFillColor(...CYAN)
    doc.rect(W / 2 - 55, 97, 110, 1.5, 'F')

    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...SLATE)
    doc.text(resolvedMiddle, W / 2, 110, { align: 'center' })
    doc.setFontSize(15)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...BLUE_D)
    const titleLines = doc.splitTextToSize(resolvedTitle, W - M * 4)
    doc.text(titleLines, W / 2, 121, { align: 'center' })

    // Badge certifié
    doc.setFillColor(...BLUE)
    doc.roundedRect(W / 2 - 26, 138, 52, 11, 3, 3, 'F')
    doc.setFillColor(...CYAN)
    doc.roundedRect(W / 2 - 26, 147, 52, 2, 1, 1, 'F')
    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...WHITE)
    doc.text('CERTIFIE', W / 2, 145.5, { align: 'center' })

    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...MUTED)
    doc.text(`N° ${num}`, M + 10, H - 20)
    doc.text(`Délivré le ${dateStr}`, W / 2, H - 20, { align: 'center' })
    doc.text(resolvedEmail, W - M - 10, H - 20, { align: 'right' })

  } else if (template === 'moderne') {
    // ── Moderne : blanc, sidebar bleu + bande cyan
    doc.setFillColor(...WHITE)
    doc.rect(0, 0, W, H, 'F')

    // Sidebar bleu
    doc.setFillColor(...BLUE)
    doc.rect(0, 0, 52, H, 'F')
    // Bande cyan à droite de la sidebar
    doc.setFillColor(...CYAN)
    doc.rect(50, 0, 4, H, 'F')

    // Fond bas légèrement teinté
    doc.setFillColor(...OFF_WHITE)
    doc.rect(54, H - 34, W - 54, 34, 'F')

    // Texte sidebar vertical
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...CYAN)
    doc.text(resolvedOrg, 26, H - 18, { align: 'center', angle: 90 })

    const CX = 70

    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...CYAN)
    doc.text('CERTIFICAT OFFICIEL DE RÉUSSITE', CX, 28)

    doc.setFontSize(30)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...BLUE_D)
    doc.text('Certificat', CX, 50)
    doc.text('de Réussite', CX, 66)

    // Trait bleu
    doc.setFillColor(...BLUE)
    doc.rect(CX, 71, 55, 2, 'F')

    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...MUTED)
    doc.text(resolvedIntro, CX, 85)

    doc.setFontSize(24)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...BLUE)
    doc.text(resolvedName, CX, 100)

    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...SLATE)
    doc.text(resolvedMiddle2, CX, 115)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...BLUE_D)
    const titleLines2 = doc.splitTextToSize(resolvedTitle, W - CX - M - 10)
    doc.text(titleLines2, CX, 125)

    const footY = H - 26
    hLine(doc, CX, footY - 2, W - CX - M, RULE)

    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...BLUE_D)
    doc.text(dateStr, CX, footY + 5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...MUTED)
    doc.text('Date de délivrance', CX, footY + 11)

    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...BLUE_D)
    doc.text(num, CX + 85, footY + 5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...MUTED)
    doc.text('N° certificat', CX + 85, footY + 11)

    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...BLUE)
    doc.text(resolvedSite, CX + 168, footY + 5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...MUTED)
    doc.text('Site officiel', CX + 168, footY + 11)

  } else {
    // ── Premium : fond bleu nuit profond, accents cyan
    doc.setFillColor(...BLUE_D)
    doc.rect(0, 0, W, H, 'F')

    // Cadre cyan fin
    doc.setDrawColor(...CYAN)
    doc.setLineWidth(1)
    doc.rect(10, 10, W - 20, H - 20)
    doc.setLineWidth(0.3)
    doc.rect(14, 14, W - 28, H - 28)

    // Coins déco cyan
    const cl = 12
    const cornerDots: [number, number][] = [[10,10],[W-10-cl,10],[10,H-10-cl],[W-10-cl,H-10-cl]]
    cornerDots.forEach(([cx, cy]) => {
      doc.setFillColor(...CYAN)
      doc.rect(cx, cy, cl, 1, 'F')
      doc.rect(cx, cy, 1, cl, 'F')
    })

    // Symbole tech central
    doc.setFontSize(24)
    doc.setTextColor(...CYAN)
    doc.text('◈', W / 2, 50, { align: 'center' })

    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...CYAN)
    doc.text(`${resolvedOrg} — CERTIFICATION OFFICIELLE`, W / 2, 64, { align: 'center' })

    doc.setFillColor(...CYAN)
    doc.rect(W / 2 - 50, 67, 100, 0.8, 'F')

    doc.setFontSize(28)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...WHITE)
    doc.text('Excellence & Innovation', W / 2, 86, { align: 'center' })

    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(160, 190, 230)
    doc.text(resolvedIntro, W / 2, 102, { align: 'center' })

    doc.setFontSize(24)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...CYAN)
    doc.text(resolvedName, W / 2, 118, { align: 'center' })

    doc.setFillColor(...CYAN)
    doc.rect(W / 2 - 55, 121, 110, 0.8, 'F')

    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(190, 215, 240)
    doc.text(resolvedMiddle3, W / 2, 133, { align: 'center' })
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...WHITE)
    const titleLines3 = doc.splitTextToSize(resolvedTitle, W - M * 4)
    doc.text(titleLines3, W / 2, 143, { align: 'center' })

    // Footer premium
    const fy = H - 28
    doc.setFillColor(0, 40, 120)
    doc.rect(14, fy - 4, W - 28, 22, 'F')
    doc.setFillColor(...CYAN)
    doc.rect(14, fy - 4, W - 28, 0.8, 'F')

    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...CYAN)
    doc.text(`N° ${num}`, M + 8, fy + 5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(160, 190, 220)
    doc.text('Numéro de certificat', M + 8, fy + 11)

    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...CYAN)
    doc.text(dateStr, W / 2, fy + 5, { align: 'center' })
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(160, 190, 220)
    doc.text('Date de délivrance', W / 2, fy + 11, { align: 'center' })

    doc.setFont('helvetica', 'bold')
    doc.setTextColor(180, 255, 220)
    doc.text('Certifie', W - M - 8, fy + 5, { align: 'right' })
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(160, 190, 220)
    doc.text(resolvedEmail, W - M - 8, fy + 11, { align: 'right' })
  }

  doc.save(`Certificat-${template}-${num}.pdf`)
}

/* ═══════════════════════════════════════════════════════════════════════════════
   CATALOGUE SERVICES PDF
═══════════════════════════════════════════════════════════════════════════════ */
export function downloadServicesCatalogPDF(services: any[]) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = 210, H = 297

  doc.setFillColor(...OFF_WHITE)
  doc.rect(0, 0, W, H, 'F')

  addHeader(doc, 'CATALOGUE SERVICES', W)

  // Date + stats
  const now = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...MUTED)
  doc.text(`Édité le ${now}  ·  ${services.filter(s => s.is_active).length} services actifs sur ${services.length}`, 14, 50)

  // Tableau
  const cats = [...new Set(services.map(s => s.category))]
  const rows: any[] = []
  cats.forEach(cat => {
    const catServices = services.filter(s => s.category === cat)
    catServices.forEach(s => {
      const margin = s.price > 0 ? Math.round(((s.price - s.production_cost) / s.price) * 100) : 0
      rows.push([
        cat,
        s.name,
        s.description || '—',
        fmtGNF(s.price),
        `${s.delivery_time || 0}j`,
        `${s.revisions_included || 0}`,
        `${margin}%`,
        s.is_active ? 'Actif' : 'Inactif',
      ])
    })
  })

  autoTable(doc, {
    startY: 55,
    head: [['Catégorie', 'Service', 'Description', 'Prix', 'Délai', 'Révisions', 'Marge', 'Statut']],
    body: rows,
    margin: { left: 14, right: 14 },
    headStyles: {
      fillColor: BLUE,
      textColor: WHITE,
      fontStyle: 'bold',
      fontSize: 8,
      cellPadding: 4,
    },
    alternateRowStyles: { fillColor: BLUE_L },
    bodyStyles: { fontSize: 7.5, textColor: INK, cellPadding: 3 },
    columnStyles: {
      0: { fontStyle: 'bold', textColor: BLUE_D, cellWidth: 20 },
      1: { fontStyle: 'bold', cellWidth: 32 },
      2: { cellWidth: 55, overflow: 'linebreak' },
      3: { halign: 'right', cellWidth: 28, fontStyle: 'bold', textColor: BLUE },
      4: { halign: 'center', cellWidth: 14 },
      5: { halign: 'center', cellWidth: 20 },
      6: { halign: 'center', cellWidth: 14, textColor: GREEN },
      7: { halign: 'center', cellWidth: 14 },
    },
    didDrawCell: (data: any) => {
      if (data.column.index === 7 && data.section === 'body') {
        const val = data.cell.text[0]
        if (val === 'Actif') {
          doc.setTextColor(...GREEN)
        } else {
          doc.setTextColor(...MUTED)
        }
      }
    },
  })

  // Total CA potentiel
  const totalRevenu = services.filter(s => s.is_active).reduce((sum, s) => sum + (s.price || 0), 0)
  const finalY = (doc as any).lastAutoTable.finalY + 6
  hLine(doc, 14, finalY, W - 28, CYAN, 1)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...BLUE_D)
  doc.text(`Valeur totale catalogue actif : ${fmtGNF(totalRevenu)}`, W - 14, finalY + 6, { align: 'right' })

  addFooter(doc, W, H)
  doc.save(`Catalogue-Services-Popytech-${new Date().getFullYear()}.pdf`)
}

/* ═══════════════════════════════════════════════════════════════════════════════
   CATALOGUE PACKS PDF
═══════════════════════════════════════════════════════════════════════════════ */
export function downloadPacksCatalogPDF(packs: any[]) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = 210, H = 297

  doc.setFillColor(...OFF_WHITE)
  doc.rect(0, 0, W, H, 'F')

  addHeader(doc, 'CATALOGUE PACKS', W)

  const now = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...MUTED)
  doc.text(`Édité le ${now}  ·  ${packs.filter(p => p.is_active).length} packs actifs`, 14, 50)

  let y = 56

  packs.forEach((pack, idx) => {
    if (y > H - 60) { doc.addPage(); doc.setFillColor(...OFF_WHITE); doc.rect(0, 0, W, H, 'F'); y = 20 }

    // Carte pack
    doc.setFillColor(...WHITE)
    doc.roundedRect(14, y, W - 28, 8, 2, 2, 'F')
    doc.setFillColor(...BLUE)
    doc.roundedRect(14, y, 3, 8, 1, 1, 'F')

    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...BLUE_D)
    doc.text(pack.name || `Pack ${idx + 1}`, 20, y + 5.5)

    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...SLATE)
    if (pack.description) doc.text(pack.description.substring(0, 80), 20, y + 5.5 + 5)

    // Prix + remise à droite
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...BLUE)
    doc.text(fmtGNF(pack.price || 0), W - 14, y + 5.5, { align: 'right' })
    if (pack.discount_percent > 0) {
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...GREEN)
      doc.text(`-${pack.discount_percent}% de remise`, W - 14, y + 5.5 + 5, { align: 'right' })
    }
    y += (pack.description ? 16 : 11)

    // Services inclus
    const packSvcs = pack.pack_services || []
    if (packSvcs.length > 0) {
      const rows = packSvcs.map((ps: any) => [
        ps.services?.name || '—',
        ps.services?.category || '—',
        `x${ps.quantity || 1}`,
        fmtGNF((ps.services?.price || 0) * (ps.quantity || 1)),
      ])

      autoTable(doc, {
        startY: y,
        head: [['Service inclus', 'Catégorie', 'Qté', 'Valeur unitaire']],
        body: rows,
        margin: { left: 20, right: 14 },
        headStyles: { fillColor: BLUE_D, textColor: WHITE, fontSize: 7.5, cellPadding: 2.5 },
        bodyStyles: { fontSize: 7.5, textColor: INK, cellPadding: 2.5 },
        alternateRowStyles: { fillColor: BLUE_L },
        columnStyles: {
          0: { cellWidth: 70 },
          1: { cellWidth: 40, textColor: BLUE_D },
          2: { halign: 'center', cellWidth: 20 },
          3: { halign: 'right', fontStyle: 'bold', textColor: BLUE },
        },
      })
      y = (doc as any).lastAutoTable.finalY + 4
    }

    // Durée
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...MUTED)
    doc.text(`Durée : ${pack.duration_days || 30} jours  ·  Statut : ${pack.is_active ? 'Actif' : 'Inactif'}`, 20, y)
    y += 8

    hLine(doc, 14, y, W - 28, RULE)
    y += 4
  })

  addFooter(doc, W, H)
  doc.save(`Catalogue-Packs-Popytech-${new Date().getFullYear()}.pdf`)
}

/* ═══════════════════════════════════════════════════════════════════════════════
   RAPPORT ABONNEMENTS PDF
═══════════════════════════════════════════════════════════════════════════════ */
export function downloadSubscriptionsPDF(subs: any[]) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = 210, H = 297

  doc.setFillColor(...OFF_WHITE)
  doc.rect(0, 0, W, H, 'F')

  addHeader(doc, 'ABONNEMENTS', W)

  const now = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
  const actifs = subs.filter(s => s.status === 'active')
  const mrr = actifs.reduce((sum, s) => sum + (s.monthly_price || 0), 0)

  // KPIs
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...MUTED)
  doc.text(`Édité le ${now}`, 14, 50)

  const kpis = [
    { label: 'Total abonnements', value: String(subs.length), color: BLUE },
    { label: 'Abonnements actifs', value: String(actifs.length), color: GREEN },
    { label: 'MRR (revenu mensuel récurrent)', value: fmtGNF(mrr), color: CYAN },
    { label: 'ARR (revenu annuel estimé)', value: fmtGNF(mrr * 12), color: BLUE_D },
  ]

  let kx = 14
  kpis.forEach(kpi => {
    doc.setFillColor(...WHITE)
    doc.roundedRect(kx, 54, 43, 16, 2, 2, 'F')
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(kpi.color[0], kpi.color[1], kpi.color[2])
    doc.text(kpi.value, kx + 21.5, 62, { align: 'center' })
    doc.setFontSize(6.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...MUTED)
    doc.text(kpi.label, kx + 21.5, 67, { align: 'center' })
    kx += 45.5
  })

  // Tableau
  const rows = subs.map(s => {
    const clientName = s.clients?.company_name || s.clients?.name || '—'
    const serviceName = s.services?.name || s.packs?.name || '—'
    const statusLabels: Record<string, string> = { active: 'Actif', paused: 'Suspendu', cancelled: 'Annulé', expired: 'Expiré' }
    return [
      clientName,
      serviceName,
      fmtGNF(s.monthly_price || 0),
      s.start_date ? new Date(s.start_date).toLocaleDateString('fr-FR') : '—',
      s.next_billing_date ? new Date(s.next_billing_date).toLocaleDateString('fr-FR') : '—',
      `${s.commitment_months || 1} mois`,
      statusLabels[s.status] || s.status,
    ]
  })

  autoTable(doc, {
    startY: 74,
    head: [['Client', 'Service / Pack', 'Prix/mois', 'Début', 'Proch. fact.', 'Engagement', 'Statut']],
    body: rows,
    margin: { left: 14, right: 14 },
    headStyles: { fillColor: BLUE, textColor: WHITE, fontStyle: 'bold', fontSize: 8, cellPadding: 4 },
    alternateRowStyles: { fillColor: BLUE_L },
    bodyStyles: { fontSize: 7.5, textColor: INK, cellPadding: 3 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 38 },
      1: { cellWidth: 38 },
      2: { halign: 'right', fontStyle: 'bold', textColor: BLUE, cellWidth: 28 },
      3: { halign: 'center', cellWidth: 22 },
      4: { halign: 'center', cellWidth: 22 },
      5: { halign: 'center', cellWidth: 22 },
      6: { halign: 'center', cellWidth: 18 },
    },
    didDrawCell: (data: any) => {
      if (data.column.index === 6 && data.section === 'body') {
        const val = data.cell.text[0]
        const colMap: Record<string, [number,number,number]> = {
          'Actif': GREEN, 'Suspendu': AMB, 'Annulé': RED, 'Expiré': MUTED,
        }
        const c = colMap[val] || MUTED
        doc.setTextColor(...c)
      }
    },
  })

  // Résumé MRR en bas
  const finalY = (doc as any).lastAutoTable.finalY + 6
  hLine(doc, 14, finalY, W - 28, CYAN, 1)
  doc.setFillColor(...WHITE)
  doc.roundedRect(W - 90, finalY + 3, 76, 18, 2, 2, 'F')
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...MUTED)
  doc.text('MRR total (actifs)', W - 52, finalY + 9, { align: 'center' })
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...BLUE)
  doc.text(fmtGNF(mrr), W - 52, finalY + 17, { align: 'center' })

  addFooter(doc, W, H)
  doc.save(`Rapport-Abonnements-Popytech-${new Date().getFullYear()}.pdf`)
}

/* ═══════════════════════════════════════════════════════════════════════════════
   BULLETIN DE PAIE PDF — Design Corporate Tech 2026
   Format A5 portrait
═══════════════════════════════════════════════════════════════════════════════ */
export function downloadPayslipPDF(entry: {
  employee_name: string
  role?: string | null
  period: string          // "2026-04"
  salary_base: number
  bonuses: number
  deductions: number
  payment_date?: string | null
  payment_method?: string | null
  notes?: string | null
  status?: string
}) {
  const net = entry.salary_base + entry.bonuses - entry.deductions
  const netWords = numberToWords(Math.round(net)) + ' Francs Guinéens'

  const methodLabels: Record<string, string> = {
    virement: 'Virement bancaire', especes: 'Especes',
    orange_money: 'Orange Money', wave: 'Wave', cheque: 'Cheque',
  }

  let periodLabel = entry.period
  try {
    const d = new Date(entry.period + '-01')
    periodLabel = d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    periodLabel = periodLabel.charAt(0).toUpperCase() + periodLabel.slice(1)
  } catch { /* ignore */ }

  const payDateStr = entry.payment_date
    ? new Date(entry.payment_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
    : '—'

  const slipNum = `PAIE-${entry.period}-${entry.employee_name.slice(0, 3).toUpperCase()}`

  const doc = new jsPDF({ unit: 'mm', format: 'a5', orientation: 'portrait' })
  const W = 148; const H = 210; const M = 12
  let y = 0

  // ── Fond page ──
  doc.setFillColor(...OFF_WHITE)
  doc.rect(0, 0, W, H, 'F')

  // ── Header bande bleue ──
  doc.setFillColor(...BLUE)
  doc.rect(0, 0, W, 36, 'F')
  doc.setFillColor(...CYAN)
  doc.rect(0, 34, W, 2, 'F')

  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...WHITE)
  doc.text(AGENCY.brand, M, 14)

  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(180, 210, 255)
  doc.text(AGENCY.tagline, M, 21)
  doc.text(AGENCY.city + '  |  ' + AGENCY.email, M, 27)

  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...CYAN)
  doc.text('BULLETIN DE PAIE', W - M, 14, { align: 'right' })
  doc.setFontSize(6.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(180, 210, 255)
  doc.text(slipNum, W - M, 21, { align: 'right' })
  doc.text('Periode : ' + periodLabel, W - M, 28, { align: 'right' })

  y = 46

  // ── Section employé ──
  doc.setFillColor(...WHITE)
  doc.setDrawColor(...RULE)
  doc.setLineWidth(0.3)
  doc.roundedRect(M, y, W - M * 2, 26, 2, 2, 'FD')
  hLine(doc, M, y, W - M * 2, BLUE_D, 1.5)

  doc.setFontSize(6.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...MUTED)
  doc.text('EMPLOYE', M + 4, y + 8)

  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...INK)
  doc.text(entry.employee_name, M + 4, y + 17)

  if (entry.role) {
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...SLATE)
    doc.text(entry.role, M + 4, y + 23)
  }

  doc.setFontSize(6.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...MUTED)
  doc.text('STATUT', W - M - 4, y + 8, { align: 'right' })
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(entry.status === 'paid' ? GREEN[0] : AMB[0], entry.status === 'paid' ? GREEN[1] : AMB[1], entry.status === 'paid' ? GREEN[2] : AMB[2])
  doc.text(entry.status === 'paid' ? 'PAYE' : 'EN ATTENTE', W - M - 4, y + 17, { align: 'right' })

  y += 32

  // ── Tableau des éléments de paie ──
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...MUTED)
  doc.text('DETAIL DE LA REMUNERATION', M, y)
  y += 4

  autoTable(doc, {
    startY: y,
    head: [['Element', 'Montant (GNF)']],
    body: [
      ['Salaire de base', fmtGNF(entry.salary_base)],
      ...(entry.bonuses > 0 ? [['Primes / Bonus', '+' + fmtGNF(entry.bonuses)]] : []),
      ...(entry.deductions > 0 ? [['Deductions / Retenues', '-' + fmtGNF(entry.deductions)]] : []),
    ],
    theme: 'plain',
    headStyles: {
      fillColor: BLUE, textColor: WHITE,
      fontSize: 7, fontStyle: 'bold', cellPadding: 3,
    },
    bodyStyles: { fontSize: 8, textColor: INK, fillColor: WHITE, cellPadding: 3 },
    alternateRowStyles: { fillColor: BLUE_L },
    margin: { left: M, right: M },
    columnStyles: { 1: { halign: 'right' } },
  })

  y = (doc as any).lastAutoTable.finalY + 4

  // ── Box NET À PAYER ──
  doc.setFillColor(...BLUE)
  doc.roundedRect(M, y, W - M * 2, 28, 3, 3, 'F')
  hLine(doc, M, y + 26, W - M * 2, CYAN, 2)

  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...CYAN)
  doc.text('NET A PAYER', W / 2, y + 9, { align: 'center' })

  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...WHITE)
  doc.text(fmtGNF(net), W / 2, y + 22, { align: 'center' })

  y += 34

  // ── Montant en lettres ──
  doc.setFontSize(6.5)
  doc.setFont('helvetica', 'italic')
  doc.setTextColor(...MUTED)
  const wLines = doc.splitTextToSize('"' + netWords + '"', W - M * 2)
  doc.text(wLines, W / 2, y, { align: 'center' })
  y += wLines.length * 4 + 4

  // ── Infos paiement ──
  const infoRows = [
    ['Mode de paiement', methodLabels[entry.payment_method || ''] || (entry.payment_method || '—')],
    ['Date de paiement', payDateStr],
    ['Employeur', AGENCY.name],
  ]

  infoRows.forEach(([label, value]) => {
    doc.setFontSize(6.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...MUTED)
    doc.text(label, M, y)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...INK)
    doc.text(value, W - M, y, { align: 'right' })
    hLine(doc, M, y + 2, W - M * 2, RULE, 0.3)
    y += 8
  })

  if (entry.notes) {
    y += 2
    doc.setFontSize(6.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...MUTED)
    const noteLines = doc.splitTextToSize('Note : ' + entry.notes, W - M * 2)
    doc.text(noteLines, M, y)
    y += noteLines.length * 4 + 4
  }

  // ── Signature ──
  const sigY = H - 40
  hLine(doc, M, sigY, W - M * 2, RULE, 0.5)

  doc.setFontSize(6.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...MUTED)
  doc.text('Signature employeur', M + 18, sigY + 5, { align: 'center' })
  doc.text('Signature employe', W - M - 18, sigY + 5, { align: 'center' })
  doc.rect(M + 2, sigY + 8, 36, 12)
  doc.rect(W - M - 38, sigY + 8, 36, 12)

  // ── Pied de page ──
  doc.setFontSize(6)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...MUTED)
  const footer = AGENCY.name + '  |  ' + AGENCY.city + '  |  ' + AGENCY.email + '  |  Genere le ' + new Date().toLocaleDateString('fr-FR')
  doc.text(footer, W / 2, H - 6, { align: 'center' })
  hLine(doc, 0, H - 10, W, CYAN, 1)

  const safeName = entry.employee_name.replace(/[^a-zA-Z0-9]/g, '-')
  doc.save(`Bulletin-Paie-${safeName}-${entry.period}.pdf`)
}
