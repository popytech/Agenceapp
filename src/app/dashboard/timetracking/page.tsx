'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { toast } from 'sonner'
import { Play, Square, Clock, TrendingUp, DollarSign, Timer, Plus, Trash2, BarChart2, Calendar, ChevronLeft, ChevronRight, Zap, CheckCircle2 } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function formatDurationShort(seconds: number) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function getWeekRange(offset = 0) {
  const now = new Date()
  const day = now.getDay() || 7
  const monday = new Date(now)
  monday.setDate(now.getDate() - day + 1 + offset * 7)
  monday.setHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)
  return { monday, sunday }
}

export default function TimeTrackingPage() {
  const { profile } = useAuth()
  const [entries, setEntries] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [weekOffset, setWeekOffset] = useState(0)
  const [activeTab, setActiveTab] = useState<'timer' | 'manual'>('timer')

  // Timer state
  const [isRunning, setIsRunning] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [startTime, setStartTime] = useState<Date | null>(null)
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Timer form
  const [form, setForm] = useState({ project_id: '', task_id: '', description: '', hourly_rate: 0, is_billable: true })

  // Manual entry form
  const [manual, setManual] = useState({
    project_id: '', task_id: '', description: '',
    date: new Date().toISOString().split('T')[0],
    start_time: '09:00', end_time: '10:00',
    hourly_rate: 0, is_billable: true,
  })

  const load = useCallback(async () => {
    if (!profile?.id) return
    setLoading(true)
    const { data } = await supabase
      .from('time_entries')
      .select('*, projects(title), tasks(title)')
      .eq('user_id', profile.id)
      .order('started_at', { ascending: false })
      .limit(200)
    setEntries(data || [])
    setLoading(false)
  }, [profile?.id])

  useEffect(() => {
    load()
    supabase.from('projects').select('id, title').order('title').then(({ data }) => setProjects(data || []))
  }, [load])

  useEffect(() => {
    if (form.project_id) {
      supabase.from('tasks').select('id, title').eq('project_id', form.project_id).then(({ data }) => setTasks(data || []))
    } else setTasks([])
  }, [form.project_id])

  // Timer tick
  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => setElapsed(p => p + 1), 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [isRunning])

  async function startTimer() {
    if (!form.project_id) { toast.error('Sélectionnez un projet'); return }
    const now = new Date()
    setStartTime(now); setElapsed(0); setIsRunning(true)
    const { data, error } = await supabase.from('time_entries').insert({
      user_id: profile?.id, project_id: form.project_id,
      task_id: form.task_id || null, description: form.description || null,
      hourly_rate: form.hourly_rate, is_billable: form.is_billable,
      started_at: now.toISOString(),
    }).select().single()
    if (error) { toast.error(error.message); setIsRunning(false); return }
    setActiveEntryId(data.id)
    toast.success('Chronomètre démarré')
  }

  async function stopTimer() {
    if (!activeEntryId || !startTime) return
    const now = new Date()
    const duration = Math.floor((now.getTime() - startTime.getTime()) / 1000)
    setIsRunning(false)
    const { error } = await supabase.from('time_entries').update({
      ended_at: now.toISOString(), duration_seconds: duration,
    }).eq('id', activeEntryId)
    if (error) { toast.error(error.message); return }
    setActiveEntryId(null); setElapsed(0); setStartTime(null)
    toast.success(`Temps enregistré: ${formatDurationShort(duration)}`)
    load()
  }

  async function addManualEntry() {
    if (!manual.project_id) { toast.error('Sélectionnez un projet'); return }
    const started = new Date(`${manual.date}T${manual.start_time}:00`)
    const ended = new Date(`${manual.date}T${manual.end_time}:00`)
    if (ended <= started) { toast.error('L\'heure de fin doit être après le début'); return }
    const duration = Math.floor((ended.getTime() - started.getTime()) / 1000)
    const { error } = await supabase.from('time_entries').insert({
      user_id: profile?.id, project_id: manual.project_id,
      task_id: manual.task_id || null, description: manual.description || null,
      hourly_rate: manual.hourly_rate, is_billable: manual.is_billable,
      started_at: started.toISOString(), ended_at: ended.toISOString(),
      duration_seconds: duration,
    })
    if (error) { toast.error(error.message); return }
    toast.success('Entrée ajoutée')
    load()
  }

  async function deleteEntry(id: string) {
    await supabase.from('time_entries').delete().eq('id', id)
    toast.success('Entrée supprimée')
    load()
  }

  // Stats
  const completedEntries = entries.filter(e => e.duration_seconds)
  const { monday, sunday } = getWeekRange(weekOffset)
  const weekEntries = completedEntries.filter(e => {
    const d = new Date(e.started_at)
    return d >= monday && d <= sunday
  })
  const todayEntries = completedEntries.filter(e => {
    const d = new Date(e.started_at)
    return d.toDateString() === new Date().toDateString()
  })

  const todaySeconds = todayEntries.reduce((s, e) => s + (e.duration_seconds || 0), 0)
  const weekSeconds = weekEntries.reduce((s, e) => s + (e.duration_seconds || 0), 0)
  const billableSeconds = weekEntries.filter(e => e.is_billable).reduce((s, e) => s + (e.duration_seconds || 0), 0)
  const billableAmount = weekEntries.filter(e => e.is_billable).reduce((s, e) => s + ((e.duration_seconds || 0) / 3600) * (e.hourly_rate || 0), 0)

  // Chart data — hours per day of selected week
  const daysOfWeek = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
  const chartData = daysOfWeek.map((label, i) => {
    const day = new Date(monday)
    day.setDate(monday.getDate() + i)
    const dayEntries = weekEntries.filter(e => {
      const d = new Date(e.started_at)
      return d.toDateString() === day.toDateString()
    })
    const hours = dayEntries.reduce((s, e) => s + (e.duration_seconds || 0), 0) / 3600
    return { label, hours: parseFloat(hours.toFixed(2)), date: day }
  })

  // Chart data — hours per project
  const projectChart: Record<string, number> = {}
  weekEntries.forEach(e => {
    const name = e.projects?.title || 'Inconnu'
    projectChart[name] = (projectChart[name] || 0) + (e.duration_seconds || 0) / 3600
  })
  const projectData = Object.entries(projectChart).map(([name, hours]) => ({ name, hours: parseFloat(hours.toFixed(2)) }))

  // Group entries by date for the selected week
  const grouped: Record<string, any[]> = {}
  weekEntries.forEach(e => {
    const date = new Date(e.started_at).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
    if (!grouped[date]) grouped[date] = []
    grouped[date].push(e)
  })

  const weekLabel = `${monday.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} – ${sunday.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}`
  const isCurrentWeek = weekOffset === 0

  const COLORS = ['#0066FF', '#00E5FF', '#6A00FF', '#8A8F98', '#FF6B35']

  return (
    <div className="min-h-screen p-4 md:p-6 space-y-6 pt-4 md:pt-6" style={{ background: '#0B0F14' }}>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Clock className="h-6 w-6" style={{ color: '#00E5FF' }} />
            Time Tracking
          </h1>
          <p className="text-sm mt-1" style={{ color: '#8A8F98' }}>Suivez le temps, maximisez la rentabilité</p>
        </div>
        {/* Week navigator */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border" style={{ borderColor: '#1a2035', background: '#0d1320' }}>
          <button onClick={() => setWeekOffset(o => o - 1)} className="hover:text-white transition-colors" style={{ color: '#8A8F98' }}>
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-xs font-medium px-2" style={{ color: isCurrentWeek ? '#00E5FF' : '#8A8F98' }}>
            {isCurrentWeek ? 'Cette semaine' : weekLabel}
          </span>
          <button onClick={() => setWeekOffset(o => Math.min(0, o + 1))} className="hover:text-white transition-colors" style={{ color: weekOffset < 0 ? '#8A8F98' : '#2a3550' }}>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Aujourd'hui", value: formatDurationShort(todaySeconds), icon: <Clock className="h-4 w-4" />, color: '#00E5FF', sub: null },
          { label: 'Cette semaine', value: formatDurationShort(weekSeconds), icon: <TrendingUp className="h-4 w-4" />, color: '#0066FF', sub: weekLabel },
          { label: 'Temps facturable', value: formatDurationShort(billableSeconds), icon: <Timer className="h-4 w-4" />, color: '#6A00FF', sub: weekSeconds > 0 ? `${Math.round(billableSeconds / weekSeconds * 100)}%` : '0%' },
          { label: 'CA potentiel', value: billableAmount.toLocaleString('fr-FR', { maximumFractionDigits: 0 }), icon: <DollarSign className="h-4 w-4" />, color: '#00E5FF', sub: 'GNF' },
        ].map((kpi, i) => (
          <div key={i} className="rounded-xl p-4 border relative overflow-hidden" style={{ background: '#0d1320', borderColor: '#1a2035' }}>
            <div className="absolute top-0 left-0 w-1 h-full rounded-l-xl" style={{ background: kpi.color }} />
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium uppercase tracking-wider" style={{ color: '#8A8F98' }}>{kpi.label}</p>
              <span style={{ color: kpi.color }}>{kpi.icon}</span>
            </div>
            <p className="text-2xl font-bold font-mono text-white">{kpi.value}</p>
            {kpi.sub && <p className="text-xs mt-1" style={{ color: '#8A8F98' }}>{kpi.sub}</p>}
          </div>
        ))}
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left — Timer + Form */}
        <div className="lg:col-span-2 space-y-4">

          {/* Timer card */}
          <div className="rounded-xl border overflow-hidden" style={{ background: '#0d1320', borderColor: isRunning ? '#0066FF' : '#1a2035' }}>
            {/* Chrono display */}
            <div className="relative flex flex-col items-center justify-center py-8" style={{ background: isRunning ? 'linear-gradient(135deg, #0d1a30 0%, #0a1525 100%)' : '#0d1320' }}>
              {isRunning && (
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute inset-0 rounded-t-xl animate-pulse opacity-10" style={{ background: '#0066FF' }} />
                </div>
              )}
              <div className="relative z-10 flex flex-col items-center gap-2">
                {isRunning && (
                  <div className="flex items-center gap-2 mb-2">
                    <span className="h-2 w-2 rounded-full animate-pulse" style={{ background: '#00E5FF' }} />
                    <span className="text-xs font-medium uppercase tracking-widest" style={{ color: '#00E5FF' }}>En cours</span>
                    <span className="h-2 w-2 rounded-full animate-pulse" style={{ background: '#00E5FF' }} />
                  </div>
                )}
                <div className="font-mono font-bold tracking-tight" style={{ fontSize: '4rem', color: isRunning ? '#00E5FF' : '#2a3550', lineHeight: 1, textShadow: isRunning ? '0 0 40px rgba(0,229,255,0.3)' : 'none' }}>
                  {formatDuration(elapsed)}
                </div>
                {isRunning && form.project_id && (
                  <p className="text-sm mt-2" style={{ color: '#8A8F98' }}>
                    {projects.find(p => p.id === form.project_id)?.title}
                    {form.description && ` — ${form.description}`}
                  </p>
                )}
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b" style={{ borderColor: '#1a2035' }}>
              {(['timer', 'manual'] as const).map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className="flex-1 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2"
                  style={{ color: activeTab === tab ? '#00E5FF' : '#8A8F98', borderBottom: activeTab === tab ? '2px solid #00E5FF' : '2px solid transparent', background: 'transparent' }}>
                  {tab === 'timer' ? <><Zap className="h-3.5 w-3.5" />Chronomètre</> : <><Plus className="h-3.5 w-3.5" />Saisie manuelle</>}
                </button>
              ))}
            </div>

            {/* Form */}
            <div className="p-5">
              {activeTab === 'timer' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium" style={{ color: '#8A8F98' }}>Projet *</label>
                    <select value={form.project_id} onChange={e => setForm(f => ({ ...f, project_id: e.target.value, task_id: '' }))}
                      disabled={isRunning}
                      className="w-full rounded-lg px-3 py-2 text-sm border outline-none focus:ring-1 focus:ring-cyan-500 disabled:opacity-50"
                      style={{ background: '#0B0F14', borderColor: '#1a2035', color: '#fff' }}>
                      <option value="">Choisir un projet</option>
                      {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium" style={{ color: '#8A8F98' }}>Tâche</label>
                    <select value={form.task_id} onChange={e => setForm(f => ({ ...f, task_id: e.target.value }))}
                      disabled={isRunning || tasks.length === 0}
                      className="w-full rounded-lg px-3 py-2 text-sm border outline-none focus:ring-1 focus:ring-cyan-500 disabled:opacity-50"
                      style={{ background: '#0B0F14', borderColor: '#1a2035', color: '#fff' }}>
                      <option value="">Optionnel</option>
                      {tasks.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium" style={{ color: '#8A8F98' }}>Description</label>
                    <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                      disabled={isRunning} placeholder="Ce que vous faites..."
                      className="w-full rounded-lg px-3 py-2 text-sm border outline-none focus:ring-1 focus:ring-cyan-500 disabled:opacity-50"
                      style={{ background: '#0B0F14', borderColor: '#1a2035', color: '#fff' }} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium" style={{ color: '#8A8F98' }}>Taux horaire (GNF)</label>
                    <input type="number" value={form.hourly_rate} onChange={e => setForm(f => ({ ...f, hourly_rate: Number(e.target.value) }))}
                      disabled={isRunning} placeholder="0"
                      className="w-full rounded-lg px-3 py-2 text-sm border outline-none focus:ring-1 focus:ring-cyan-500 disabled:opacity-50"
                      style={{ background: '#0B0F14', borderColor: '#1a2035', color: '#fff' }} />
                  </div>
                  <div className="flex items-center gap-3 col-span-full">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <div onClick={() => !isRunning && setForm(f => ({ ...f, is_billable: !f.is_billable }))}
                        className="w-9 h-5 rounded-full transition-colors flex items-center px-0.5"
                        style={{ background: form.is_billable ? '#0066FF' : '#1a2035', cursor: isRunning ? 'not-allowed' : 'pointer' }}>
                        <div className="w-4 h-4 rounded-full bg-card transition-transform" style={{ transform: form.is_billable ? 'translateX(16px)' : 'translateX(0)' }} />
                      </div>
                      <span className="text-sm" style={{ color: form.is_billable ? '#00E5FF' : '#8A8F98' }}>Facturable</span>
                    </label>
                    <div className="flex-1" />
                    {!isRunning ? (
                      <button onClick={startTimer}
                        className="flex items-center gap-2 px-6 py-2.5 rounded-lg font-semibold text-sm transition-all hover:opacity-90"
                        style={{ background: 'linear-gradient(135deg, #0066FF, #00E5FF)', color: '#fff' }}>
                        <Play className="h-4 w-4" /> Démarrer
                      </button>
                    ) : (
                      <button onClick={stopTimer}
                        className="flex items-center gap-2 px-6 py-2.5 rounded-lg font-semibold text-sm transition-all hover:opacity-90"
                        style={{ background: 'linear-gradient(135deg, #FF3B30, #FF6B35)', color: '#fff' }}>
                        <Square className="h-4 w-4" /> Arrêter
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium" style={{ color: '#8A8F98' }}>Projet *</label>
                    <select value={manual.project_id} onChange={e => setManual(f => ({ ...f, project_id: e.target.value }))}
                      className="w-full rounded-lg px-3 py-2 text-sm border outline-none focus:ring-1 focus:ring-cyan-500"
                      style={{ background: '#0B0F14', borderColor: '#1a2035', color: '#fff' }}>
                      <option value="">Choisir un projet</option>
                      {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium" style={{ color: '#8A8F98' }}>Date</label>
                    <input type="date" value={manual.date} onChange={e => setManual(f => ({ ...f, date: e.target.value }))}
                      className="w-full rounded-lg px-3 py-2 text-sm border outline-none focus:ring-1 focus:ring-cyan-500"
                      style={{ background: '#0B0F14', borderColor: '#1a2035', color: '#fff' }} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium" style={{ color: '#8A8F98' }}>Heure début</label>
                    <input type="time" value={manual.start_time} onChange={e => setManual(f => ({ ...f, start_time: e.target.value }))}
                      className="w-full rounded-lg px-3 py-2 text-sm border outline-none focus:ring-1 focus:ring-cyan-500"
                      style={{ background: '#0B0F14', borderColor: '#1a2035', color: '#fff' }} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium" style={{ color: '#8A8F98' }}>Heure fin</label>
                    <input type="time" value={manual.end_time} onChange={e => setManual(f => ({ ...f, end_time: e.target.value }))}
                      className="w-full rounded-lg px-3 py-2 text-sm border outline-none focus:ring-1 focus:ring-cyan-500"
                      style={{ background: '#0B0F14', borderColor: '#1a2035', color: '#fff' }} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium" style={{ color: '#8A8F98' }}>Description</label>
                    <input value={manual.description} onChange={e => setManual(f => ({ ...f, description: e.target.value }))}
                      placeholder="Décrivez la tâche..."
                      className="w-full rounded-lg px-3 py-2 text-sm border outline-none focus:ring-1 focus:ring-cyan-500"
                      style={{ background: '#0B0F14', borderColor: '#1a2035', color: '#fff' }} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium" style={{ color: '#8A8F98' }}>Taux horaire (GNF)</label>
                    <input type="number" value={manual.hourly_rate} onChange={e => setManual(f => ({ ...f, hourly_rate: Number(e.target.value) }))}
                      placeholder="0"
                      className="w-full rounded-lg px-3 py-2 text-sm border outline-none focus:ring-1 focus:ring-cyan-500"
                      style={{ background: '#0B0F14', borderColor: '#1a2035', color: '#fff' }} />
                  </div>
                  <div className="flex items-center gap-3 col-span-full justify-between">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <div onClick={() => setManual(f => ({ ...f, is_billable: !f.is_billable }))}
                        className="w-9 h-5 rounded-full transition-colors flex items-center px-0.5 cursor-pointer"
                        style={{ background: manual.is_billable ? '#0066FF' : '#1a2035' }}>
                        <div className="w-4 h-4 rounded-full bg-card transition-transform" style={{ transform: manual.is_billable ? 'translateX(16px)' : 'translateX(0)' }} />
                      </div>
                      <span className="text-sm" style={{ color: manual.is_billable ? '#00E5FF' : '#8A8F98' }}>Facturable</span>
                    </label>
                    <button onClick={addManualEntry}
                      className="flex items-center gap-2 px-6 py-2.5 rounded-lg font-semibold text-sm transition-all hover:opacity-90"
                      style={{ background: 'linear-gradient(135deg, #6A00FF, #0066FF)', color: '#fff' }}>
                      <CheckCircle2 className="h-4 w-4" /> Enregistrer
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Entries list */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: '#8A8F98' }}>
                Entrées — {weekLabel}
              </h2>
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#1a2035', color: '#00E5FF' }}>{weekEntries.length}</span>
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-6 w-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#0066FF', borderTopColor: 'transparent' }} />
              </div>
            ) : weekEntries.length === 0 ? (
              <div className="rounded-xl border py-12 text-center" style={{ background: '#0d1320', borderColor: '#1a2035' }}>
                <Clock className="h-10 w-10 mx-auto mb-3" style={{ color: '#2a3550' }} />
                <p style={{ color: '#8A8F98' }}>Aucune entrée pour cette semaine</p>
              </div>
            ) : (
              Object.entries(grouped).map(([date, dayEntries]) => (
                <div key={date}>
                  <div className="flex items-center justify-between mb-2 px-1">
                    <p className="text-xs font-semibold capitalize" style={{ color: '#8A8F98' }}>{date}</p>
                    <p className="text-xs font-mono" style={{ color: '#00E5FF' }}>
                      {formatDurationShort(dayEntries.reduce((s, e) => s + (e.duration_seconds || 0), 0))}
                    </p>
                  </div>
                  <div className="rounded-xl border overflow-hidden" style={{ background: '#0d1320', borderColor: '#1a2035' }}>
                    {dayEntries.map((entry, i) => (
                      <div key={entry.id} className="flex items-center gap-3 px-4 py-3 group transition-colors hover:bg-card/[0.02]"
                        style={{ borderTop: i > 0 ? '1px solid #1a2035' : 'none' }}>
                        <div className="h-2 w-2 rounded-full shrink-0" style={{ background: entry.is_billable ? '#0066FF' : '#2a3550' }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">{entry.projects?.title || '—'}</p>
                          {entry.description && <p className="text-xs truncate" style={{ color: '#8A8F98' }}>{entry.description}</p>}
                          {entry.tasks?.title && <p className="text-xs" style={{ color: '#6A00FF' }}>↳ {entry.tasks.title}</p>}
                        </div>
                        <div className="text-right shrink-0 space-y-0.5">
                          <p className="text-sm font-mono font-bold text-white">{formatDurationShort(entry.duration_seconds || 0)}</p>
                          {entry.is_billable && entry.hourly_rate > 0 ? (
                            <p className="text-xs font-medium" style={{ color: '#00E5FF' }}>
                              {((entry.duration_seconds / 3600) * entry.hourly_rate).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} GNF
                            </p>
                          ) : (
                            <p className="text-xs" style={{ color: '#2a3550' }}>Non fact.</p>
                          )}
                        </div>
                        <p className="text-xs shrink-0 font-mono" style={{ color: '#8A8F98' }}>
                          {new Date(entry.started_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          {entry.ended_at && `–${new Date(entry.ended_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`}
                        </p>
                        <button onClick={() => deleteEntry(entry.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-500/20"
                          style={{ color: '#8A8F98' }}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right — Charts */}
        <div className="space-y-4">

          {/* Daily bar chart */}
          <div className="rounded-xl border p-4" style={{ background: '#0d1320', borderColor: '#1a2035' }}>
            <div className="flex items-center gap-2 mb-4">
              <BarChart2 className="h-4 w-4" style={{ color: '#0066FF' }} />
              <h3 className="text-sm font-semibold text-white">Heures par jour</h3>
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={chartData} barSize={20}>
                <XAxis dataKey="label" tick={{ fill: '#8A8F98', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#8A8F98', fontSize: 10 }} axisLine={false} tickLine={false} width={25} />
                <Tooltip
                  contentStyle={{ background: '#0d1320', border: '1px solid #1a2035', borderRadius: 8, color: '#fff', fontSize: 12 }}
                  formatter={(v: any) => [`${v}h`, 'Heures']}
                  cursor={{ fill: 'rgba(0,102,255,0.05)' }}
                />
                <Bar dataKey="hours" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.date.toDateString() === new Date().toDateString() ? '#00E5FF' : '#0066FF'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Project breakdown */}
          <div className="rounded-xl border p-4" style={{ background: '#0d1320', borderColor: '#1a2035' }}>
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="h-4 w-4" style={{ color: '#6A00FF' }} />
              <h3 className="text-sm font-semibold text-white">Par projet</h3>
            </div>
            {projectData.length === 0 ? (
              <p className="text-xs text-center py-6" style={{ color: '#2a3550' }}>Aucune donnée</p>
            ) : (
              <div className="space-y-3">
                {projectData.sort((a, b) => b.hours - a.hours).map((p, i) => {
                  const max = Math.max(...projectData.map(x => x.hours))
                  const pct = max > 0 ? (p.hours / max) * 100 : 0
                  return (
                    <div key={p.name}>
                      <div className="flex justify-between items-center mb-1">
                        <p className="text-xs font-medium text-white truncate flex-1 mr-2">{p.name}</p>
                        <p className="text-xs font-mono shrink-0" style={{ color: COLORS[i % COLORS.length] }}>{p.hours}h</p>
                      </div>
                      <div className="h-1.5 rounded-full" style={{ background: '#1a2035' }}>
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: COLORS[i % COLORS.length] }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Weekly summary */}
          <div className="rounded-xl border p-4 space-y-3" style={{ background: '#0d1320', borderColor: '#1a2035' }}>
            <h3 className="text-sm font-semibold text-white">Résumé semaine</h3>
            {[
              { label: 'Total heures', value: formatDurationShort(weekSeconds), color: '#fff' },
              { label: 'Facturable', value: formatDurationShort(billableSeconds), color: '#00E5FF' },
              { label: 'Non facturable', value: formatDurationShort(weekSeconds - billableSeconds), color: '#8A8F98' },
              { label: 'CA potentiel', value: `${billableAmount.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} GNF`, color: '#0066FF' },
            ].map((row, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b last:border-0" style={{ borderColor: '#1a2035' }}>
                <span className="text-xs" style={{ color: '#8A8F98' }}>{row.label}</span>
                <span className="text-sm font-semibold font-mono" style={{ color: row.color }}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
