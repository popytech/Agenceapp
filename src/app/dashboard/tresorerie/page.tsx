'use client'

import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { formatGNF } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Cell
} from 'recharts'
import {
  TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownRight,
  ArrowRight, AlertTriangle, CheckCircle2, Clock, Landmark, RefreshCw
} from 'lucide-react'
import { format, subMonths, startOfMonth, endOfMonth, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'

const MONTHS_FR = ['Jan','Fev','Mar','Avr','Mai','Jun','Jul','Aou','Sep','Oct','Nov','Dec']

function parseDate(str: string | null | undefined): Date | null {
  if (!str) return null
  try { return parseISO(str) } catch { return null }
}

// ── Tooltip personnalisé ──────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-card border border-border rounded-lg shadow-lg p-3 text-xs space-y-1.5 min-w-[160px]">
      <p className="font-bold text-foreground">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center justify-between gap-4">
          <span style={{ color: p.color }} className="font-medium">{p.name}</span>
          <span className="font-bold text-foreground">{formatGNF(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

export default function TresoreriePage() {
  const [payments, setPayments]   = useState<any[]>([])
  const [expenses, setExpenses]   = useState<any[]>([])
  const [invoices, setInvoices]   = useState<any[]>([])
  const [loading,  setLoading]    = useState(true)
  const [period,   setPeriod]     = useState('6')   // nb de mois

  useEffect(() => {
    async function load() {
      const [p, e, i] = await Promise.all([
        supabase.from('payments').select('*, invoices(invoice_number, clients(company_name))').order('payment_date', { ascending: false }),
        supabase.from('expenses').select('*').order('expense_date', { ascending: false }),
        supabase.from('invoices').select('id, invoice_number, total_amount, paid_amount, status, due_date, clients(company_name)').order('due_date', { ascending: true }),
      ])
      setPayments(p.data || [])
      setExpenses(e.data || [])
      setInvoices(i.data || [])
      setLoading(false)
    }
    load()
  }, [])

  const nbMonths = parseInt(period)
  const now = new Date()

  // ── Solde courant ──────────────────────────────────────────────────────────
  const totalEncaisse  = useMemo(() => payments.reduce((s, p) => s + Number(p.amount), 0), [payments])
  const totalDepenses  = useMemo(() => expenses.reduce((s, e) => s + Number(e.amount), 0), [expenses])
  const soldeActuel    = totalEncaisse - totalDepenses

  // ── Créances (factures impayées) ───────────────────────────────────────────
  const creances = useMemo(() =>
    invoices.filter(i => i.status !== 'payee')
      .map(i => ({ ...i, solde: Math.max(0, Number(i.total_amount) - Number(i.paid_amount)) }))
      .filter(i => i.solde > 0),
    [invoices]
  )
  const totalCreances = creances.reduce((s, i) => s + i.solde, 0)
  const creancesEchues = creances.filter(i => i.due_date && parseDate(i.due_date)! < now)
  const totalEchu = creancesEchues.reduce((s, i) => s + i.solde, 0)

  // ── Trésorerie prévisionnelle (solde + créances) ───────────────────────────
  const tresoPrevi = soldeActuel + totalCreances

  // ── Données pour les graphiques (N derniers mois) ─────────────────────────
  const chartData = useMemo(() => {
    return Array.from({ length: nbMonths }, (_, idx) => {
      const d    = subMonths(now, nbMonths - 1 - idx)
      const m    = d.getMonth()
      const y    = d.getFullYear()
      const start = startOfMonth(d)
      const end   = endOfMonth(d)

      const inflows  = payments
        .filter(p => { const pd = parseDate(p.payment_date); return pd && pd >= start && pd <= end })
        .reduce((s, p) => s + Number(p.amount), 0)

      const outflows = expenses
        .filter(e => { const ed = parseDate(e.expense_date); return ed && ed >= start && ed <= end })
        .reduce((s, e) => s + Number(e.amount), 0)

      return {
        name: MONTHS_FR[m] + ' ' + String(y).slice(2),
        Encaisse: inflows,
        Depenses: outflows,
        Solde: inflows - outflows,
      }
    })
  }, [payments, expenses, nbMonths])

  // ── Solde cumulé (courbe de tréso) ────────────────────────────────────────
  const cumulData = useMemo(() => {
    let cumul = 0
    return chartData.map(d => {
      cumul += d.Solde
      return { ...d, Tresorerie: cumul }
    })
  }, [chartData])

  // ── Mouvements récents (tous types, triés par date) ───────────────────────
  const mouvements = useMemo(() => {
    const ins = payments.slice(0, 50).map(p => ({
      id: p.id,
      date: p.payment_date,
      label: p.invoices?.clients?.company_name || p.invoices?.invoice_number || 'Paiement',
      type: 'entree' as const,
      amount: Number(p.amount),
      method: p.payment_method,
      ref: p.invoices?.invoice_number,
    }))
    const outs = expenses.slice(0, 50).map(e => ({
      id: e.id,
      date: e.expense_date,
      label: e.title,
      type: 'sortie' as const,
      amount: Number(e.amount),
      method: e.category,
      ref: null,
    }))
    return [...ins, ...outs]
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
      .slice(0, 30)
  }, [payments, expenses])

  // ── Répartition des dépenses par catégorie ────────────────────────────────
  const catData = useMemo(() => {
    const map: Record<string, number> = {}
    expenses.forEach(e => {
      const c = e.category || 'autre'
      map[c] = (map[c] || 0) + Number(e.amount)
    })
    const CAT_LABELS: Record<string, string> = {
      salaire: 'Salaires', achat: 'Achats', transport: 'Transport',
      nourriture: 'Nourriture', imprevue: 'Imprevu', logiciel: 'Logiciels',
      maintenance: 'Maintenance', autre: 'Autre',
    }
    return Object.entries(map)
      .map(([k, v]) => ({ name: CAT_LABELS[k] || k, value: v }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6)
  }, [expenses])

  const CAT_COLORS = ['#6366f1','#3b82f6','#22c55e','#f59e0b','#ef4444','#14b8a6']

  const methodLabel: Record<string, string> = {
    orange_money: 'Orange Money', wave: 'Wave', virement: 'Virement',
    especes: 'Especes', cheque: 'Cheque', autre: 'Autre',
    salaire: 'Salaire', achat: 'Achat', transport: 'Transport',
    nourriture: 'Nourriture', logiciel: 'Logiciel', maintenance: 'Maintenance',
    bank_transfer: 'Virement',
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Chargement de la trésorerie...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Landmark className="h-6 w-6 text-primary" /> Trésorerie
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Flux de trésorerie, solde et créances en temps réel
          </p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="3">3 derniers mois</SelectItem>
            <SelectItem value="6">6 derniers mois</SelectItem>
            <SelectItem value="12">12 derniers mois</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ── KPIs principaux ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Solde actuel */}
        <Card className={`border-l-4 ${soldeActuel >= 0 ? 'border-l-emerald-500' : 'border-l-red-500'}`}>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Wallet className="h-3.5 w-3.5" /> Solde actuel
            </p>
            <p className={`text-2xl font-black mt-1 ${soldeActuel >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {formatGNF(soldeActuel)}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Encaissé − Dépenses</p>
          </CardContent>
        </Card>

        {/* Total encaissé */}
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <ArrowDownRight className="h-3.5 w-3.5 text-emerald-500" /> Total encaissé
            </p>
            <p className="text-xl font-bold text-emerald-600 mt-1">{formatGNF(totalEncaisse)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{payments.length} paiements</p>
          </CardContent>
        </Card>

        {/* Total dépenses */}
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <ArrowUpRight className="h-3.5 w-3.5 text-red-500" /> Total dépenses
            </p>
            <p className="text-xl font-bold text-red-600 mt-1">{formatGNF(totalDepenses)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{expenses.length} sorties</p>
          </CardContent>
        </Card>

        {/* Tréso prévisionnelle */}
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-blue-500" /> Tréso prévisionnelle
            </p>
            <p className="text-xl font-bold text-blue-600 mt-1">{formatGNF(tresoPrevi)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Solde + créances</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Alertes créances échues ── */}
      {totalEchu > 0 && (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                  {creancesEchues.length} facture{creancesEchues.length > 1 ? 's' : ''} en retard —{' '}
                  <span className="font-black">{formatGNF(totalEchu)}</span> non encaissé
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                  {creancesEchues.slice(0, 3).map(i => i.clients?.company_name || i.invoice_number).join(', ')}
                  {creancesEchues.length > 3 ? ` et ${creancesEchues.length - 3} autres` : ''}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Graphiques ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Courbe tréso cumulative */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Evolution de la trésorerie</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={cumulData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="gradTreso" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))"
                  tickFormatter={v => (v >= 1000000 ? (v/1000000).toFixed(1)+'M' : v >= 1000 ? (v/1000).toFixed(0)+'k' : String(v))} />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={0} stroke="hsl(var(--border))" strokeDasharray="4 2" />
                <Area type="monotone" dataKey="Tresorerie" stroke="#6366f1" strokeWidth={2}
                  fill="url(#gradTreso)" dot={{ r: 3, fill: '#6366f1' }} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Barres Entrées vs Sorties */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Entrees vs Sorties</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }} barGap={3}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))"
                  tickFormatter={v => v >= 1000000 ? (v/1000000).toFixed(1)+'M' : v >= 1000 ? (v/1000).toFixed(0)+'k' : String(v)} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="Encaisse" fill="#22c55e" radius={[3,3,0,0]} maxBarSize={24} />
                <Bar dataKey="Depenses" fill="#ef4444" radius={[3,3,0,0]} maxBarSize={24} />
              </BarChart>
            </ResponsiveContainer>
            {/* Légende manuelle */}
            <div className="flex gap-4 mt-2 justify-center">
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500 inline-block" /> Encaisse
              </span>
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="h-2.5 w-2.5 rounded-sm bg-red-500 inline-block" /> Depenses
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Répartition dépenses + Créances ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Dépenses par catégorie */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Repartition des depenses</CardTitle>
          </CardHeader>
          <CardContent>
            {catData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Aucune donnée</p>
            ) : (
              <div className="space-y-2.5">
                {catData.map((c, i) => {
                  const pct = totalDepenses > 0 ? (c.value / totalDepenses) * 100 : 0
                  return (
                    <div key={c.name}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium">{c.name}</span>
                        <span className="text-xs text-muted-foreground">{formatGNF(c.value)} · {pct.toFixed(0)}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, backgroundColor: CAT_COLORS[i % CAT_COLORS.length] }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Créances à encaisser */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center justify-between">
              <span>Creances a encaisser</span>
              <Badge variant="outline" className="text-xs">{formatGNF(totalCreances)}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {creances.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
                <CheckCircle2 className="h-8 w-8 text-emerald-400" />
                <p className="text-sm font-medium">Toutes les factures sont soldees</p>
              </div>
            ) : (
              <div className="divide-y divide-border max-h-64 overflow-y-auto">
                {creances.slice(0, 10).map(inv => {
                  const echu = inv.due_date && parseDate(inv.due_date)! < now
                  return (
                    <div key={inv.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/30 transition-colors">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{inv.clients?.company_name || inv.invoice_number}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-muted-foreground">{inv.invoice_number}</span>
                          {inv.due_date && (
                            <span className={`text-xs ${echu ? 'text-red-500 font-medium' : 'text-muted-foreground'}`}>
                              {echu ? 'Echu ' : 'Echeance '}{format(parseDate(inv.due_date)!, 'dd/MM/yy', { locale: fr })}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right ml-3 shrink-0">
                        <p className={`text-sm font-bold ${echu ? 'text-red-600' : 'text-amber-600'}`}>
                          {formatGNF(inv.solde)}
                        </p>
                        {echu && <AlertTriangle className="h-3 w-3 text-red-400 ml-auto mt-0.5" />}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Journal des mouvements ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Journal des mouvements</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Libelle</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead className="text-right">Montant</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mouvements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                    Aucun mouvement
                  </TableCell>
                </TableRow>
              ) : mouvements.map(m => (
                <TableRow key={m.id + m.type}>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {m.date ? format(parseDate(m.date)!, 'dd/MM/yyyy', { locale: fr }) : '—'}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-sm">{m.label}</div>
                    {m.ref && <div className="text-xs text-muted-foreground">{m.ref}</div>}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={`text-xs border ${m.type === 'entree'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-red-50 text-red-700 border-red-200'}`}
                    >
                      {m.type === 'entree'
                        ? <><ArrowDownRight className="h-3 w-3 mr-1 inline" />Entree</>
                        : <><ArrowUpRight className="h-3 w-3 mr-1 inline" />Sortie</>}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground capitalize">
                    {methodLabel[m.method] || m.method || '—'}
                  </TableCell>
                  <TableCell className={`text-right font-bold text-sm ${m.type === 'entree' ? 'text-emerald-600' : 'text-red-600'}`}>
                    {m.type === 'entree' ? '+' : '-'}{formatGNF(m.amount)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

    </div>
  )
}
