'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { Plus, Search, Edit, Trash2, UserCheck, Calendar, Star as StarIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

const statusConfig = {
  actif: { label: 'Actif', class: 'border-chart-2 text-chart-2 bg-chart-2/10' },
  termine: { label: 'Terminé', class: 'border-muted-foreground text-muted-foreground bg-muted/30' },
  suspendu: { label: 'Suspendu', class: 'border-destructive text-destructive bg-destructive/10' },
}

const emptyForm = { school: '', domain: '', start_date: '', end_date: '', status: 'actif' as 'actif' | 'termine' | 'suspendu', evaluation_score: '', notes: '' }

export default function InternsPage() {
  const [interns, setInterns] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editIntern, setEditIntern] = useState<any | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  async function fetchInterns() {
    const { data } = await supabase
      .from('interns')
      .select('*, profiles!interns_user_id_fkey(full_name, email, avatar_url), mentor:profiles!interns_mentor_id_fkey(full_name)')
      .order('created_at', { ascending: false })
    setInterns(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchInterns() }, [])

  function openEdit(intern: any) {
    setEditIntern(intern)
    setForm({
      school: intern.school || '', domain: intern.domain || '',
      start_date: intern.start_date || '', end_date: intern.end_date || '',
      status: intern.status, evaluation_score: intern.evaluation_score?.toString() || '',
      notes: intern.notes || ''
    })
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!editIntern) return
    setSaving(true)
    const { error } = await supabase.from('interns').update({
      ...form,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      evaluation_score: form.evaluation_score ? parseInt(form.evaluation_score) : null
    }).eq('id', editIntern.id)
    if (error) toast.error('Erreur')
    else { toast.success('Stagiaire mis à jour'); fetchInterns(); setDialogOpen(false) }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    await supabase.from('interns').delete().eq('id', id)
    toast.success('Stagiaire supprimé')
    fetchInterns()
  }

  const filtered = interns.filter(i => {
    const name = i.profiles?.full_name || ''
    return search === '' || name.toLowerCase().includes(search.toLowerCase()) || (i.school || '').toLowerCase().includes(search.toLowerCase())
  })

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6 pt-4 md:pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Stagiaires</h1>
          <p className="text-muted-foreground text-sm mt-1">{interns.length} stagiaires enregistrés</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {Object.entries(statusConfig).map(([key, { label }]) => (
          <Card key={key} className="border-border/50">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{interns.filter(i => i.status === key).length}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Rechercher un stagiaire..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="h-8 w-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="py-16 text-center">
            <UserCheck className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">Aucun stagiaire trouvé</p>
            <p className="text-xs text-muted-foreground mt-2">Les stagiaires apparaissent après avoir été assigné le rôle stagiaire</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(intern => {
            const initials = (intern.profiles?.full_name || 'S').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
            return (
              <Card key={intern.id} className="border-border/50 hover:border-primary/30 transition-colors">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">{initials}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold text-sm">{intern.profiles?.full_name || 'Stagiaire'}</p>
                        <Badge variant="outline" className={cn('text-xs', statusConfig[intern.status as keyof typeof statusConfig]?.class)}>
                          {statusConfig[intern.status as keyof typeof statusConfig]?.label}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(intern)} className="text-muted-foreground hover:text-foreground transition-colors p-1">
                        <Edit className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => handleDelete(intern.id)} className="text-muted-foreground hover:text-destructive transition-colors p-1">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {intern.domain && <div><p className="text-muted-foreground">Domaine</p><p className="font-medium">{intern.domain}</p></div>}
                    {intern.school && <div><p className="text-muted-foreground">École</p><p className="font-medium truncate">{intern.school}</p></div>}
                    {intern.start_date && <div><p className="text-muted-foreground">Début</p><p className="font-medium">{new Date(intern.start_date).toLocaleDateString('fr-FR')}</p></div>}
                    {intern.end_date && <div><p className="text-muted-foreground">Fin</p><p className="font-medium">{new Date(intern.end_date).toLocaleDateString('fr-FR')}</p></div>}
                  </div>
                  {intern.evaluation_score !== null && intern.evaluation_score !== undefined && (
                    <div className="flex items-center gap-2">
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map(s => (
                          <StarIcon key={s} className={cn('h-3.5 w-3.5', s <= Math.round(intern.evaluation_score / 2) ? 'text-chart-3 fill-chart-3' : 'text-muted-foreground/30')} />
                        ))}
                      </div>
                      <span className="text-xs text-muted-foreground">{intern.evaluation_score}/10</span>
                    </div>
                  )}
                  {intern.mentor?.full_name && (
                    <p className="text-xs text-muted-foreground">Mentor: <span className="font-medium text-foreground">{intern.mentor.full_name}</span></p>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Modifier le stagiaire</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>École / Université</Label>
                <Input placeholder="Ex: ESATIC" value={form.school} onChange={e => setForm(f => ({ ...f, school: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Domaine</Label>
                <Input placeholder="Ex: Développement web" value={form.domain} onChange={e => setForm(f => ({ ...f, domain: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Début</Label><Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Fin</Label><Input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Statut</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="actif">Actif</SelectItem>
                    <SelectItem value="termine">Terminé</SelectItem>
                    <SelectItem value="suspendu">Suspendu</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Évaluation (0-10)</Label>
                <Input type="number" min="0" max="10" placeholder="Ex: 8" value={form.evaluation_score} onChange={e => setForm(f => ({ ...f, evaluation_score: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea rows={3} placeholder="Observations..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Enregistrement...' : 'Mettre à jour'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
