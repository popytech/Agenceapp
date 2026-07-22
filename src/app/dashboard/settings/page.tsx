'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { toast } from 'sonner'
import { Save, Settings, User, Bell, Shield, Building, Camera, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

const roleLabels: Record<string, string> = {
  super_admin: 'Super Admin',
  ceo: 'CEO / Dirigeant',
  dirigeant: 'CEO / Dirigeant',
  chef_projet: 'Chef de Projet',
  creatrice_contenu: 'Créatrice de contenu',
  commercial_digital: 'Commercial Digital',
  designer: 'Designer',
  designer_senior: 'Designer Senior',
  developpeur: 'Développeur',
  marketeur: 'Marketeur',
  cm: 'Community Manager',
  'vidéaste': 'Vidéaste',
  monteur_video: 'Monteur Vidéo',
  formateur: 'Formateur',
  responsable_formations: 'Responsable Formations',
  assistante_direction: 'Assistante de Direction',
  stagiaire: 'Stagiaire',
  client: 'Client',
}

export default function SettingsPage() {
  const { user, profile, refreshProfile } = useAuth()
  const [profileForm, setProfileForm] = useState({ full_name: '', phone: '' })
  const [agencySettings, setAgencySettings] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [savingAgency, setSavingAgency] = useState(false)
  const [activityLogs, setActivityLogs] = useState<any[]>([])
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (profile) {
      setProfileForm({ full_name: profile.full_name || '', phone: profile.phone || '' })
    }
  }, [profile])

  useEffect(() => {
    async function loadSettings() {
      const { data } = await supabase.from('settings').select('*')
      const map: Record<string, string> = {}
      for (const s of data || []) map[s.key] = s.value || ''
      setAgencySettings(map)
    }
    async function loadLogs() {
      const { data } = await supabase.from('activity_logs').select('*').order('created_at', { ascending: false }).limit(20)
      setActivityLogs(data || [])
    }
    loadSettings()
    loadLogs()
  }, [])

  async function saveProfile() {
    if (!user) return
    setSaving(true)
    const { error } = await supabase.from('profiles').update(profileForm).eq('id', user.id)
    if (error) toast.error('Erreur mise à jour profil')
    else { toast.success('Profil mis à jour'); refreshProfile() }
    setSaving(false)
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !user) return
    if (file.size > 2 * 1024 * 1024) { toast.error('Photo max 2 Mo'); return }
    setUploadingAvatar(true)
    const ext = file.name.split('.').pop()
    const path = `avatars/${user.id}.${ext}`
    const { error: upErr } = await supabase.storage.from('project-uploads').upload(path, file, { upsert: true })
    if (upErr) { toast.error('Erreur upload avatar'); setUploadingAvatar(false); return }
    const { data: { publicUrl } } = supabase.storage.from('project-uploads').getPublicUrl(path)
    const { error: dbErr } = await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id)
    if (dbErr) toast.error('Erreur mise à jour avatar')
    else { toast.success('Photo de profil mise à jour'); refreshProfile() }
    setUploadingAvatar(false)
  }

  async function saveAgencySettings() {
    setSavingAgency(true)
    for (const [key, value] of Object.entries(agencySettings)) {
      await supabase.from('settings').update({ value, updated_at: new Date().toISOString() }).eq('key', key)
    }
    toast.success('Paramètres agence sauvegardés')
    setSavingAgency(false)
  }

  const initials = (profile?.full_name || 'PT').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6 pt-4 md:pt-6">
      <div>
        <h1 className="text-2xl font-bold">Paramètres</h1>
        <p className="text-muted-foreground text-sm mt-1">Gérez votre profil et les paramètres de l&apos;agence</p>
      </div>

      <Tabs defaultValue="profile">
        <TabsList className="mb-6">
          <TabsTrigger value="profile" className="gap-2"><User className="h-4 w-4" /> Profil</TabsTrigger>
          <TabsTrigger value="agency" className="gap-2"><Building className="h-4 w-4" /> Agence</TabsTrigger>
          <TabsTrigger value="security" className="gap-2"><Shield className="h-4 w-4" /> Sécurité</TabsTrigger>
          <TabsTrigger value="logs" className="gap-2"><Bell className="h-4 w-4" /> Journal</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <Card className="border-border/50">
            <CardHeader><CardTitle className="text-base">Mon profil</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="relative group">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={profile?.avatar_url ?? undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold">{initials}</AvatarFallback>
                  </Avatar>
                  <button
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                  >
                    {uploadingAvatar
                      ? <Loader2 className="h-5 w-5 text-white animate-spin" />
                      : <Camera className="h-5 w-5 text-white" />
                    }
                  </button>
                  <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                </div>
                <div>
                  <p className="font-semibold text-lg">{profile?.full_name || 'Sans nom'}</p>
                  <p className="text-muted-foreground text-sm">{profile?.email}</p>
                  <Badge variant="outline" className="mt-1 text-xs">{roleLabels[profile?.role || 'client']}</Badge>
                  <p className="text-[10px] text-muted-foreground mt-1">Clique sur la photo pour changer</p>
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nom complet</Label>
                  <Input value={profileForm.full_name} onChange={e => setProfileForm(f => ({ ...f, full_name: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Téléphone</Label>
                  <Input placeholder="+225 07 00 00 00" value={profileForm.phone} onChange={e => setProfileForm(f => ({ ...f, phone: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={profile?.email || ''} disabled className="opacity-60" />
                </div>
                <div className="space-y-2">
                  <Label>Rôle</Label>
                  <Input value={roleLabels[profile?.role || 'client']} disabled className="opacity-60" />
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={saveProfile} disabled={saving} className="gap-2">
                  <Save className="h-4 w-4" />{saving ? 'Enregistrement...' : 'Sauvegarder'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Agency Tab */}
        <TabsContent value="agency">
          <Card className="border-border/50">
            <CardHeader><CardTitle className="text-base">Paramètres agence</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { key: 'agency_name', label: 'Nom de l\'agence' },
                  { key: 'agency_email', label: 'Email de l\'agence' },
                  { key: 'agency_phone', label: 'Téléphone' },
                  { key: 'agency_address', label: 'Adresse' },
                  { key: 'default_currency', label: 'Devise par défaut' },
                  { key: 'invoice_prefix', label: 'Préfixe factures' },
                  { key: 'quote_prefix', label: 'Préfixe devis' },
                ].map(({ key, label }) => (
                  <div key={key} className="space-y-2">
                    <Label>{label}</Label>
                    <Input
                      value={agencySettings[key] || ''}
                      onChange={e => setAgencySettings(s => ({ ...s, [key]: e.target.value }))}
                    />
                  </div>
                ))}
                <div className="space-y-2">
                  <Label>Langue par défaut</Label>
                  <Select value={agencySettings['default_language'] || 'fr'} onValueChange={v => setAgencySettings(s => ({ ...s, default_language: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fr">Français</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={saveAgencySettings} disabled={savingAgency} className="gap-2">
                  <Save className="h-4 w-4" />{savingAgency ? 'Enregistrement...' : 'Sauvegarder'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security">
          <Card className="border-border/50">
            <CardHeader><CardTitle className="text-base">Sécurité du compte</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 bg-muted rounded-xl">
                <p className="font-medium mb-1">Authentification à deux facteurs (2FA)</p>
                <p className="text-sm text-muted-foreground mb-3">Renforcez la sécurité de votre compte avec un second facteur d&apos;authentification.</p>
                <Button variant="outline" size="sm" disabled>
                  {profile?.two_factor_enabled ? 'Désactiver 2FA' : 'Activer 2FA'}
                  <Badge variant="outline" className="ml-2 text-xs">Bientôt</Badge>
                </Button>
              </div>
              <div className="p-4 bg-muted rounded-xl">
                <p className="font-medium mb-1">Changer le mot de passe</p>
                <p className="text-sm text-muted-foreground mb-3">Vous recevrez un email pour réinitialiser votre mot de passe.</p>
                <Button variant="outline" size="sm" onClick={async () => {
                  if (!profile?.email) return
                  await supabase.auth.resetPasswordForEmail(profile.email)
                  toast.success('Email de réinitialisation envoyé')
                }}>
                  Envoyer le lien de réinitialisation
                </Button>
              </div>
              <div className="p-4 bg-muted rounded-xl">
                <p className="font-medium mb-1">Statut du compte</p>
                <div className="flex items-center gap-2 mt-2">
                  <div className="h-2 w-2 rounded-full bg-chart-2" />
                  <span className="text-sm text-chart-2 font-medium">Compte actif</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs">
          <Card className="border-border/50">
            <CardHeader><CardTitle className="text-base">Journal d&apos;activité</CardTitle></CardHeader>
            <CardContent>
              {activityLogs.length === 0 ? (
                <div className="text-center py-8">
                  <Bell className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground text-sm">Aucune activité enregistrée</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {activityLogs.map(log => (
                    <div key={log.id} className="flex items-start gap-3 py-3 border-b border-border/50 last:border-0">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Settings className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{log.action}</p>
                        {log.description && <p className="text-xs text-muted-foreground">{log.description}</p>}
                      </div>
                      <p className="text-xs text-muted-foreground shrink-0">{new Date(log.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
