'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error) }, [error])
  const router = useRouter()
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="relative mx-auto mb-8 w-24 h-24 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-red-500/10 animate-pulse" />
          <AlertTriangle className="h-10 w-10 text-red-500 relative" />
        </div>
        <h1 className="text-xl font-bold text-foreground mb-2">Une erreur est survenue</h1>
        <p className="text-muted-foreground text-sm mb-2">
          Quelque chose s&apos;est mal passé. Tu peux réessayer ou retourner au tableau de bord.
        </p>
        {error?.message && (
          <code className="block text-xs bg-muted text-muted-foreground rounded-lg px-3 py-2 mb-6 max-w-full overflow-auto">
            {error.message}
          </code>
        )}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={reset}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors w-full sm:w-auto justify-center"
          >
            <RefreshCw className="h-4 w-4" /> Réessayer
          </button>
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity w-full sm:w-auto justify-center"
          >
            <Home className="h-4 w-4" /> Tableau de bord
          </button>
        </div>
      </div>
    </div>
  )
}
