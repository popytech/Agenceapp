'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/auth-context'
import { 
  Scale, FileText, CheckCircle, Clock, AlertTriangle, 
  Search, Plus, Eye, Download, ShieldCheck
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface Contract {
  id: string
  title: string
  type: string
  status: 'actif' | 'expire' | 'en_attente' | 'resilie'
  parties: string
  start_date: string | null
  end_date: string | null
  signed_at: string | null
  signed_pdf_url: string | null
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  actif: { label: 'Actif', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  expire: { label: 'Expiré', color: 'bg-red-100 text-red-700', icon: AlertTriangle },
  en_attente: { label: 'En attente', color: 'bg-amber-100 text-amber-700', icon: Clock },
  resilie: { label: 'Résilié', color: 'bg-gray-100 text-gray-700', icon: AlertTriangle },
}

export default function WorkspaceContractsPage() {
  const { profile } = useAuth()
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const loadContracts = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/legal/contracts')
      const data = await res.json()
      setContracts(data.data || [])
    } catch (error) {
      console.error('Error loading contracts:', error)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    loadContracts()
  }, [loadContracts])

  const filteredContracts = contracts.filter(c => 
    c.title.toLowerCase().includes(search.toLowerCase()) ||
    c.parties.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Scale className="h-6 w-6 text-primary" />
            Contrats & Documents Légaux
          </h1>
          <p className="text-muted-foreground text-sm">Gérez vos contrats et documents officiels en un seul endroit.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadContracts}>
            Actualiser
          </Button>
          {profile?.role === 'super_admin' && (
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Nouveau Contrat
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{contracts.length}</div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Total Documents</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{contracts.filter(c => c.status === 'actif').length}</div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Contrats Actifs</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-amber-600">{contracts.filter(c => c.status === 'en_attente').length}</div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">En attente</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Documents Sécurisés</div>
          </CardContent>
        </Card>
      </div>

      {/* Main List */}
      <Card>
        <CardHeader className="border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Rechercher un contrat, une partie..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-md bg-white"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground font-medium border-b">
                <tr>
                  <th className="px-4 py-3 text-left">Contrat</th>
                  <th className="px-4 py-3 text-left">Type</th>
                  <th className="px-4 py-3 text-left">Parties</th>
                  <th className="px-4 py-3 text-left">Statut</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  [1, 2, 3].map(i => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={5} className="px-4 py-6 bg-muted/20"></td>
                    </tr>
                  ))
                ) : filteredContracts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground italic">
                      Aucun contrat trouvé.
                    </td>
                  </tr>
                ) : (
                  filteredContracts.map((c) => {
                    const status = STATUS_CONFIG[c.status] || STATUS_CONFIG.en_attente
                    return (
                      <tr key={c.id} className="hover:bg-muted/30 transition-colors group">
                        <td className="px-4 py-4">
                          <div className="font-semibold text-primary">{c.title}</div>
                          <div className="text-[10px] text-muted-foreground">Créé le {new Date(c.id === 'temp' ? Date.now() : 0).toLocaleDateString()}</div>
                        </td>
                        <td className="px-4 py-4">
                          <Badge variant="outline" className="text-[10px] uppercase">{c.type}</Badge>
                        </td>
                        <td className="px-4 py-4">
                          <div className="line-clamp-1 max-w-[200px] text-xs" title={c.parties}>
                            {c.parties}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className={cn('inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold', status.color)}>
                            <status.icon className="h-3 w-3" />
                            {status.label}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
                              <Eye className="h-4 w-4" />
                            </Button>
                            {c.signed_pdf_url && (
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-green-600">
                                <Download className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
