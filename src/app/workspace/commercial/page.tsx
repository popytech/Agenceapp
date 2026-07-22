'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { 
  Handshake, TrendingUp, Users, Target, 
  BarChart2, Star, Clock, ArrowUpRight, Plus
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

export default function WorkspaceCommercialPage() {
  const { profile } = useAuth()

  return (
    <div className={cn("p-4 md:p-6 space-y-6 max-w-6xl mx-auto")}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-cyan-600">
            <Handshake className="h-7 w-7" />
            Espace Commercial & Ventes
          </h1>
          <p className="text-muted-foreground text-sm">Gérez vos opportunités, clients et performances commerciales.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" className="bg-cyan-600 hover:bg-cyan-700">
            <Plus className="h-4 w-4 mr-2" />
            Nouveau Lead
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Col: KPIs */}
        <div className="md:col-span-2 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <Card className="border-cyan-100 bg-cyan-50/30">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 rounded-lg bg-cyan-100 text-cyan-600">
                    <Target className="h-5 w-5" />
                  </div>
                  <Badge className="bg-cyan-200 text-cyan-700 hover:bg-cyan-200">+12%</Badge>
                </div>
                <div className="text-2xl font-bold">128</div>
                <div className="text-xs text-muted-foreground font-medium uppercase tracking-tight">Leads en cours</div>
              </CardContent>
            </Card>
            <Card className="border-emerald-100 bg-emerald-50/30">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 rounded-lg bg-emerald-100 text-emerald-600">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <Badge className="bg-emerald-200 text-emerald-700 hover:bg-emerald-200">+8%</Badge>
                </div>
                <div className="text-2xl font-bold">45</div>
                <div className="text-xs text-muted-foreground font-medium uppercase tracking-tight">Conversions ce mois</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Users className="h-4 w-4 text-cyan-600" />
                Dernières Opportunités
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { name: "Projet E-commerce - BioShop", value: "45,000 GNF", status: "En négociation", prob: 75 },
                  { name: "Identité Visuelle - Alpha Group", value: "12,500 GNF", status: "Proposition envoyée", prob: 40 },
                  { name: "Développement ERP - Kamsar SA", value: "85,000 GNF", status: "Découverte", prob: 20 },
                ].map((opt, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-border hover:border-cyan-200 hover:bg-cyan-50/20 transition-all cursor-pointer group">
                    <div>
                      <div className="font-semibold text-sm group-hover:text-cyan-700 transition-colors">{opt.name}</div>
                      <div className="text-[10px] text-muted-foreground flex items-center gap-2">
                        <span>{opt.status}</span>
                        <span>•</span>
                        <span className="font-bold text-cyan-600">{opt.value}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold">{opt.prob}%</div>
                      <Progress value={opt.prob} className="h-1 w-16" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Col: Performance & Activity */}
        <div className="space-y-6">
          <Card className="bg-gradient-to-br from-cyan-600 to-cyan-800 text-white border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-base">Objectif Mensuel</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-1">65%</div>
              <Progress value={65} className="h-2 bg-white/20" />
              <div className="mt-4 flex items-center justify-between text-xs text-white/70">
                <span>Actuel: 325k GNF</span>
                <span>Cible: 500k GNF</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Clock className="h-4 w-4 text-orange-500" />
                Activités Récentes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              {[
                { label: "Appel sortant", user: "Jean Camara", time: "Il y a 10 min", icon: <ArrowUpRight className="h-3 w-3" /> },
                { label: "Email envoyé", user: "Saliou Diallo", time: "Il y a 1h", icon: <Star className="h-3 w-3" /> },
                { label: "Rendez-vous fixé", user: "Mamadou Sow", time: "Aujourd'hui, 14h", icon: <BarChart2 className="h-3 w-3" /> },
              ].map((act, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="mt-1 h-6 w-6 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                    {act.icon}
                  </div>
                  <div>
                    <div className="text-xs font-bold">{act.label}</div>
                    <div className="text-[10px] text-muted-foreground">{act.user} • {act.time}</div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
