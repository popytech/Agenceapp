'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { Mail, Lock, Eye, EyeOff, ArrowRight, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function ClientLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, company_name, portal_password, portal_enabled')
        .eq('email', email.trim().toLowerCase())
        .single()

      if (error || !data) {
        toast.error('Compte client introuvable')
        return
      }

      if (!data.portal_enabled) {
        toast.error('Portail non activé pour ce compte')
        return
      }

      if (data.portal_password !== password) {
        toast.error('Mot de passe incorrect')
        return
      }

      // Store client session in localStorage
      localStorage.setItem('client_session', JSON.stringify({
        id: data.id,
        company_name: data.company_name,
        email: email.trim().toLowerCase(),
      }))

      toast.success(`Bienvenue, ${data.company_name}`)
      router.push('/client/dashboard')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4">
      {/* Background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-violet-600/20 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-white shadow-lg shadow-indigo-600/20 mb-4 p-2">
            <img 
              src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/project-uploads/25eb9797-83ec-431b-8731-1404e452f4c6/popy-tech-pro-2026-resized-1772085194508.webp?width=200&height=200&resize=contain" 
              alt="Logo"
              className="h-full w-full object-contain"
            />
          </div>
          <h1 className="text-2xl font-bold text-white">POPY TECH</h1>
          <p className="text-indigo-300 text-sm mt-1">Espace Client</p>
        </div>

        {/* Card */}
        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-3xl p-8 shadow-2xl">
          <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-indigo-500/20 rounded-xl">
                <Building2 className="h-5 w-5 text-indigo-300" />
              </div>
            <div>
              <h2 className="text-white font-bold text-lg">Connexion</h2>
              <p className="text-white/50 text-xs">Accédez à votre espace personnalisé</p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-white/70 text-sm">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                <Input
                  type="email"
                  placeholder="votre@email.com"
                  className="pl-10 h-11 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-indigo-400 focus:ring-indigo-400/20"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-white/70 text-sm">Mot de passe</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="pl-10 pr-10 h-11 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-indigo-400 focus:ring-indigo-400/20"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold mt-2 rounded-xl"
              disabled={loading}
            >
              {loading ? (
                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Accéder à mon espace
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          <p className="text-center text-white/30 text-xs mt-6">
            Vos identifiants vous sont fournis par votre gestionnaire de compte POPY TECH
          </p>
        </div>

        <p className="text-center text-white/20 text-xs mt-6">
          © 2026 POPY TECH — Portail Client
        </p>
      </div>
    </div>
  )
}
