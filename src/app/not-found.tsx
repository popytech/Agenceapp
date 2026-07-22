'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Home, ArrowLeft, Search } from 'lucide-react'

export default function NotFound() {
  const router = useRouter()
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        {/* Illustration */}
        <div className="relative mx-auto mb-8 w-40 h-40 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-primary/5 animate-pulse" />
          <div className="absolute inset-4 rounded-full bg-primary/10" />
          <span className="relative text-6xl font-black text-primary/20 select-none">404</span>
        </div>

        <h1 className="text-2xl font-bold text-foreground mb-2">Page introuvable</h1>
        <p className="text-muted-foreground text-sm mb-8">
          Cette page n&apos;existe pas ou a été déplacée.<br />
          Vérifie l&apos;URL ou retourne au tableau de bord.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors w-full sm:w-auto justify-center"
          >
            <ArrowLeft className="h-4 w-4" /> Retour
          </button>
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity w-full sm:w-auto justify-center"
          >
            <Home className="h-4 w-4" /> Tableau de bord
          </Link>
        </div>
      </div>
    </div>
  )
}
