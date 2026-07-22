'use client'
// Trigger HMR update

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { toast } from 'sonner'
import {
  Eye, EyeOff, Mail, Lock, User, ArrowRight,
  TrendingUp, Users, Briefcase, CheckCircle2, LayoutDashboard, Building2,
  Target, Palette, Video, Megaphone, Code2, BookOpen, Quote, Sparkles, Handshake, Download, X, Monitor, Shield, ClipboardList
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { supabase } from '@/lib/supabase'
import { getRoleHomePath } from '@/lib/roles'

// ─── TYPES ────────────────────────────────────────────────────────────────────
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const ADMIN_ROLES = ['super_admin', 'ceo', 'dirigeant', 'chef_projet']

const WEEKLY_QUOTES: Record<string, string[]> = {
  ceo: [
    "La stratégie, c'est l'art de faire des choix. — Michael Porter",
    "Le leadership est la capacité à transformer une vision en réalité. — Warren Bennis",
    "On ne gère pas ce qu'on ne mesure pas. — Peter Drucker",
    "Le meilleur moyen de prédire l'avenir est de le créer. — Peter Drucker",
  ],
  dirigeant: [
    "La stratégie, c'est l'art de faire des choix. — Michael Porter",
    "Le leadership est la capacité à transformer une vision en réalité. — Warren Bennis",
    "On ne gère pas ce qu'on ne mesure pas. — Peter Drucker",
    "Le meilleur moyen de prédire l'avenir est de le créer. — Peter Drucker",
  ],
    designer: [
      "Le design n'est pas ce à quoi quelque chose ressemble. C'est comment ça fonctionne. — Steve Jobs",
      "La créativité, c'est l'intelligence qui s'amuse. — Albert Einstein",
      "Un bon design est honnête. — Dieter Rams",
      "La simplicité est la sophistication suprême. — Léonard de Vinci",
    ],
    designer_senior: [
      "Le design n'est pas ce à quoi quelque chose ressemble. C'est comment ça fonctionne. — Steve Jobs",
      "La créativité, c'est l'intelligence qui s'amuse. — Albert Einstein",
      "Le leadership en design consiste à donner une voix à l'utilisateur.",
      "L'expérience utilisateur est l'âme du produit. — Senior Design Wisdom",
    ],
    developpeur: [
    "Le code propre fait une chose, et il la fait bien. — Robert C. Martin",
    "Avant tout, résoudre le problème. Ensuite, écrire le code. — John Johnson",
    "Tout le monde peut écrire du code qu'un ordinateur comprend. Un bon développeur écrit du code que les humains comprennent.",
    "Debugger, c'est être le détective dans un film policier où tu es aussi le meurtrier. — Filipe Fortes",
  ],
  marketeur: [
    "Le marketing, c'est raconter l'histoire de la valeur que vous créez. — Seth Godin",
    "Ne cherchez pas de clients pour vos produits, cherchez des produits pour vos clients. — Seth Godin",
    "Le meilleur marketing ne ressemble pas à du marketing. — Tom Fishburne",
    "Votre client le plus mécontent est votre meilleure source d'apprentissage. — Bill Gates",
  ],
  cm: [
    "Les réseaux sociaux ne parlent pas aux gens. Ils parlent avec les gens. — David Amerland",
    "Le contenu est roi, mais l'engagement est reine. — Mari Smith",
    "Soyez utile, soyez humain, soyez remarquable. — Jay Baer",
    "Une communauté forte commence par des connexions authentiques.",
  ],
  'vidéaste': [
    "Un film n'est pas pensé, il se ressent. — Roger Ebert",
    "La caméra peut filmer la réalité, mais le cinéaste décide laquelle. — Ingmar Bergman",
    "Chaque cadre doit avoir un but, une émotion, un sens.",
    "La vidéo est l'art de capturer le temps et de le transformer en émotion.",
  ],
  monteur_video: [
    "Le montage transforme les rushs en magie. C'est là que le film naît vraiment.",
    "Un bon monteur est invisible — son travail, lui, ne l'est pas.",
    "Le rythme, c'est l'âme du montage. — Walter Murch",
    "Couper au bon moment, c'est l'art suprême du monteur.",
  ],
    formateur: [
      "L'éducation est l'arme la plus puissante pour changer le monde. — Nelson Mandela",
      "Enseigner, c'est apprendre deux fois. — Joseph Joubert",
      "Le meilleur enseignant n'est pas celui qui sait tout, mais celui qui inspire.",
      "Investir dans le savoir rapporte les meilleurs intérêts. — Benjamin Franklin",
    ],
      responsable_formations: [
        "Former, c'est investir dans le capital humain le plus précieux qui soit.",
        "Une academy performante est une machine à transformer des talents en experts.",
        "Le meilleur ROI d'une organisation : la formation de ses équipes.",
        "Piloter une academy, c'est allier pédagogie, stratégie et rentabilité.",
      ],
      assistante_direction: [
        "L'organisation, c'est l'art de transformer le chaos en efficacité.",
        "Une bonne assistante de direction ne gère pas le temps — elle le maîtrise.",
        "Anticiper, coordonner, faciliter : les piliers de l'excellence opérationnelle.",
        "Derrière chaque direction performante, il y a une assistante irremplaçable.",
      ],
  stagiaire: [
    "Chaque expert a d'abord été un débutant. — Hélène Hayes",
    "Le succès c'est aller d'échec en échec sans perdre son enthousiasme. — Winston Churchill",
    "Ne soyez pas embarrassé par vos échecs, apprenez-en et recommencez. — Richard Branson",
    "Votre seule limite aujourd'hui, c'est ce que vous pensez impossible.",
  ],
  creatrice_contenu: [
    "Le contenu que vous créez aujourd'hui forge l'audience de demain.",
    "Chaque idée mérite d'être explorée. Le meilleur contenu naît de l'authenticité.",
    "Créer, c'est transformer une émotion en quelque chose que les autres peuvent ressentir.",
    "Un bon hook, c'est la différence entre être vu et être ignoré.",
  ],
  commercial_digital: [
    "Vendre, c'est aider quelqu'un à résoudre un problème. — Zig Ziglar",
    "Le meilleur vendeur est celui qui écoute plus qu'il ne parle.",
    "Chaque 'non' vous rapproche d'un 'oui'. Persévérez.",
    "Un deal signé commence toujours par une relation de confiance construite.",
  ],
    chef_projet: [
      "Un projet bien planifié est à moitié réalisé.",
      "Le leadership, c'est l'art de faire des choix. — Michael Porter",
      "Un bon chef de projet transforme la complexité en clarté.",
      "Gérer un projet, c'est gérer des humains avant de gérer des tâches.",
    ],
    default: [
    "Le talent gagne des matchs, mais le travail d'équipe gagne des championnats. — Michael Jordan",
    "Le succès n'est pas final, l'échec n'est pas fatal : c'est le courage de continuer qui compte.",
    "Faites chaque jour quelque chose qui vous rapproche de vos objectifs.",
    "Les grandes choses en affaires ne se font jamais par une seule personne.",
  ],
}

const ROLE_META: Record<string, {
  icon: React.ElementType
  gradient: [string, string]
  label: string
  features: string[]
  headline: string
  sub: string
}> = {
    ceo: {
      icon: Building2, gradient: ['#000000', '#1e293b'],
      label: 'CEO / Dirigeant', headline: 'Pilotez la croissance\nde votre agence.',
      sub: 'Interface décisionnelle macro. Vision financière, performance des pôles et prévisions stratégiques.',
      features: ['Vue CEO Décisionnelle', 'Analyse de Rentabilité', 'Prévisions de Croissance'],
    },
    super_admin: {
    icon: Shield, gradient: ['#1e293b', '#0f172a'],
    label: 'Super Admin', headline: 'Pilotez votre agence\ncomme une machine.',
    sub: 'ERP complet pour agences digitales. Projets, clients, finances, équipes — tout en un.',
    features: ["Accès total à l'ERP", 'Configuration système', 'Supervision globale'],
  },
  chef_projet: {
    icon: Briefcase, gradient: ['#ea580c', '#d97706'],
    label: 'Chef de Projet', headline: 'Votre centre de\ncommande projets.',
    sub: 'Planifiez, coordinatez, livrez. Tout pour piloter vos projets avec précision.',
    features: ['Pilotage de projets', "Gestion d'équipe", 'Suivi des livrables'],
  },
    designer: {
      icon: Palette, gradient: ['#9333ea', '#ec4899'],
      label: 'Designer', headline: 'Créez sans limites,\nlivrez avec style.',
      sub: "Votre espace créatif : projets, deadlines, révisions et collaboration en un clin d'œil.",
      features: ['Projets design en cours', 'Deadlines et révisions', 'Collaboration créative'],
    },
    designer_senior: {
      icon: Palette, gradient: ['#7c3aed', '#ec4899'],
      label: 'Designer Senior', headline: 'Supervisez la création,\ninsufflez l\'excellence.',
      sub: "Votre cockpit de direction créative : supervision des projets, revues de design et mentoring.",
      features: ['Supervision des projets', 'Revues de design', 'Mentoring & Direction créative'],
    },
    developpeur: {
    icon: Code2, gradient: ['#2563eb', '#06b6d4'],
    label: 'Développeur', headline: 'Codez, livrez,\nrecommencez.',
    sub: 'Vos tâches techniques, le suivi du temps et les tickets — tout centralisé.',
    features: ['Tâches techniques', 'Suivi du temps', 'Gestion des tickets'],
  },
  marketeur: {
    icon: Target, gradient: ['#16a34a', '#34d399'],
    label: 'Marketeur', headline: 'Convertissez chaque\nopportunité.',
    sub: "Pipeline d'offres, objectifs quotidiens, suivi des conversions — tout en un.",
    features: ["Pipeline d'offres", 'Objectifs quotidiens', 'Suivi des conversions'],
  },
  cm: {
    icon: Megaphone, gradient: ['#0d9488', '#22d3ee'],
    label: 'Community Manager', headline: 'Animez, engagez,\nfidélisez.',
    sub: 'Planning de publications, calendrier éditorial, stats par plateforme.',
    features: ['Planning de publications', 'Calendrier éditorial', 'Stats des plateformes'],
  },
  'vidéaste': {
    icon: Video, gradient: ['#dc2626', '#ec4899'],
    label: 'Vidéaste', headline: 'Capturez, racontez,\nimpactez.',
    sub: 'Pipeline de production, tournages planifiés, suivi des livrables vidéo.',
    features: ['Pipeline de production', 'Tournages planifiés', 'Suivi des livrables'],
  },
  monteur_video: {
    icon: Video, gradient: ['#db2777', '#fb7185'],
    label: 'Monteur Vidéo', headline: "Montez l'ordinaire\nen extraordinaire.",
    sub: 'Projets en montage, révisions en attente, export et livraison client.',
    features: ['Projets en montage', 'Révisions en attente', 'Export et livraison'],
  },
    formateur: {
      icon: BookOpen, gradient: ['#d97706', '#fb923c'],
      label: 'Formateur', headline: 'Transmettez,\ntransformez.',
      sub: 'Vos formations, le suivi des apprenants et les modules de cours — centralisés.',
      features: ['Vos formations', 'Suivi des apprenants', 'Modules de cours'],
    },
      responsable_formations: {
        icon: BookOpen, gradient: ['#7c3aed', '#a855f7'],
        label: 'Resp. Formations', headline: 'Pilotez\nl\'Academy.',
        sub: 'Superviser les formations, gérer les formateurs, suivre les revenus — tout en un.',
        features: ['Catalogue & sessions', 'Apprenants & certifications', 'Revenus & rentabilité'],
      },
      assistante_direction: {
        icon: ClipboardList, gradient: ['#0f766e', '#0ea5e9'],
        label: 'Assistante Direction', headline: 'Organisez,\ncoordonnez.',
        sub: 'Gestion RH, présences, agenda, documents internes et suivi opérationnel de l\'agence.',
        features: ['RH & Pointage présences', 'Agenda & Rendez-vous', 'Documents internes'],
      },
    stagiaire: {
      icon: Sparkles, gradient: ['#0ea5e9', '#60a5fa'],
      label: 'Stagiaire', headline: 'Apprenez vite,\nprogressez fort.',

    sub: "Vos missions, votre progression et votre journal d'activity au quotidien.",
    features: ['Vos missions assignées', 'Progression & apprentissage', "Journal d'activité"],
  },
  creatrice_contenu: {
    icon: Sparkles, gradient: ['#c026d3', '#f472b6'],
    label: 'Créatrice de contenu', headline: 'Créez, captivez,\nimpactez.',
    sub: "Scripts, idées, tournages, pipeline de création — tout votre univers créatif centralisé.",
    features: ['Pipeline de création Kanban', "Banque d'idées & scripts", 'Calendrier de présence'],
  },
  commercial_digital: {
    icon: Handshake, gradient: ['#16a34a', '#0d9488'],
    label: 'Commercial Digital', headline: 'Convertissez chaque\nlead en client.',
    sub: 'Pipeline Kanban, fiches prospects, propositions personnalisées et suivi des objectifs.',
    features: ['Pipeline commercial Kanban', 'Gestion des prospects', 'Objectifs & commissions'],
  },
  default: {
    icon: Users, gradient: ['#7c3aed', '#c084fc'],
    label: 'Équipe', headline: 'Votre espace de\ntravail POPY TECH.',
    sub: 'Tout ce dont vous avez besoin pour performer au quotidien.',
    features: ['Vos tâches', 'Vos projets', "Journal d'activité"],
  },
}

// ─── UTILS ────────────────────────────────────────────────────────────────────
function getWeekNumber() {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 1)
  return Math.ceil(((now.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7)
}

function getWeeklyQuote(role: string): string {
  const quotes = WEEKLY_QUOTES[role] || WEEKLY_QUOTES.default
  return quotes[getWeekNumber() % quotes.length]
}

function formatCA(value: number): string {
  if (value >= 1_000_000) return (value / 1_000_000).toFixed(1).replace('.', ',') + 'M'
  if (value >= 1_000) return (value / 1_000).toFixed(0) + 'K'
  return value.toLocaleString('fr-FR')
}

// ─── PAGE PRINCIPALE ──────────────────────────────────────────────────────────
export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState('designer')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState({ projets: '…', clients: '…', ca: '…', taches: '…' })

  const { signIn, signUp, user, profile, loading: authLoading } = useAuth()
  const router = useRouter()

  const panelRole = mode === 'register' ? role : 'super_admin'

  // ─── COMPONENTS INTERNES ────────────────────────────────────────────────────
  function PWAInstallBanner() {
    const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
    const [dismissed, setDismissed] = useState(false)
    const [installed, setInstalled] = useState(false)

    useEffect(() => {
      if (window.matchMedia('(display-mode: standalone)').matches) { setInstalled(true); return }
      if (sessionStorage.getItem('pwa-banner-dismissed')) { setDismissed(true); return }
      const handler = (e: Event) => { e.preventDefault(); setInstallPrompt(e as BeforeInstallPromptEvent) }
      window.addEventListener('beforeinstallprompt', handler)
      return () => window.removeEventListener('beforeinstallprompt', handler)
    }, [])

    async function handleInstall() {
      if (!installPrompt) return
      await installPrompt.prompt()
      const { outcome } = await installPrompt.userChoice
      if (outcome === 'accepted') {
        setInstalled(true)
        toast.success('Application installée !', { description: 'Lancez POPY TECH depuis votre bureau.' })
      }
      setInstallPrompt(null)
    }

    if (installed || dismissed || !installPrompt) return null

    return (
      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl shadow-slate-200/60 p-4 flex items-start gap-3">
          <div className="shrink-0 h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-md shadow-indigo-300">
            <Monitor className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-900">Installer POPY TECH</p>
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">Accédez depuis votre bureau sans navigateur.</p>
            <div className="flex gap-2 mt-3">
              <Button size="sm" className="h-8 text-xs gap-1.5 bg-indigo-600 hover:bg-indigo-700" onClick={handleInstall}>
                <Download className="h-3.5 w-3.5" /> Installer
              </Button>
              <Button size="sm" variant="ghost" className="h-8 text-xs text-slate-500" onClick={() => { sessionStorage.setItem('pwa-banner-dismissed', '1'); setDismissed(true) }}>
                Plus tard
              </Button>
            </div>
          </div>
          <button onClick={() => { sessionStorage.setItem('pwa-banner-dismissed', '1'); setDismissed(true) }} className="shrink-0 text-slate-400 hover:text-slate-700 transition-colors mt-0.5">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    )
  }

    function LeftPanel({ role, stats }: { role: string, stats: any }) {
      const isAdmin = ADMIN_ROLES.includes(role)
    const meta = ROLE_META[role] || ROLE_META.default || { headline: 'Bienvenue', gradient: ['#000', '#000'], icon: Users }
    const Icon = meta.icon || Users
    const quote = getWeeklyQuote(role)
    const weekNum = getWeekNumber()
    const lines = (meta.headline || 'Bienvenue').split('\n')
    const [from, to] = meta.gradient || ['#000', '#000']

    const statCards = [
      { label: 'Projets actifs', value: stats.projets, icon: Briefcase, color: '#6366f1', bg: 'rgba(99,102,241,0.12)' },
      { label: 'Clients', value: stats.clients, icon: Users, color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
      { label: 'CA ce mois', value: stats.ca, icon: TrendingUp, color: '#a855f7', bg: 'rgba(168,85,247,0.12)' },
      { label: 'Tâches livrées', value: stats.taches, icon: CheckCircle2, color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
    ]

    return (
      <div
        className="hidden lg:flex lg:w-[52%] relative overflow-hidden flex-col"
        style={{ background: isAdmin ? `linear-gradient(160deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)` : `linear-gradient(160deg, ${from} 0%, ${to} 100%)`, color: 'white' }}
      >
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")', backgroundSize: '200px' }} />

        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full blur-[100px] pointer-events-none opacity-30"
          style={{ background: isAdmin ? '#6366f1' : '#ffffff' }} />
        <div className="absolute -bottom-40 -right-40 w-[400px] h-[400px] rounded-full blur-[100px] pointer-events-none opacity-20"
          style={{ background: isAdmin ? '#a855f7' : '#000000' }} />

        <div className="absolute inset-0 opacity-[0.06] pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

        <div className="relative z-10 flex flex-col h-full p-12 justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl flex items-center justify-center bg-white p-2 shadow-lg">
                <img 
                  src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/project-uploads/25eb9797-83ec-431b-8731-1404e452f4c6/popy-tech-pro-2026-resized-1772085194508.webp?width=400&height=400&resize=contain" 
                  alt="Logo POPY TECH"
                  className="h-full w-full object-contain"
                />
              </div>
              <span className="text-2xl font-bold tracking-tight text-white">POPY TECH</span>
            </div>
          </div>

          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5"
              style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', backdropFilter: 'blur(10px)' }}>
              <div className="h-2 w-2 rounded-full bg-white animate-pulse" />
              <Icon className="h-3.5 w-3.5 text-white" />
              <span className="text-xs font-semibold text-white">
                {isAdmin ? 'Tableau de bord Admin' : `Espace ${meta.label}`}
              </span>
            </div>

            <div>
              <h1 className="text-5xl xl:text-6xl font-black leading-[1.05] tracking-tight text-white">
                {lines[0]}
              </h1>
              <h1 className="text-5xl xl:text-6xl font-black leading-[1.05] tracking-tight text-white/60">
                {lines[1]}
              </h1>
            </div>

            <p className="text-base leading-relaxed max-w-md text-white/65">{meta.sub}</p>

            <div className="flex flex-col gap-2.5">
              {meta.features.map((f) => (
                <div key={f} className="flex items-center gap-2.5">
                  <div className="h-5 w-5 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: 'rgba(255,255,255,0.2)' }}>
                    <CheckCircle2 className="h-3 w-3 text-white" />
                  </div>
                  <span className="text-sm text-white/80 font-medium">{f}</span>
                </div>
              ))}
            </div>
          </div>

          {isAdmin ? (
            <div>
              <p className="text-[11px] font-bold text-white/40 uppercase tracking-widest mb-3">
                Métriques en temps réel
              </p>
              <div className="grid grid-cols-2 gap-3">
                {statCards.map((s) => {
                  const SIcon = s.icon
                  return (
                    <div key={s.label}
                      className="rounded-2xl p-4 transition-all hover:scale-[1.02]"
                      style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', backdropFilter: 'blur(10px)' }}>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="p-2 rounded-lg" style={{ background: s.bg }}>
                          <SIcon className="h-4 w-4" style={{ color: s.color }} />
                        </div>
                      </div>
                      <div className="text-2xl font-black text-white tabular-nums">{s.value}</div>
                      <div className="text-xs text-white/45 mt-0.5 font-medium">{s.label}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl p-5"
              style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.18)', backdropFilter: 'blur(10px)' }}>
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl shrink-0" style={{ background: 'rgba(255,255,255,0.2)' }}>
                  <Quote className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-white/40 uppercase tracking-widest mb-2">
                    Citation de la semaine #{getWeekNumber()}
                  </p>
                  <p className="text-sm text-white/85 leading-relaxed italic">
                    &ldquo;{quote}&rdquo;
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

    function MobileHero({ role, stats }: { role: string, stats: any }) {
      const isAdmin = ADMIN_ROLES.includes(role)
      const meta = ROLE_META[role] || ROLE_META.default
      const Icon = meta.icon
      const [from, to] = meta.gradient

      if (isAdmin) {
        const statCards = [
          { label: 'Projets actifs', value: stats.projets, icon: Briefcase, color: '#6366f1' },
          { label: 'Clients', value: stats.clients, icon: Users, color: '#10b981' },
          { label: 'CA ce mois', value: stats.ca, icon: TrendingUp, color: '#a855f7' },
          { label: 'Tâches livrées', value: stats.taches, icon: CheckCircle2, color: '#f59e0b' },
        ]
        return (
          <div className="lg:hidden px-5 py-5 border-b border-slate-200"
            style={{ background: 'linear-gradient(160deg, #0f172a, #1e293b)', color: 'white' }}>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-extrabold text-white leading-tight">
                Pilotez votre agence <span className="text-indigo-400">comme une machine.</span>
              </h2>
            </div>
            <p className="text-white/40 text-xs leading-relaxed mb-4">ERP complet · Projets, clients, finances, équipes</p>
            <div className="grid grid-cols-2 gap-2">
              {statCards.map((s) => {
                const SIcon = s.icon
                return (
                  <div key={s.label} className="rounded-xl p-3 flex items-center gap-2.5"
                    style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <SIcon className="h-5 w-5 shrink-0" style={{ color: s.color }} />
                    <div>
                      <div className="text-sm font-black text-white tabular-nums">{s.value}</div>
                      <div className="text-[10px] text-white/40">{s.label}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      }

      return (
        <div className="lg:hidden px-5 py-5 border-b border-slate-100 transition-all duration-500"
          style={{ background: `linear-gradient(160deg, ${from}, ${to})`, color: 'white' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.2)' }}>
                <Icon className="h-4 w-4 text-white" />
              </div>
              <span className="text-xs font-semibold text-white/80">Espace {meta.label}</span>
            </div>
          </div>
          <h2 className="text-xl font-black text-white leading-tight mb-3">
            {meta.headline.replace('\n', ' ')}
          </h2>
          <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' }}>
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">Citation de la semaine</p>
            <p className="text-xs text-white/80 italic leading-relaxed">&ldquo;{getWeeklyQuote(role)}&rdquo;</p>
          </div>
        </div>
      )
    }

  // ─── REDIRECTION SI DÉJÀ CONNECTÉ ───────────────────────────────────────────
  useEffect(() => {
    if (!authLoading && user && profile) {
      router.replace(getRedirectPath(profile.role))
    }
  }, [user, profile, authLoading, router])

    useEffect(() => {
      async function fetchStats() {
        try {
          // Utilise des requêtes légères pour les compteurs
            const now = new Date()
            const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
            const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()

            const [projetsRes, clientsRes, caRes, tasksRes] = await Promise.all([
              supabase.from('projects').select('id', { count: 'exact', head: true }).eq('status', 'en_cours'),
              supabase.from('clients').select('id', { count: 'exact', head: true }),
              supabase.from('payments').select('amount').gte('payment_date', firstDayOfMonth).lte('payment_date', lastDayOfMonth),
              supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('status', 'completed')
            ])

            const projets = projetsRes.count || 0
            const clients = clientsRes.count || 0
            const ca = (caRes.data || []).reduce((acc, p) => acc + (p.amount || 0), 0)
            const tasks = tasksRes.count || 0

          setStats({
            projets: String(projets),
            clients: String(clients),
            ca: formatCA(ca) + ' GNF',
            taches: tasks > 100 ? '99%' : tasks + '%'
          })
        } catch (err) {
          console.error("Login stats fetch error:", err)
        }
      }
      fetchStats()
    }, [])

    function getRedirectPath(r: string): string {
      if (r === 'client') return '/dashboard'
      if (r === 'ceo' || r === 'dirigeant' || ADMIN_ROLES.includes(r)) return '/dashboard'
      return '/dashboard'
    }

    async function handleSubmit(e: React.FormEvent) {
      e.preventDefault()
      setLoading(true)
      try {
        if (mode === 'login') {
          const { error } = await signIn(email, password)
          if (error) {
            toast.error('Connexion échouée', { description: error })
          } else {
            const { data: { user: authUser } } = await supabase.auth.getUser()
            let realRole = 'workspace'
            if (authUser) {
              const { data: profileData } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', authUser.id)
                .single()
              if (profileData?.role) realRole = profileData.role
            }
                toast.success('Connexion réussie')
                router.replace(getRedirectPath(realRole))
            }
          } else {
            if (!fullName.trim()) { toast.error('Veuillez entrer votre nom complet'); return }
            const { error } = await signUp(email, password, fullName, role)
            if (error) {
              toast.error('Inscription échouée', { description: error })
            } else {
                toast.success('Compte créé !')
                router.replace(getRedirectPath(role))
            }
          }

      } finally {
        setLoading(false)
      }
    }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row" style={{ background: '#f8fafc', colorScheme: 'light', color: '#0f172a' }}>
      <PWAInstallBanner />

      {/* Panneau gauche */}
      <LeftPanel role={panelRole} stats={stats} />

      {/* Panneau droit — formulaire */}
      <div className="flex-1 flex flex-col min-h-screen lg:min-h-0 lg:overflow-y-auto" style={{ background: '#f8fafc', color: '#0f172a' }}>

        {/* Mobile logo bar */}
        <div className="lg:hidden flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-200 bg-white">
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center shadow-sm p-1.5">
              <img 
                src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/project-uploads/25eb9797-83ec-431b-8731-1404e452f4c6/popy-tech-pro-2026-resized-1772085194508.webp?width=200&height=200&resize=contain" 
                alt="Logo"
                className="h-full w-full object-contain"
              />
            </div>
            <span className="text-lg font-bold tracking-tight text-slate-900">POPY TECH</span>
          </div>
          <span className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full px-3 py-1 font-semibold">
            ERP Agence
          </span>
        </div>

        {/* Mobile hero */}
        <MobileHero role={panelRole} stats={stats} />

        {/* Formulaire centré */}
        <div className="flex-1 flex items-center justify-center p-5 sm:p-8 lg:p-12">
          <div className="w-full max-w-md">

            {/* Card formulaire */}
            <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-200/80 p-8 sm:p-10">

              {/* En-tête */}
              <div className="mb-7">
                <div className="hidden lg:flex items-center gap-2.5 mb-6">
                  <div className="h-10 w-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center shadow-sm p-1.5">
                    <img 
                      src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/project-uploads/25eb9797-83ec-431b-8731-1404e452f4c6/popy-tech-pro-2026-resized-1772085194508.webp?width=200&height=200&resize=contain" 
                      alt="Logo"
                      className="h-full w-full object-contain"
                    />
                  </div>
                  <span className="text-xl font-bold tracking-tight text-slate-900">POPY TECH</span>
                </div>
                <h2 className="text-2xl font-black text-slate-900">
                  {mode === 'login' ? 'Bon retour 👋' : "Rejoignez l'équipe"}
                </h2>
                <p className="text-slate-500 text-sm mt-1">
                  {mode === 'login'
                    ? 'Connectez-vous à votre espace de travail'
                    : 'Créez votre compte POPY TECH'}
                </p>
              </div>

              {/* Toggle */}
              <div className="flex bg-slate-100 rounded-xl p-1 mb-7 gap-1">
                {(['login', 'register'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    className={cn(
                      'flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all duration-200',
                      mode === m
                        ? 'bg-white shadow-sm text-slate-900'
                        : 'text-slate-500 hover:text-slate-700'
                    )}
                  >
                    {m === 'login' ? 'Connexion' : 'Inscription'}
                  </button>
                ))}
              </div>

                {/* Formulaire */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  {mode === 'register' && (
                    <div className="space-y-1.5">
                      <Label htmlFor="fullName" className="text-sm font-semibold text-slate-700">Nom complet</Label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input id="fullName" type="text" placeholder="Jean Dupont"
                          className="pl-10 h-11 border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-400 focus:ring-indigo-100 text-slate-900 placeholder:text-slate-400 rounded-xl"
                          value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                      </div>
                    </div>
                  )}

                  {mode === 'register' && (
                    <div className="space-y-1.5">
                      <Label className="text-sm font-semibold text-slate-700">Rôle dans l&apos;agence</Label>
                      <Select value={role} onValueChange={setRole}>
                        <SelectTrigger className="h-11 border-slate-200 bg-slate-50 rounded-xl text-slate-900">
                          <SelectValue placeholder="Choisir un rôle" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ceo">CEO / Dirigeant 👑</SelectItem>
                          <SelectItem value="creatrice_contenu">Créatrice de contenu ✨</SelectItem>
                          <SelectItem value="commercial_digital">Commercial Digital 🤝</SelectItem>
                          <SelectItem value="super_admin">Super Administrateur 🛡️</SelectItem>
                          <SelectItem value="designer">Designer</SelectItem>
                          <SelectItem value="designer_senior">Designer Senior 🎨</SelectItem>
                          <SelectItem value="developpeur">Développeur</SelectItem>
                          <SelectItem value="marketeur">Marketeur</SelectItem>
                          <SelectItem value="cm">Community Manager</SelectItem>
                          <SelectItem value="vidéaste">Vidéaste</SelectItem>
                          <SelectItem value="monteur_video">Monteur Vidéo</SelectItem>
                          <SelectItem value="formateur">Formateur</SelectItem>
                          <SelectItem value="responsable_formations">Responsable Formations 🎓</SelectItem>
                          <SelectItem value="assistante_direction">Assistante de Direction 📋</SelectItem>
                          <SelectItem value="stagiaire">Stagiaire</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-sm font-semibold text-slate-700">Adresse email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input id="email" type="email" placeholder="vous@agence.com"
                        className="pl-10 pr-10 h-11 border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-400 focus:ring-indigo-100 text-slate-900 placeholder:text-slate-400 rounded-xl"
                        value={email} onChange={(e) => setEmail(e.target.value)} required />
                      {mode === 'login' && email && (
                        <CheckCircle2 className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password" className="text-sm font-semibold text-slate-700">Mot de passe</Label>
                      <button type="button" onClick={() => toast.info('Réinitialisation', { description: 'Contactez votre administrateur pour réinitialiser votre mot de passe.' })}
                        className="text-[11px] font-medium text-indigo-600 hover:text-indigo-700">
                        Mot de passe oublié ?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input id="password" type={showPassword ? 'text' : 'password'} placeholder="••••••••"
                        className="pl-10 pr-10 h-11 border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-400 focus:ring-indigo-100 text-slate-900 placeholder:text-slate-400 rounded-xl"
                        value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
                      <button type="button"
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors"
                        onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-12 font-bold text-sm mt-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all"
                  >
                    {loading ? (
                      <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        {mode === 'login' ? 'Se connecter' : 'Créer mon compte'}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </form>

              {mode === 'login' && (
                <div className="mt-5 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                  <p className="text-sm font-semibold text-slate-800 mb-1 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" />
                    Première visite ?
                  </p>
                  <p className="text-slate-500 text-xs leading-relaxed">
                    Cliquez sur <strong className="text-slate-700">Inscription</strong> pour créer votre compte et accéder à votre espace de travail.
                  </p>
                </div>
              )}
            </div>

            <p className="text-center text-xs text-slate-400 mt-6">
              © 2026 POPY TECH — Tous droits réservés
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
