'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@/lib/auth-context'
import {
  Scale, Plus, Search, FileText, Eye, Printer, Trash2, Edit2, X,
  CheckCircle, Clock, AlertTriangle, ShieldCheck, Users, Building,
  Calendar, ChevronDown, BookOpen, Sparkles, LayoutTemplate, Settings2,
  Upload, ImageIcon, Download, Loader2, PenLine, RotateCcw, Check,
  Lock, CloudUpload,
} from 'lucide-react'
import { jsPDF } from 'jspdf'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// ─── Types ────────────────────────────────────────────────────────────────────

type ContractType =
  | 'NDA' | 'prestation' | 'abonnement' | 'cession_droits' | 'developpement'
  | 'travail_cdd' | 'travail_cdi' | 'freelance' | 'stage'
  | 'partenariat' | 'apporteur_affaires'
  | 'formation_apprenant' | 'formation_formateur'
  | 'CGV' | 'CGU' | 'politique_confidentialite' | 'mentions_legales' | 'autre'

type ContractStatus = 'actif' | 'expire' | 'en_attente' | 'resilie'

interface Contract {
  id: string
  title: string
  type: ContractType
  status: ContractStatus
  parties: string
  content: string | null
  start_date: string | null
  end_date: string | null
  client_id: string | null
  team_member_id: string | null
  signed_at: string | null
  signed_by: string | null
  signature_data: string | null
  signed_pdf_url: string | null
  created_at: string
  client?: { id: string; company_name: string } | null
  team_member?: { id: string; full_name: string } | null
}

interface Client { id: string; company_name: string }
interface TeamMember { id: string; full_name: string }

interface PrintSettings {
  logoBase64: string
  logoFileName: string
  agencyName: string
  agencyDescription: string
  agencyAddress: string
  agencyContact: string
  watermarkEnabled: boolean
  watermarkOpacity: number
  watermarkText: string
  watermarkUseImage: boolean
}

const DEFAULT_PRINT_SETTINGS: PrintSettings = {
  logoBase64: '',
  logoFileName: '',
  agencyName: 'Popytech',
  agencyDescription: 'Agence digitale — Design, Développement & Formation',
  agencyAddress: 'Conakry, Guinée',
  agencyContact: 'contact@popytech.com',
  watermarkEnabled: true,
  watermarkOpacity: 15,
  watermarkText: 'POPYTECH',
  watermarkUseImage: false,
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const TYPE_GROUPS: { label: string; types: { key: ContractType; label: string }[] }[] = [
  {
    label: '🧾 Avec les clients',
    types: [
      { key: 'prestation', label: 'Contrat de prestation de services' },
      { key: 'abonnement', label: "Contrat d'abonnement mensuel" },
      { key: 'cession_droits', label: "Cession de droits d'auteur" },
      { key: 'developpement', label: 'Contrat de développement sur mesure' },
    ],
  },
  {
    label: '👥 Équipe interne',
    types: [
      { key: 'travail_cdi', label: 'Contrat CDI' },
      { key: 'travail_cdd', label: 'Contrat CDD' },
      { key: 'freelance', label: 'Contrat freelance / consultant' },
      { key: 'stage', label: 'Convention de stage' },
    ],
  },
  {
    label: '🤝 Partenariats & Business',
    types: [
      { key: 'partenariat', label: 'Contrat de partenariat' },
      { key: 'apporteur_affaires', label: "Contrat apporteur d'affaires" },
    ],
  },
  {
    label: '🎓 Formation (Academy)',
    types: [
      { key: 'formation_apprenant', label: 'Contrat de formation (apprenant)' },
      { key: 'formation_formateur', label: 'Contrat de formateur' },
    ],
  },
  {
    label: '📋 Documents juridiques',
    types: [
      { key: 'NDA', label: 'NDA / Accord de confidentialité' },
      { key: 'CGV', label: 'CGV – Conditions Générales de Vente' },
      { key: 'CGU', label: "CGU – Conditions Générales d'Utilisation" },
      { key: 'politique_confidentialite', label: 'Politique de confidentialité (RGPD)' },
      { key: 'mentions_legales', label: 'Mentions légales' },
      { key: 'autre', label: 'Autre document' },
    ],
  },
]

const TYPE_LABELS: Record<ContractType, string> = Object.fromEntries(
  TYPE_GROUPS.flatMap(g => g.types.map(t => [t.key, t.label]))
) as Record<ContractType, string>

const TYPE_COLORS: Record<ContractType, string> = {
  NDA: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  prestation: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  abonnement: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
  cession_droits: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  developpement: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  travail_cdd: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  travail_cdi: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  freelance: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  stage: 'bg-lime-100 text-lime-700 dark:bg-lime-900/30 dark:text-lime-400',
  partenariat: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  apporteur_affaires: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  formation_apprenant: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  formation_formateur: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  CGV: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
  CGU: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  politique_confidentialite: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  mentions_legales: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  autre: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
}

const STATUS_CONFIG: Record<ContractStatus, { label: string; color: string; icon: React.ElementType }> = {
  actif: { label: 'Actif', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', icon: CheckCircle },
  expire: { label: 'Expiré', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: AlertTriangle },
  en_attente: { label: 'En attente', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: Clock },
  resilie: { label: 'Résilié', color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400', icon: X },
}

// ─── Templates ─────────────────────────────────────────────────────────────────

const TEMPLATES: Partial<Record<ContractType, { title: string; parties: string; content: string }>> = {
  prestation: {
    title: 'Contrat de prestation de services – [Client]',
    parties: 'Popytech SARL, représentée par [Nom du dirigeant], ci-après "le Prestataire"\net\n[Nom du client / entreprise], ci-après "le Client"',
    content: `ARTICLE 1 – OBJET
Le Prestataire s'engage à réaliser pour le Client les prestations suivantes :
[Description détaillée de la mission]

ARTICLE 2 – DÉLAIS ET PLANNING
Date de début : [Date]
Date de livraison estimée : [Date]
Un planning détaillé sera fourni en annexe.

ARTICLE 3 – MODALITÉS DE PAIEMENT
Acompte de 40% à la signature du présent contrat : [Montant] GNF
Solde de 60% à la livraison finale : [Montant] GNF
Paiement par [Mode de paiement].

ARTICLE 4 – NOMBRE DE RETOUCHES
Le contrat inclut [X] aller-retours de révisions.
Toute demande supplémentaire fera l'objet d'un devis complémentaire.

ARTICLE 5 – PÉNALITÉS DE RETARD CLIENT
En cas de retard dans la fourniture des éléments nécessaires par le Client,
les délais de livraison seront automatiquement décalés d'autant.

ARTICLE 6 – RÉSILIATION
En cas de résiliation à l'initiative du Client, l'acompte versé restera acquis au Prestataire.

ARTICLE 7 – PROPRIÉTÉ INTELLECTUELLE
Les droits sur les livrables sont cédés au Client après règlement intégral de la facture.

Fait à Conakry, le [Date]`,
  },
  abonnement: {
    title: "Contrat d'abonnement mensuel – [Client]",
    parties: 'Popytech SARL, ci-après "le Prestataire"\net\n[Nom du client], ci-après "le Client"',
    content: `ARTICLE 1 – OBJET
Le présent contrat définit les conditions d'une prestation de services récurrente :
[Ex : Gestion des réseaux sociaux / Maintenance site web / SEO mensuel / Ads management]

ARTICLE 2 – DURÉE ET ENGAGEMENT
Durée d'engagement : [3 / 6 / 12] mois
Date de début : [Date]
Reconduction tacite sauf résiliation avec préavis de 30 jours.

ARTICLE 3 – LIVRABLES MENSUELS
[Liste des livrables : nombre de posts, rapports, optimisations, etc.]

ARTICLE 4 – TARIF MENSUEL
Montant mensuel : [Montant] GNF HT
Facturation le 1er de chaque mois.

ARTICLE 5 – RÉVISION TARIFAIRE
Toute révision tarifaire sera notifiée 30 jours à l'avance.

ARTICLE 6 – RÉSILIATION
Préavis de 30 jours par écrit. Les mois entamés sont dus.

Fait à Conakry, le [Date]`,
  },
  NDA: {
    title: 'Accord de confidentialité (NDA) – [Partie]',
    parties: 'Popytech SARL, ci-après "la Partie Divulgatrice"\net\n[Nom / Entreprise], ci-après "la Partie Réceptrice"',
    content: `ARTICLE 1 – OBJET
Dans le cadre de [description du projet / collaboration], les parties peuvent être amenées à échanger des informations confidentielles.

ARTICLE 2 – DÉFINITION DES INFORMATIONS CONFIDENTIELLES
Toute information commerciale, technique, financière, stratégique communiquée par la Partie Divulgatrice, sous quelque forme que ce soit.

ARTICLE 3 – OBLIGATIONS DE CONFIDENTIALITÉ
La Partie Réceptrice s'engage à :
- Ne pas divulguer ces informations à des tiers
- Utiliser ces informations uniquement dans le cadre de la collaboration
- Protéger ces informations avec le même niveau de soin que ses propres informations confidentielles

ARTICLE 4 – DURÉE
Le présent accord est valable pour une durée de [2 ans] à compter de la date de signature.

ARTICLE 5 – SANCTIONS
Toute violation entraînera des dommages et intérêts dont le montant minimum sera de [Montant].

Fait à Conakry, le [Date]`,
  },
  cession_droits: {
    title: "Contrat de cession de droits d'auteur – [Client]",
    parties: 'Popytech SARL, ci-après "le Cédant"\net\n[Nom du client], ci-après "le Cessionnaire"',
    content: `ARTICLE 1 – ŒUVRE CONCERNÉE
Le Cédant cède les droits sur les œuvres suivantes :
[Description précise : logo, identité visuelle, vidéo, UI/UX, etc.]

ARTICLE 2 – DROITS CÉDÉS
- Droit de reproduction
- Droit de représentation
- Droit d'adaptation

ARTICLE 3 – DURÉE
La présente cession est consentie pour une durée de [durée] à compter de la date de signature.

ARTICLE 4 – TERRITOIRE
La cession est consentie pour le territoire : [Guinée / Afrique / Monde entier].

ARTICLE 5 – SUPPORTS D'EXPLOITATION
Print, digital, réseaux sociaux, affichage, broadcast TV/radio, internet.

ARTICLE 6 – CONTREPARTIE FINANCIÈRE
La cession est consentie moyennant le paiement de [Montant] GNF, inclus dans la facture de prestation.

ARTICLE 7 – GARANTIE
Le Cédant garantit être l'auteur ou détenir tous les droits nécessaires sur les œuvres cédées.

Fait à Conakry, le [Date]`,
  },
  freelance: {
    title: 'Contrat de prestation freelance – [Nom du freelance]',
    parties: "Popytech SARL, ci-après \"le Donneur d'Ordre\"\net\n[Nom du freelance], ci-après \"le Prestataire Indépendant\"",
    content: `ARTICLE 1 – MISSION
Nature de la mission : [Ex : Design graphique / Développement / Copywriting]
Durée estimée : [X jours / semaines]

ARTICLE 2 – RÉMUNÉRATION
Tarif : [Montant] GNF par [jour / projet]
Paiement sous [30] jours après livraison et validation.

ARTICLE 3 – CONFIDENTIALITÉ
Le Prestataire s'engage à ne divulguer aucune information relative aux clients, projets ou méthodes de Popytech.

ARTICLE 4 – CESSION DE DROITS
Tous les livrables produits dans le cadre de cette mission sont cédés à Popytech SARL dès règlement complet.

ARTICLE 5 – NON-DÉMARCHAGE
Le Prestataire s'interdit formellement de démarcher ou traiter directement avec les clients de Popytech pour une durée de [2 ans] après la fin de la mission.

ARTICLE 6 – INDÉPENDANCE
Le Prestataire agit en tant qu'indépendant. Aucun lien de subordination ne pourra être invoqué.

Fait à Conakry, le [Date]`,
  },
  stage: {
    title: 'Convention de stage – [Nom du stagiaire]',
    parties: "Popytech SARL, ci-après \"l'Entreprise d'Accueil\"\net\n[Nom de l'établissement], ci-après \"l'Établissement\"\net\n[Nom du stagiaire], ci-après \"le Stagiaire\"",
    content: `ARTICLE 1 – OBJECTIFS PÉDAGOGIQUES
[Description des objectifs et compétences visées]

ARTICLE 2 – DURÉE ET HORAIRES
Date de début : [Date]
Date de fin : [Date]
Horaires : [Ex : 8h-17h du lundi au vendredi]

ARTICLE 3 – LIVRABLES ATTENDUS
[Description des travaux ou projets à réaliser]

ARTICLE 4 – GRATIFICATION
[Montant] GNF par mois (si applicable).

ARTICLE 5 – ENCADREMENT
Tuteur en entreprise : [Nom et poste]

ARTICLE 6 – POSSIBILITÉ D'EMBAUCHE
À l'issue du stage, en cas de résultats probants, une proposition d'embauche pourra être formulée.

Fait à Conakry, le [Date]`,
  },
  formation_apprenant: {
    title: "Contrat de formation – [Nom de l'apprenant]",
    parties: "Popytech Academy, ci-après \"l'Organisme de Formation\"\net\n[Nom de l'apprenant / entreprise], ci-après \"le Bénéficiaire\"",
    content: `ARTICLE 1 – PROGRAMME
Intitulé de la formation : [Titre]
Contenu : [Description du programme]

ARTICLE 2 – DURÉE
Durée totale : [X heures]
Dates : du [Date] au [Date]
Modalités : [Présentiel / Distanciel / Hybride]

ARTICLE 3 – CERTIFICATION
À l'issue de la formation, un certificat de réussite sera délivré sous condition de [80%] d'assiduité.

ARTICLE 4 – MODALITÉS DE PAIEMENT
Montant total : [Montant] GNF
Acompte de [50%] à l'inscription.
Solde avant le début de la formation.

ARTICLE 5 – POLITIQUE DE REMBOURSEMENT
Annulation plus de 7 jours avant le début : remboursement intégral.
Annulation moins de 7 jours : aucun remboursement.

Fait à Conakry, le [Date]`,
  },
  CGV: {
    title: 'Conditions Générales de Vente – Popytech',
    parties: 'Popytech SARL – applicable à tout client',
    content: `ARTICLE 1 – OBJET
Les présentes CGV définissent les droits et obligations des parties dans le cadre de la vente de prestations de services par Popytech SARL.

ARTICLE 2 – DEVIS ET COMMANDE
Tout devis accepté vaut bon de commande et entraîne l'acceptation des présentes CGV.

ARTICLE 3 – TARIFS
Les prix sont indiqués en GNF HT. Popytech se réserve le droit de modifier ses tarifs à tout moment.

ARTICLE 4 – PAIEMENT
Un acompte de 40% est exigible à la commande. Le solde est dû à la livraison.
Paiement par virement ou mobile money.

ARTICLE 5 – RETARD DE PAIEMENT
En cas de retard, des pénalités de [3%] par mois s'appliquent de plein droit.

ARTICLE 6 – PROPRIÉTÉ INTELLECTUELLE
Les livrables restent propriété de Popytech jusqu'au règlement intégral.

ARTICLE 7 – RÉSILIATION
En cas de manquement grave, l'une ou l'autre partie peut résilier le contrat sous 15 jours.

ARTICLE 8 – LITIGES
En cas de litige, les parties s'engagent à privilégier une solution amiable avant tout recours judiciaire.
Tribunal compétent : Tribunal de Commerce de Conakry.

Version en vigueur : [Date]`,
  },
  apporteur_affaires: {
    title: "Contrat d'apporteur d'affaires – [Nom]",
    parties: "Popytech SARL, ci-après \"la Société\"\net\n[Nom / Entreprise], ci-après \"l'Apporteur d'Affaires\"",
    content: `ARTICLE 1 – OBJET
L'Apporteur s'engage à présenter à Popytech des prospects susceptibles de devenir clients.

ARTICLE 2 – COMMISSION
L'Apporteur perçoit une commission de [X%] HT sur le montant HT de chaque contrat signé avec un prospect apporté.

ARTICLE 3 – MODALITÉS DE PAIEMENT
La commission est versée dans les [30] jours suivant l'encaissement effectif par Popytech.

ARTICLE 4 – DURÉE DE VALIDITÉ DU LEAD
Un lead est réputé valide pendant [6 mois] à compter de la mise en relation.

ARTICLE 5 – ZONE GÉOGRAPHIQUE
[Guinée-Conakry / Afrique de l'Ouest / Sans restriction]

ARTICLE 6 – EXCLUSIVITÉ
[Avec / Sans] clause d'exclusivité sur la zone définie.

ARTICLE 7 – DURÉE DU CONTRAT
Le présent contrat est conclu pour une durée de [1 an], renouvelable par tacite reconduction.

Fait à Conakry, le [Date]`,
  },
  partenariat: {
    title: 'Contrat de partenariat – [Nom du partenaire]',
    parties: 'Popytech SARL, ci-après "Popytech"\net\n[Nom / Entreprise partenaire], ci-après "le Partenaire"',
    content: `ARTICLE 1 – OBJET
Le présent contrat formalise la collaboration entre Popytech et le Partenaire dans le cadre de :
[Ex : co-réalisation de projets / référencement mutuel / sous-traitance / partage de clientèle]

ARTICLE 2 – RÉPARTITION DES REVENUS
Sur les projets apportés conjointement :
- Part Popytech : [X%]
- Part Partenaire : [X%]
Les modalités de partage seront définies par un bon de commande signé pour chaque projet.

ARTICLE 3 – RESPONSABILITÉS
Popytech est responsable de : [Ex : développement, design, coordination]
Le Partenaire est responsable de : [Ex : formation, communication, prospection locale]

ARTICLE 4 – EXCLUSIVITÉ
[Avec exclusivité sur le secteur / zone / Sans exclusivité]
Durée de la clause d'exclusivité (si applicable) : [X mois]

ARTICLE 5 – COMMUNICATION & BRANDING
Les communications communes devront être approuvées par les deux parties.
Chaque partie conserve la propriété de sa marque et de ses éléments visuels.

ARTICLE 6 – DURÉE
Le présent contrat est conclu pour une durée de [1 an], renouvelable par tacite reconduction.
Résiliation possible avec préavis de [30 jours] par lettre recommandée.

ARTICLE 7 – CONFIDENTIALITÉ
Les parties s'engagent à ne pas divulguer les informations stratégiques, commerciales ou techniques échangées.

Fait à Conakry, le [Date]`,
  },
      developpement: {
        title: 'Contrat de développement sur mesure – [Client]',
      parties: 'Popytech SARL, ci-après "le Prestataire"\net\n[Nom du client / entreprise], ci-après "le Client"',
      content: `ARTICLE 1 – OBJET
Le Prestataire s'engage à concevoir et développer pour le Client la solution suivante :
[Ex : Application mobile / Plateforme SaaS / ERP / Site e-commerce]

ARTICLE 2 – CAHIER DES CHARGES
Un cahier des charges détaillé est annexé au présent contrat et en fait partie intégrante.
Toute modification du cahier des charges fera l'objet d'un avenant signé.

ARTICLE 3 – PHASES DE DÉVELOPPEMENT
Phase 1 – Analyse & maquettes : [Délai]
Phase 2 – Développement MVP : [Délai]
Phase 3 – Tests & recette : [Délai]
Phase 4 – Mise en production : [Délai]

ARTICLE 4 – PROPRIÉTÉ DU CODE
À l'issue du règlement intégral, le Client devient propriétaire du code source livré.
Les frameworks et bibliothèques tiers restent soumis à leurs licences respectives.

ARTICLE 5 – ACCÈS SERVEUR ET LIVRABLES
Le Prestataire livrera : code source complet, documentation technique, accès aux dépôts Git.
Hébergement : [inclus / non inclus – à la charge du Client].

ARTICLE 6 – MAINTENANCE
[X mois] de maintenance corrective inclus après livraison.
Au-delà : contrat de maintenance séparé au tarif de [Montant] GNF/mois.

ARTICLE 7 – MODALITÉS DE PAIEMENT
30% à la signature
40% à la livraison du MVP
30% à la mise en production

Fait à Conakry, le [Date]`,
    },
    travail_cdi: {
      title: 'Contrat de travail CDI – [Nom du salarié]',
      parties: 'Popytech SARL, représentée par [Nom du dirigeant], ci-après "l\'Employeur"\net\n[Nom complet du salarié], né(e) le [Date], ci-après "le Salarié"',
      content: `ARTICLE 1 – ENGAGEMENT
Le Salarié est engagé à compter du [Date] en qualité de : [Intitulé du poste]
Service : [Ex : Design / Développement / Commercial / Marketing]

ARTICLE 2 – DURÉE
Le présent contrat est conclu pour une durée indéterminée.
Période d'essai : [2 / 3] mois, renouvelable une fois.

ARTICLE 3 – FICHE DE POSTE ET OBJECTIFS
Missions principales : [Description détaillée]
Objectifs trimestriels : [Décrire les KPI attendus]

ARTICLE 4 – RÉMUNÉRATION
Salaire brut mensuel : [Montant] GNF
Mode de paiement : virement bancaire / mobile money, le [X] de chaque mois.

ARTICLE 5 – HORAIRES DE TRAVAIL
[X heures] par semaine — du lundi au vendredi, de [heure] à [heure].

ARTICLE 6 – CONFIDENTIALITÉ
Le Salarié s'engage à ne divulguer aucune information confidentielle relative à l'activité, aux clients ou aux projets de Popytech, pendant et après la durée du contrat.

ARTICLE 7 – CLAUSE DE NON-CONCURRENCE
Pendant [12 mois] après la fin du contrat, le Salarié s'engage à ne pas exercer d'activité concurrente directe sur [Zone géographique / secteur].
Contrepartie financière : [Montant] GNF/mois pendant la durée de la clause.

ARTICLE 8 – RUPTURE DU CONTRAT
Préavis en cas de démission : [1 mois].
Préavis en cas de licenciement : [2 mois] sauf faute grave.

Fait à Conakry, le [Date]`,
    },
    travail_cdd: {
      title: 'Contrat de travail CDD – [Nom du salarié]',
      parties: 'Popytech SARL, représentée par [Nom du dirigeant], ci-après "l\'Employeur"\net\n[Nom complet du salarié], né(e) le [Date], ci-après "le Salarié"',
      content: `ARTICLE 1 – MOTIF DU RECOURS AU CDD
Le présent CDD est conclu pour le motif suivant : [Ex : accroissement temporaire d'activité / remplacement d'un salarié absent / mission spécifique].

ARTICLE 2 – DURÉE
Date de début : [Date]
Date de fin : [Date]
Durée totale : [X mois]
Renouvellement possible : [Oui / Non]

ARTICLE 3 – POSTE ET MISSIONS
Poste occupé : [Intitulé]
Missions : [Description]

ARTICLE 4 – RÉMUNÉRATION
Salaire brut mensuel : [Montant] GNF

ARTICLE 5 – PÉRIODE D'ESSAI
[X jours] de période d'essai.

ARTICLE 6 – INDEMNITÉ DE FIN DE CONTRAT
À l'issue du CDD, une indemnité de précarité de [X%] du salaire brut total sera versée, sauf embauche en CDI.

ARTICLE 7 – CONFIDENTIALITÉ
Le Salarié s'engage à respecter la confidentialité des informations de Popytech pendant et après le contrat.

Fait à Conakry, le [Date]`,
    },
    formation_formateur: {
      title: 'Contrat de formateur – [Nom du formateur]',
      parties: 'Popytech Academy, ci-après "l\'Organisme"\net\n[Nom complet du formateur], ci-après "le Formateur"',
      content: `ARTICLE 1 – OBJET
Le Formateur s'engage à animer la formation suivante pour le compte de Popytech Academy :
Intitulé : [Titre de la formation]
Niveau : [Débutant / Intermédiaire / Avancé]

ARTICLE 2 – DATES ET MODALITÉS
Dates d'intervention : [Dates]
Volume horaire : [X heures]
Format : [Présentiel / Distanciel / Hybride]
Lieu : [Adresse ou plateforme en ligne]

ARTICLE 3 – RÉMUNÉRATION
Tarif : [Montant] GNF par [heure / jour / session]
Paiement sous [15] jours après chaque session animée.

ARTICLE 4 – SUPPORTS PÉDAGOGIQUES
Le Formateur s'engage à fournir les supports pédagogiques [X jours] avant la formation.
Les supports créés dans le cadre de cette mission sont cédés à Popytech Academy.

ARTICLE 5 – DROITS D'EXPLOITATION DES COURS
Popytech Academy est autorisée à réutiliser, adapter et diffuser les contenus produits dans le cadre de ce contrat.

ARTICLE 6 – CONFIDENTIALITÉ
Le Formateur s'engage à ne pas divulguer les informations relatives aux apprenants ni les méthodes pédagogiques propriétaires de Popytech Academy.

ARTICLE 7 – INDÉPENDANCE
Le Formateur intervient en tant que prestataire indépendant. Aucun lien de subordination ne pourra être invoqué.

Fait à Conakry, le [Date]`,
    },
    CGU: {
      title: "Conditions Générales d'Utilisation – [Plateforme / SaaS]",
      parties: 'Popytech SARL – applicable à tout utilisateur de la plateforme',
      content: `ARTICLE 1 – OBJET
Les présentes CGU régissent l'utilisation de la plateforme [Nom de la plateforme] éditée par Popytech SARL.

ARTICLE 2 – ACCÈS AU SERVICE
L'accès au service est subordonné à la création d'un compte utilisateur.
L'utilisateur s'engage à fournir des informations exactes et à les maintenir à jour.

ARTICLE 3 – UTILISATION ACCEPTABLE
L'utilisateur s'engage à ne pas :
- Utiliser la plateforme à des fins illicites
- Tenter d'accéder aux données d'autres utilisateurs
- Introduire des virus ou tout code malveillant
- Reproduire ou revendre le service sans autorisation

ARTICLE 4 – PROPRIÉTÉ INTELLECTUELLE
Tous les contenus, interfaces et algorithmes de la plateforme sont la propriété exclusive de Popytech SARL.

ARTICLE 5 – DONNÉES PERSONNELLES
Le traitement des données personnelles est régi par notre Politique de Confidentialité (RGPD).

ARTICLE 6 – RESPONSABILITÉ
Popytech SARL ne saurait être tenu responsable des dommages indirects liés à l'utilisation du service.
Disponibilité garantie : [99%] par mois (hors maintenance planifiée).

ARTICLE 7 – RÉSILIATION
Popytech se réserve le droit de suspendre ou résilier l'accès en cas de violation des présentes CGU.

ARTICLE 8 – MODIFICATION DES CGU
Popytech se réserve le droit de modifier les présentes CGU. Les utilisateurs seront notifiés 30 jours à l'avance.

Version en vigueur : [Date]`,
    },
    politique_confidentialite: {
      title: 'Politique de confidentialité (RGPD) – Popytech',
      parties: 'Popytech SARL – Responsable du traitement des données',
      content: `1. RESPONSABLE DU TRAITEMENT
Popytech SARL
Adresse : [Adresse complète]
Contact DPO : [email@popytech.com]

2. DONNÉES COLLECTÉES
Nous collectons les données suivantes :
- Données d'identification : nom, prénom, email, téléphone
- Données de connexion : adresse IP, logs d'accès
- Données de navigation : cookies, pages visitées
- Données contractuelles : contrats, factures, échanges

3. FINALITÉS DU TRAITEMENT
- Exécution des prestations contractuelles
- Gestion de la relation client
- Envoi de communications commerciales (avec consentement)
- Amélioration de nos services
- Conformité légale et comptable

4. BASE LÉGALE
- Exécution du contrat
- Intérêt légitime
- Consentement (pour les communications marketing)
- Obligation légale

5. DURÉE DE CONSERVATION
- Données clients actifs : durée de la relation + 3 ans
- Données comptables : 10 ans (obligation légale)
- Données de prospection : 3 ans après le dernier contact

6. DROITS DES PERSONNES
Vous disposez des droits suivants : accès, rectification, effacement, portabilité, opposition.
Pour exercer vos droits : [email@popytech.com]

7. TRANSFERTS HORS UE
[Aucun transfert / ou préciser les pays et garanties]

8. COOKIES
Voir notre politique de cookies disponible sur [URL].

Mise à jour : [Date]`,
    },
    mentions_legales: {
      title: 'Mentions légales – Popytech',
      parties: 'Popytech SARL – Site web et services en ligne',
      content: `ÉDITEUR DU SITE
Raison sociale : Popytech SARL
Forme juridique : [SARL / SA / SAS / Auto-entrepreneur]
Capital social : [Montant] GNF
Adresse du siège : [Adresse complète], Conakry, Guinée
RCCM : [Numéro d'immatriculation]
NIF : [Numéro d'identification fiscale]
Téléphone : [+224 XXX XXX XXX]
Email : contact@popytech.com

DIRECTEUR DE LA PUBLICATION
[Nom du dirigeant], [Titre]

HÉBERGEMENT
Hébergeur : [Nom de l'hébergeur]
Adresse : [Adresse]
Site web : [URL]

PROPRIÉTÉ INTELLECTUELLE
L'ensemble des contenus présents sur ce site (textes, images, logos, vidéos) est protégé par le droit d'auteur.
Toute reproduction, même partielle, est soumise à autorisation préalable.

RESPONSABILITÉ
Popytech s'efforce d'assurer l'exactitude des informations publiées mais ne peut garantir leur complétude.
Popytech décline toute responsabilité pour les dommages résultant de l'utilisation du site.

DONNÉES PERSONNELLES
Conformément à la réglementation applicable, vous disposez d'un droit d'accès et de rectification.
Contact : contact@popytech.com

Dernière mise à jour : [Date]`,
    },
  }

function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { timeZone: 'Africa/Conakry' })
}

function isExpiringSoon(end_date: string | null) {
  if (!end_date) return false
  const diff = new Date(end_date).getTime() - Date.now()
  return diff > 0 && diff < 30 * 24 * 60 * 60 * 1000
}

function buildPrintHTML(c: Contract, s: PrintSettings): string {
  const opacity = s.watermarkEnabled ? (s.watermarkOpacity / 100).toFixed(2) : '0'
  const watermarkEl = s.watermarkEnabled
    ? s.watermarkUseImage && s.logoBase64
      ? `<div class="watermark"><img src="${s.logoBase64}" style="max-width:300px;max-height:300px;opacity:${opacity};"/></div>`
      : `<div class="watermark" style="font-size:80px;font-weight:900;color:#1a1a2e;opacity:${opacity};letter-spacing:0.05em;text-transform:uppercase;">${s.watermarkText || s.agencyName}</div>`
    : ''

  const headerLogo = s.logoBase64
    ? `<img src="${s.logoBase64}" style="height:64px;object-fit:contain;" alt="Logo"/>`
    : `<div style="width:64px;height:64px;background:#e0e7ff;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:900;color:#4f46e5;">${(s.agencyName || 'P').charAt(0)}</div>`

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8"/>
  <title>${c.title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; max-width: 820px; margin: 0 auto; padding: 40px 48px; color: #111; line-height: 1.7; position: relative; }
    .watermark {
      position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-30deg);
      pointer-events: none; z-index: 0; user-select: none;
      display: flex; align-items: center; justify-content: center;
    }
    .page-content { position: relative; z-index: 1; }
    .header { display: flex; align-items: flex-start; gap: 20px; padding-bottom: 20px; border-bottom: 3px solid #1a1a2e; margin-bottom: 28px; }
    .header-text { flex: 1; }
    .agency-name { font-size: 22px; font-weight: 800; color: #1a1a2e; }
    .agency-desc { font-size: 13px; color: #555; margin-top: 2px; }
    .agency-meta { font-size: 12px; color: #888; margin-top: 4px; }
    .doc-title { font-size: 20px; font-weight: 700; color: #1a1a2e; margin-bottom: 6px; }
    .meta { display: flex; gap: 10px; flex-wrap: wrap; margin: 12px 0 24px; font-size: 12px; }
    .meta span { background: #f4f4f8; padding: 4px 10px; border-radius: 6px; color: #555; }
    .section-title { font-weight: 700; font-size: 12px; text-transform: uppercase; letter-spacing: .06em; color: #444; margin-top: 24px; margin-bottom: 8px; border-left: 3px solid #4f46e5; padding-left: 8px; }
    .content { white-space: pre-wrap; background: #fafafa; border: 1px solid #e5e5e5; border-radius: 6px; padding: 16px; font-size: 13.5px; line-height: 1.8; }
    .signatures { display: flex; justify-content: space-between; margin-top: 60px; gap: 32px; }
    .sig-box { flex: 1; }
    .sig-label { font-size: 12px; color: #666; margin-bottom: 48px; }
    .sig-line { border-top: 1px solid #999; padding-top: 6px; font-size: 11px; color: #999; }
    @media print { body { padding: 20px; } .watermark { position: fixed; } }
  </style>
</head>
<body>
  ${watermarkEl}
  <div class="page-content">
    <div class="header">
      ${headerLogo}
      <div class="header-text">
        <div class="agency-name">${s.agencyName || 'Popytech'}</div>
        ${s.agencyDescription ? `<div class="agency-desc">${s.agencyDescription}</div>` : ''}
        <div class="agency-meta">${[s.agencyAddress, s.agencyContact].filter(Boolean).join(' · ')}</div>
      </div>
      <div style="text-align:right;font-size:11px;color:#999;min-width:100px;">
        <div>Document généré le</div>
        <div style="font-weight:600;color:#555;">${new Date().toLocaleDateString('fr-FR', { timeZone: 'Africa/Conakry' })}</div>
      </div>
    </div>
    <div class="doc-title">${c.title}</div>
    <div class="meta">
      <span>Type : ${TYPE_LABELS[c.type]}</span>
      <span>Statut : ${STATUS_CONFIG[c.status].label}</span>
      ${c.start_date ? `<span>Début : ${fmtDate(c.start_date)}</span>` : ''}
      ${c.end_date ? `<span>Fin : ${fmtDate(c.end_date)}</span>` : ''}
      ${c.client?.company_name ? `<span>Client : ${c.client.company_name}</span>` : ''}
      ${c.team_member?.full_name ? `<span>Membre : ${c.team_member.full_name}</span>` : ''}
      ${c.signed_at ? `<span>Signé le : ${fmtDate(c.signed_at)}</span>` : ''}
    </div>
    <div class="section-title">Parties concernées</div>
    <div class="content">${c.parties}</div>
    ${c.content ? `<div class="section-title">Contenu du contrat</div><div class="content">${c.content}</div>` : ''}
    <div class="signatures">
      <div class="sig-box">
        <div class="sig-label">Signature — ${s.agencyName || 'Popytech'}</div>
        <div class="sig-line">Nom &amp; cachet</div>
      </div>
      <div class="sig-box">
        <div class="sig-label">Signature — Partie 2</div>
        <div class="sig-line">Nom &amp; cachet</div>
      </div>
    </div>
  </div>
</body>
</html>`
}

function printContract(c: Contract, s: PrintSettings) {
  const win = window.open('', '_blank')
  if (!win) return
  win.document.write(buildPrintHTML(c, s))
  win.document.close()
  win.focus()
  setTimeout(() => { win.print(); win.close() }, 500)
}

async function downloadContractPDF(c: Contract, s: PrintSettings): Promise<void> {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = pdf.internal.pageSize.getWidth()
  const pageH = pdf.internal.pageSize.getHeight()
  const margin = 18
  const contentW = pageW - margin * 2
  let y = margin

  // ── filigrane ──────────────────────────────────────────────────────────────
  if (s.watermarkEnabled) {
    const opacity = s.watermarkOpacity / 100
    if (s.watermarkUseImage && s.logoBase64) {
      try {
        const ext = s.logoBase64.startsWith('data:image/png') ? 'PNG' : 'JPEG'
        pdf.saveGraphicsState()
        // @ts-expect-error jsPDF internal GState
        pdf.setGState(new pdf.GState({ opacity }))
        pdf.addImage(s.logoBase64, ext, pageW / 2 - 40, pageH / 2 - 40, 80, 80)
        pdf.restoreGraphicsState()
      } catch { /* skip watermark on error */ }
    } else {
      const text = (s.watermarkText || s.agencyName || 'POPYTECH').toUpperCase()
      pdf.saveGraphicsState()
      // @ts-expect-error jsPDF internal GState
      pdf.setGState(new pdf.GState({ opacity }))
      pdf.setFontSize(52)
      pdf.setTextColor(30, 30, 50)
      pdf.text(text, pageW / 2, pageH / 2, { align: 'center', angle: 30 })
      pdf.restoreGraphicsState()
    }
  }

  // ── logo + en-tête ─────────────────────────────────────────────────────────
  if (s.logoBase64) {
    try {
      const ext = s.logoBase64.startsWith('data:image/png') ? 'PNG' : 'JPEG'
      pdf.addImage(s.logoBase64, ext, margin, y, 18, 18)
    } catch { /* skip logo on error */ }
  }
  const textX = s.logoBase64 ? margin + 22 : margin
  pdf.setFontSize(15)
  pdf.setFont('helvetica', 'bold')
  pdf.setTextColor(20, 20, 40)
  pdf.text(s.agencyName || 'Popytech', textX, y + 6)
  if (s.agencyDescription) {
    pdf.setFontSize(9)
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(100, 100, 100)
    pdf.text(s.agencyDescription, textX, y + 11)
  }
  const meta1 = [s.agencyAddress, s.agencyContact].filter(Boolean).join(' · ')
  if (meta1) {
    pdf.setFontSize(8)
    pdf.setTextColor(140, 140, 140)
    pdf.text(meta1, textX, y + 16)
  }
  // date à droite
  pdf.setFontSize(8)
  pdf.setTextColor(160, 160, 160)
  pdf.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, pageW - margin, y + 4, { align: 'right' })

  y += 24
  pdf.setDrawColor(20, 20, 40)
  pdf.setLineWidth(0.5)
  pdf.line(margin, y, pageW - margin, y)
  y += 8

  // ── titre du document ──────────────────────────────────────────────────────
  pdf.setFontSize(14)
  pdf.setFont('helvetica', 'bold')
  pdf.setTextColor(20, 20, 40)
  const titleLines = pdf.splitTextToSize(c.title, contentW) as string[]
  pdf.text(titleLines, margin, y)
  y += titleLines.length * 6 + 4

  // ── métadonnées ────────────────────────────────────────────────────────────
  pdf.setFontSize(8)
  pdf.setFont('helvetica', 'normal')
  pdf.setTextColor(80, 80, 80)
  const metas = [
    `Type : ${TYPE_LABELS[c.type]}`,
    `Statut : ${STATUS_CONFIG[c.status].label}`,
    c.start_date ? `Début : ${fmtDate(c.start_date)}` : null,
    c.end_date ? `Fin : ${fmtDate(c.end_date)}` : null,
    c.client?.company_name ? `Client : ${c.client.company_name}` : null,
    c.team_member?.full_name ? `Membre : ${c.team_member.full_name}` : null,
    c.signed_at ? `Signé le : ${fmtDate(c.signed_at)}` : null,
  ].filter(Boolean) as string[]
  let mx = margin
  for (const m of metas) {
    const tw = pdf.getTextWidth(m) + 6
    if (mx + tw > pageW - margin) { mx = margin; y += 6 }
    pdf.setFillColor(245, 245, 250)
    pdf.roundedRect(mx, y - 4, tw, 5.5, 1, 1, 'F')
    pdf.text(m, mx + 3, y)
    mx += tw + 3
  }
  y += 10

  // helper : section title
  function sectionTitle(label: string) {
    pdf.setFontSize(8)
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(60, 60, 60)
    pdf.setFillColor(79, 70, 229)
    pdf.rect(margin, y, 2, 5, 'F')
    pdf.text(label.toUpperCase(), margin + 4, y + 4)
    y += 9
  }

  // helper : ajouter texte avec pagination auto
  function addTextBlock(text: string) {
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(30, 30, 30)
    const lines = pdf.splitTextToSize(text, contentW - 4) as string[]
    const lineH = 5.5
    for (const line of lines) {
      if (y + lineH > pageH - margin - 20) {
        pdf.addPage()
        y = margin
        if (s.watermarkEnabled && !s.watermarkUseImage) {
          const wText = (s.watermarkText || s.agencyName || 'POPYTECH').toUpperCase()
          pdf.saveGraphicsState()
          // @ts-expect-error jsPDF internal GState
          pdf.setGState(new pdf.GState({ opacity: s.watermarkOpacity / 100 }))
          pdf.setFontSize(52)
          pdf.setTextColor(30, 30, 50)
          pdf.text(wText, pageW / 2, pageH / 2, { align: 'center', angle: 30 })
          pdf.restoreGraphicsState()
        }
      }
      pdf.text(line, margin + 2, y)
      y += lineH
    }
  }

  // ── parties ────────────────────────────────────────────────────────────────
  sectionTitle('Parties concernées')
  pdf.setFillColor(250, 250, 252)
  const partiesLines = pdf.splitTextToSize(c.parties, contentW - 8) as string[]
  const partiesH = partiesLines.length * 5.5 + 6
  pdf.roundedRect(margin, y, contentW, partiesH, 2, 2, 'F')
  pdf.setDrawColor(220, 220, 230)
  pdf.roundedRect(margin, y, contentW, partiesH, 2, 2, 'S')
  y += 4
  addTextBlock(c.parties)
  y += 4

  // ── contenu ────────────────────────────────────────────────────────────────
  if (c.content) {
    sectionTitle('Contenu du contrat')
    addTextBlock(c.content)
    y += 6
  }

  // ── signatures ─────────────────────────────────────────────────────────────
  if (y + 30 > pageH - margin) { pdf.addPage(); y = margin }
  y += 8
  pdf.setDrawColor(180, 180, 180)
  pdf.setLineWidth(0.3)
  const sigW = (contentW - 16) / 2
  pdf.line(margin, y + 20, margin + sigW, y + 20)
  pdf.line(margin + sigW + 16, y + 20, pageW - margin, y + 20)
  pdf.setFontSize(8)
  pdf.setTextColor(120, 120, 120)
  pdf.text(`Signature — ${s.agencyName || 'Popytech'}`, margin, y + 24)
  pdf.text('Signature — Partie 2', margin + sigW + 16, y + 24)

  // ── numérotation ───────────────────────────────────────────────────────────
  const totalPages = (pdf.internal as unknown as { pages: unknown[] }).pages.length - 1
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i)
    pdf.setFontSize(8)
    pdf.setTextColor(180, 180, 180)
    pdf.text(`Page ${i} / ${totalPages}`, pageW / 2, pageH - 8, { align: 'center' })
  }

  const fileName = `${c.title.replace(/[^a-z0-9À-ÿ\s-]/gi, '').trim().replace(/\s+/g, '_')}.pdf`
  pdf.save(fileName)
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function LegalPage() {
  const { profile: authProfile } = useAuth()
  const isRespFormations = authProfile?.role === 'responsable_formations'
  const [contracts, setContracts] = useState<Contract[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [team, setTeam] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterType, setFilterType] = useState(isRespFormations ? 'formation_apprenant' : '')
  const [selected, setSelected] = useState<Contract | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [showPrintSettings, setShowPrintSettings] = useState(false)
  const [showSignModal, setShowSignModal] = useState(false)
  const [signingContract, setSigningContract] = useState<Contract | null>(null)
  const [signMode, setSignMode] = useState<'draw' | 'manual'>('draw')
  const [signerName, setSignerName] = useState('')
  const [signerRole, setSignerRole] = useState('')
  const [signingLoading, setSigningLoading] = useState(false)
  const [signSuccess, setSignSuccess] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isDrawingRef = useRef(false)
  const [editing, setEditing] = useState<Contract | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [printSettings, setPrintSettings] = useState<PrintSettings>(DEFAULT_PRINT_SETTINGS)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    title: '', type: 'prestation' as ContractType, status: 'en_attente' as ContractStatus,
    parties: '', content: '', start_date: '', end_date: '',
    client_id: '', team_member_id: '', signed_at: '',
  })

  useEffect(() => {
    try {
      const saved = localStorage.getItem('popytech_print_settings')
      if (saved) setPrintSettings(JSON.parse(saved))
    } catch { /* ignore */ }
  }, [])

  function savePrintSettings(s: PrintSettings) {
    setPrintSettings(s)
    try { localStorage.setItem('popytech_print_settings', JSON.stringify(s)) } catch { /* ignore */ }
  }

  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string
      savePrintSettings({ ...printSettings, logoBase64: base64, logoFileName: file.name })
    }
    reader.readAsDataURL(file)
  }

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (filterStatus) params.set('status', filterStatus)
      if (filterType) params.set('type', filterType)
      const [cRes, clRes, tmRes] = await Promise.all([
        fetch(`/api/legal/contracts?${params}`),
        fetch('/api/clients'),
        fetch('/api/team'),
      ])
      const cData = cRes.ok ? await cRes.json() : {}
      const clData = clRes.ok ? await clRes.json() : {}
      const tmData = tmRes.ok ? await tmRes.json() : {}
      const allContracts: Contract[] = cData.data || []
      setContracts(isRespFormations
        ? allContracts.filter((c: Contract) => c.type === 'formation_apprenant' || c.type === 'formation_formateur')
        : allContracts
      )
      setClients(clData.data || clData.clients || [])
      setTeam(tmData.data || tmData.members || [])
    } catch { /* silently fail */ }
    setLoading(false)
  }, [search, filterStatus, filterType])

  useEffect(() => {
    if (searchRef.current) clearTimeout(searchRef.current)
    searchRef.current = setTimeout(loadAll, 300)
  }, [loadAll])

  function openNew() {
    setEditing(null)
    setForm({ title: '', type: isRespFormations ? 'formation_apprenant' : 'prestation', status: 'en_attente', parties: '', content: '', start_date: '', end_date: '', client_id: '', team_member_id: '', signed_at: '' })
    setShowForm(true)
  }

  function applyTemplate(type: ContractType) {
    const tpl = TEMPLATES[type]
    setEditing(null)
    setForm({
      title: tpl?.title || '',
      type,
      status: 'en_attente',
      parties: tpl?.parties || '',
      content: tpl?.content || '',
      start_date: '', end_date: '', client_id: '', team_member_id: '', signed_at: '',
    })
    setShowTemplates(false)
    setShowForm(true)
  }

  function openEdit(c: Contract) {
    setEditing(c)
    setForm({
      title: c.title, type: c.type, status: c.status,
      parties: c.parties, content: c.content || '',
      start_date: c.start_date || '', end_date: c.end_date || '',
      client_id: c.client_id || '', team_member_id: c.team_member_id || '',
      signed_at: c.signed_at ? c.signed_at.slice(0, 10) : '',
    })
    setShowForm(true)
  }

  async function saveContract() {
    if (!form.title.trim() || !form.parties.trim()) return
    const payload = {
      ...form,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      client_id: form.client_id || null,
      team_member_id: form.team_member_id || null,
      signed_at: form.signed_at ? new Date(form.signed_at + 'T00:00:00Z').toISOString() : null,
    }
    if (editing) {
      await fetch(`/api/legal/contracts/${editing.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    } else {
      await fetch('/api/legal/contracts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    }
    setShowForm(false)
    setSelected(null)
    loadAll()
  }

  async function deleteContract(id: string) {
    await fetch(`/api/legal/contracts/${id}`, { method: 'DELETE' })
    setDeleting(null)
    if (selected?.id === id) setSelected(null)
    loadAll()
  }

  // ── Canvas signature helpers ───────────────────────────────────────────────
  function clearCanvas() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }

  function getPos(e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) {
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    if ('touches' in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      }
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    }
  }

  function onCanvasStart(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    e.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    isDrawingRef.current = true
    const pos = getPos(e, canvas)
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
  }

  function onCanvasMove(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    e.preventDefault()
    if (!isDrawingRef.current) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.strokeStyle = '#1a1a2e'
    const pos = getPos(e, canvas)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
  }

  function onCanvasEnd() { isDrawingRef.current = false }

  function isCanvasEmpty() {
    const canvas = canvasRef.current
    if (!canvas) return true
    const ctx = canvas.getContext('2d')
    if (!ctx) return true
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data
    return !data.some(v => v !== 0)
  }

  // ── Ouvrir le modal de signature ───────────────────────────────────────────
  function openSignModal(c: Contract) {
    setSigningContract(c)
    setSignMode('draw')
    setSignerName(c.client?.company_name || '')
    setSignerRole('')
    setSignSuccess(false)
    setShowSignModal(true)
    setTimeout(clearCanvas, 100)
  }

  // ── Signer, générer PDF et uploader dans Supabase Storage ─────────────────
  async function confirmSignature() {
    if (!signingContract) return
    if (signMode === 'draw' && isCanvasEmpty()) return
    if (!signerName.trim()) return
    setSigningLoading(true)

    // 1. Récupérer image de signature (canvas ou placeholder)
    let signatureDataUrl = ''
    if (signMode === 'draw') {
      signatureDataUrl = canvasRef.current?.toDataURL('image/png') || ''
    }

    // 2. Générer le PDF signé
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const pageW = pdf.internal.pageSize.getWidth()
    const pageH = pdf.internal.pageSize.getHeight()
    const margin = 18
    const contentW = pageW - margin * 2
    let y = margin

    // Filigrane
    if (printSettings.watermarkEnabled) {
      const op = printSettings.watermarkOpacity / 100
      if (printSettings.watermarkUseImage && printSettings.logoBase64) {
        try {
          const ext = printSettings.logoBase64.startsWith('data:image/png') ? 'PNG' : 'JPEG'
          pdf.saveGraphicsState()
          // @ts-expect-error jsPDF GState
          pdf.setGState(new pdf.GState({ opacity: op }))
          pdf.addImage(printSettings.logoBase64, ext, pageW / 2 - 40, pageH / 2 - 40, 80, 80)
          pdf.restoreGraphicsState()
        } catch { /* skip */ }
      } else {
        const wt = (printSettings.watermarkText || printSettings.agencyName || 'POPYTECH').toUpperCase()
        pdf.saveGraphicsState()
        // @ts-expect-error jsPDF GState
        pdf.setGState(new pdf.GState({ opacity: op }))
        pdf.setFontSize(52); pdf.setTextColor(30, 30, 50)
        pdf.text(wt, pageW / 2, pageH / 2, { align: 'center', angle: 30 })
        pdf.restoreGraphicsState()
      }
    }

    // En-tête
    if (printSettings.logoBase64) {
      try { const ext = printSettings.logoBase64.startsWith('data:image/png') ? 'PNG' : 'JPEG'; pdf.addImage(printSettings.logoBase64, ext, margin, y, 18, 18) } catch { /* skip */ }
    }
    const textX = printSettings.logoBase64 ? margin + 22 : margin
    pdf.setFontSize(15); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(20, 20, 40)
    pdf.text(printSettings.agencyName || 'Popytech', textX, y + 6)
    if (printSettings.agencyDescription) { pdf.setFontSize(9); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(100, 100, 100); pdf.text(printSettings.agencyDescription, textX, y + 11) }
    const meta1 = [printSettings.agencyAddress, printSettings.agencyContact].filter(Boolean).join(' · ')
    if (meta1) { pdf.setFontSize(8); pdf.setTextColor(140, 140, 140); pdf.text(meta1, textX, y + 16) }
    pdf.setFontSize(8); pdf.setTextColor(160, 160, 160)
    pdf.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, pageW - margin, y + 4, { align: 'right' })
    y += 24
    pdf.setDrawColor(20, 20, 40); pdf.setLineWidth(0.5); pdf.line(margin, y, pageW - margin, y); y += 8

    // Titre
    pdf.setFontSize(14); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(20, 20, 40)
    const titleLines = pdf.splitTextToSize(signingContract.title, contentW) as string[]
    pdf.text(titleLines, margin, y); y += titleLines.length * 6 + 4

    // Métadonnées + badge SIGNÉ
    pdf.setFontSize(8); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(80, 80, 80)
    const metas = [
      `Type : ${TYPE_LABELS[signingContract.type]}`,
      `Statut : SIGNÉ ✓`,
      `Signé par : ${signerName}${signerRole ? ` (${signerRole})` : ''}`,
      `Date de signature : ${new Date().toLocaleDateString('fr-FR')}`,
      signingContract.client?.company_name ? `Client : ${signingContract.client.company_name}` : null,
    ].filter(Boolean) as string[]
    let mx = margin
    for (const m of metas) {
      const tw = pdf.getTextWidth(m) + 6
      if (mx + tw > pageW - margin) { mx = margin; y += 6 }
      pdf.setFillColor(m.includes('SIGNÉ') ? 209 : 245, m.includes('SIGNÉ') ? 250 : 245, m.includes('SIGNÉ') ? 229 : 250)
      pdf.roundedRect(mx, y - 4, tw, 5.5, 1, 1, 'F')
      if (m.includes('SIGNÉ')) { pdf.setTextColor(16, 120, 60) } else { pdf.setTextColor(80, 80, 80) }
      pdf.text(m, mx + 3, y); mx += tw + 3
    }
    y += 10

    // Parties
    pdf.setFontSize(8); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(60, 60, 60)
    pdf.setFillColor(79, 70, 229); pdf.rect(margin, y, 2, 5, 'F')
    pdf.text('PARTIES CONCERNÉES', margin + 4, y + 4); y += 9
    pdf.setFontSize(10); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(30, 30, 30)
    const partiesLines = pdf.splitTextToSize(signingContract.parties, contentW - 4) as string[]
    pdf.setFillColor(250, 250, 252)
    pdf.roundedRect(margin, y, contentW, partiesLines.length * 5.5 + 6, 2, 2, 'F')
    pdf.setDrawColor(220, 220, 230); pdf.roundedRect(margin, y, contentW, partiesLines.length * 5.5 + 6, 2, 2, 'S')
    y += 4
    for (const line of partiesLines) { pdf.text(line, margin + 2, y); y += 5.5 }
    y += 6

    // Contenu
    if (signingContract.content) {
      pdf.setFontSize(8); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(60, 60, 60)
      pdf.setFillColor(79, 70, 229); pdf.rect(margin, y, 2, 5, 'F')
      pdf.text('CONTENU DU CONTRAT', margin + 4, y + 4); y += 9
      pdf.setFontSize(10); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(30, 30, 30)
      const cLines = pdf.splitTextToSize(signingContract.content, contentW - 4) as string[]
      for (const line of cLines) {
        if (y + 5.5 > pageH - margin - 40) { pdf.addPage(); y = margin }
        pdf.text(line, margin + 2, y); y += 5.5
      }
      y += 6
    }

    // Zone de signatures
    if (y + 50 > pageH - margin) { pdf.addPage(); y = margin }
    y += 8
    const sigW = (contentW - 16) / 2

    // Signature Popytech (gauche)
    pdf.setDrawColor(180, 180, 180); pdf.setLineWidth(0.3)
    pdf.line(margin, y + 25, margin + sigW, y + 25)
    pdf.setFontSize(8); pdf.setTextColor(120, 120, 120)
    pdf.text(`${printSettings.agencyName || 'Popytech'}`, margin, y + 29)
    if (printSettings.logoBase64) {
      try {
        const ext = printSettings.logoBase64.startsWith('data:image/png') ? 'PNG' : 'JPEG'
        pdf.addImage(printSettings.logoBase64, ext, margin, y, sigW / 3, sigW / 3 * 0.6)
      } catch { /* skip */ }
    }

    // Signature client (droite) avec dessin si mode draw
    const rx = margin + sigW + 16
    if (signMode === 'draw' && signatureDataUrl) {
      try {
        pdf.addImage(signatureDataUrl, 'PNG', rx, y, sigW, 22)
      } catch { /* skip */ }
    }
    pdf.line(rx, y + 25, pageW - margin, y + 25)
    pdf.setFontSize(8); pdf.setTextColor(120, 120, 120)
    pdf.text(`${signerName}${signerRole ? ` — ${signerRole}` : ''}`, rx, y + 29)
    pdf.setFontSize(7); pdf.setTextColor(150, 150, 150)
    pdf.text(`Signé le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`, rx, y + 33)

    // Badge SIGNÉ en bas
    y += 40
    pdf.setFillColor(209, 250, 229); pdf.roundedRect(margin, y, contentW, 8, 2, 2, 'F')
    pdf.setFontSize(9); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(16, 120, 60)
    pdf.text('✓ DOCUMENT SIGNÉ ÉLECTRONIQUEMENT — Valeur juridique contractuelle', pageW / 2, y + 5.5, { align: 'center' })

    // Numérotation
    const totalPages = (pdf.internal as unknown as { pages: unknown[] }).pages.length - 1
    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i); pdf.setFontSize(8); pdf.setTextColor(180, 180, 180)
      pdf.text(`Page ${i} / ${totalPages}`, pageW / 2, pageH - 8, { align: 'center' })
    }

    // 3. Convertir en blob et uploader vers Supabase Storage
    const pdfBlob = pdf.output('blob')
    const fileName = `${signingContract.id}_signed_${Date.now()}.pdf`
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('contracts')
      .upload(fileName, pdfBlob, { contentType: 'application/pdf', upsert: true })

    let signedPdfUrl = ''
    if (!uploadError && uploadData) {
      const { data: urlData } = supabase.storage.from('contracts').getPublicUrl(fileName)
      signedPdfUrl = urlData.publicUrl
    }

    // 4. Mettre à jour le contrat en base
    await fetch(`/api/legal/contracts/${signingContract.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'actif',
        signed_at: new Date().toISOString(),
        signed_by: signerName,
        signature_data: signatureDataUrl,
        signed_pdf_url: signedPdfUrl,
        title: signingContract.title,
        type: signingContract.type,
        parties: signingContract.parties,
        content: signingContract.content,
        start_date: signingContract.start_date,
        end_date: signingContract.end_date,
        client_id: signingContract.client_id,
        team_member_id: signingContract.team_member_id,
      }),
    })

    // 5. Télécharger aussi en local
    const safeName = signingContract.title.replace(/[^a-z0-9À-ÿ\s-]/gi, '').trim().replace(/\s+/g, '_')
    pdf.save(`${safeName}_SIGNE.pdf`)

    setSigningLoading(false)
    setSignSuccess(true)
    loadAll()
    setTimeout(() => {
      setShowSignModal(false)
      setSignSuccess(false)
      setSigningContract(null)
    }, 2500)
  }

  const total = contracts.length
  const actifs = contracts.filter(c => c.status === 'actif').length
  const expires = contracts.filter(c => c.status === 'expire').length
  const soon = contracts.filter(c => isExpiringSoon(c.end_date)).length

  return (
    <div className="p-6 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-900/30">
            <Scale className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Legal & Compliance</h1>
            <p className="text-sm text-muted-foreground">Coffre-fort numérique — gestion juridique Popytech</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowPrintSettings(true)}
            className="flex items-center gap-2 px-3 py-2 border border-border text-muted-foreground rounded-lg text-sm font-medium hover:bg-muted transition-colors">
            <Settings2 className="h-4 w-4" /> Paramètres
          </button>
          <button onClick={() => setShowTemplates(true)}
            className="flex items-center gap-2 px-4 py-2 border border-indigo-300 text-indigo-700 dark:text-indigo-400 dark:border-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors">
            <LayoutTemplate className="h-4 w-4" /> Templates
          </button>
          <button onClick={openNew}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors">
            <Plus className="h-4 w-4" /> Nouveau contrat
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total contrats', value: total, icon: FileText, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
          { label: 'Actifs', value: actifs, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
          { label: 'Expirés', value: expires, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20' },
          { label: 'Expirent bientôt', value: soon, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' },
        ].map(k => (
          <div key={k.label} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
            <div className={`p-2 rounded-lg ${k.bg}`}>
              <k.icon className={`h-5 w-5 ${k.color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{k.value}</p>
              <p className="text-xs text-muted-foreground">{k.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filtres */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input className="w-full pl-9 pr-4 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Rechercher un contrat..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="relative">
          <select className="appearance-none pl-3 pr-8 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">Tous les statuts</option>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
        </div>
        <div className="relative">
          <select className="appearance-none pl-3 pr-8 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="">Tous les types</option>
            {TYPE_GROUPS.map(g => (
              <optgroup key={g.label} label={g.label}>
                {g.types.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
              </optgroup>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
        </div>
      </div>

      {/* Vault */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-indigo-500" />
          <span className="font-semibold text-sm text-foreground">Registre contractuel — Vault</span>
          <span className="ml-auto text-xs text-muted-foreground">{contracts.length} document(s)</span>
        </div>
        {loading ? (
          <div className="p-12 text-center text-muted-foreground text-sm">Chargement...</div>
        ) : contracts.length === 0 ? (
          <div className="p-12 text-center">
            <Scale className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm mb-3">Aucun contrat trouvé</p>
            <div className="flex items-center justify-center gap-3">
              <button onClick={() => setShowTemplates(true)}
                className="text-sm text-indigo-600 border border-indigo-300 px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors">
                Utiliser un template
              </button>
              <button onClick={openNew} className="text-sm text-indigo-600 hover:underline">Créer manuellement</button>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {contracts.map(c => {
              const StatusIcon = STATUS_CONFIG[c.status].icon
              const expiring = isExpiringSoon(c.end_date)
              return (
                <div key={c.id}
                  className={`px-4 py-4 flex items-start gap-4 hover:bg-muted/30 transition-colors cursor-pointer ${selected?.id === c.id ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : ''}`}
                  onClick={() => setSelected(selected?.id === c.id ? null : c)}>
                  <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 shrink-0">
                    <FileText className="h-5 w-5 text-indigo-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-foreground text-sm">{c.title}</span>
                      {expiring && <span className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-0.5 rounded-full font-medium">⚠ Expire bientôt</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[c.type]}`}>{TYPE_LABELS[c.type]}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${STATUS_CONFIG[c.status].color}`}>
                        <StatusIcon className="h-3 w-3" />{STATUS_CONFIG[c.status].label}
                      </span>
                      {c.client?.company_name && <span className="text-xs text-muted-foreground flex items-center gap-1"><Building className="h-3 w-3" />{c.client.company_name}</span>}
                      {c.team_member?.full_name && <span className="text-xs text-muted-foreground flex items-center gap-1"><Users className="h-3 w-3" />{c.team_member.full_name}</span>}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                      {c.start_date && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />Début : {fmtDate(c.start_date)}</span>}
                      {c.end_date && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />Fin : {fmtDate(c.end_date)}</span>}
                    </div>
                  </div>
                    <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                      <button onClick={() => setSelected(c)} className="p-1.5 rounded hover:bg-muted transition-colors" title="Aperçu"><Eye className="h-4 w-4 text-muted-foreground" /></button>
                      <button onClick={() => printContract(c, printSettings)} className="p-1.5 rounded hover:bg-muted transition-colors" title="Imprimer / PDF"><Printer className="h-4 w-4 text-muted-foreground" /></button>
                      <button
                        onClick={async () => { setDownloadingId(c.id); await downloadContractPDF(c, printSettings); setDownloadingId(null) }}
                        disabled={downloadingId === c.id}
                        className="p-1.5 rounded hover:bg-muted transition-colors" title="Télécharger PDF">
                        {downloadingId === c.id ? <Loader2 className="h-4 w-4 text-green-500 animate-spin" /> : <Download className="h-4 w-4 text-green-600" />}
                      </button>
                      {!c.signed_at ? (
                        <button onClick={() => openSignModal(c)} className="p-1.5 rounded hover:bg-emerald-50 transition-colors" title="Signer le contrat">
                          <PenLine className="h-4 w-4 text-emerald-600" />
                        </button>
                      ) : (
                        <span title={`Signé le ${fmtDate(c.signed_at)}`} className="p-1.5">
                          <Lock className="h-4 w-4 text-emerald-500" />
                        </span>
                      )}
                      {c.signed_pdf_url && (
                        <a href={c.signed_pdf_url} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded hover:bg-blue-50 transition-colors" title="Télécharger PDF signé">
                          <CloudUpload className="h-4 w-4 text-blue-500" />
                        </a>
                      )}
                      <button onClick={() => openEdit(c)} className="p-1.5 rounded hover:bg-muted transition-colors" title="Modifier"><Edit2 className="h-4 w-4 text-muted-foreground" /></button>
                      <button onClick={() => setDeleting(c.id)} className="p-1.5 rounded hover:bg-red-50 transition-colors" title="Supprimer"><Trash2 className="h-4 w-4 text-red-500" /></button>
                    </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Modal Paramètres d'impression ── */}
      {showPrintSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowPrintSettings(false)}>
          <div className="bg-background rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-background z-10">
              <div className="flex items-center gap-2">
                <Settings2 className="h-5 w-5 text-indigo-500" />
                <h2 className="font-bold text-foreground">Paramètres d&apos;impression</h2>
              </div>
              <button onClick={() => setShowPrintSettings(false)} className="p-1.5 rounded hover:bg-muted transition-colors"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-6 space-y-6">

              {/* Logo */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Logo de l&apos;agence</p>
                <div className="flex items-center gap-4">
                  {printSettings.logoBase64 ? (
                    <div className="relative">
                      <img src={printSettings.logoBase64} alt="Logo" className="h-16 w-16 object-contain rounded-lg border border-border bg-muted/30" />
                      <button
                        onClick={() => savePrintSettings({ ...printSettings, logoBase64: '', logoFileName: '' })}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600 transition-colors">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="h-16 w-16 rounded-lg border-2 border-dashed border-border flex items-center justify-center bg-muted/20">
                      <ImageIcon className="h-6 w-6 text-muted-foreground/40" />
                    </div>
                  )}
                  <div className="flex-1">
                    <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                    <button onClick={() => logoInputRef.current?.click()}
                      className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-muted transition-colors w-full justify-center">
                      <Upload className="h-4 w-4" />
                      {printSettings.logoBase64 ? 'Changer le logo' : 'Importer le logo'}
                    </button>
                    {printSettings.logoFileName && <p className="text-xs text-muted-foreground mt-1 truncate">{printSettings.logoFileName}</p>}
                    <p className="text-xs text-muted-foreground mt-1">PNG, JPG, SVG recommandé</p>
                  </div>
                </div>
              </div>

              {/* Infos agence */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Informations de l&apos;agence</p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Nom de l&apos;agence</label>
                    <input className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={printSettings.agencyName}
                      onChange={e => savePrintSettings({ ...printSettings, agencyName: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Description / Accroche</label>
                    <input className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Ex : Agence digitale – Design, Développement & Formation"
                      value={printSettings.agencyDescription}
                      onChange={e => savePrintSettings({ ...printSettings, agencyDescription: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">Adresse</label>
                      <input className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="Ex : Conakry, Guinée"
                        value={printSettings.agencyAddress}
                        onChange={e => savePrintSettings({ ...printSettings, agencyAddress: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Contact</label>
                      <input className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="Ex : contact@popytech.com"
                        value={printSettings.agencyContact}
                        onChange={e => savePrintSettings({ ...printSettings, agencyContact: e.target.value })} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Filigrane */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Filigrane</p>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer"
                      checked={printSettings.watermarkEnabled}
                      onChange={e => savePrintSettings({ ...printSettings, watermarkEnabled: e.target.checked })} />
                    <div className="w-10 h-5 bg-gray-300 dark:bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-5 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600" />
                  </label>
                </div>

                {printSettings.watermarkEnabled && (
                  <div className="space-y-4 pl-1">
                    <div>
                      <label className="block text-sm font-medium mb-2">Type de filigrane</label>
                      <div className="flex gap-3">
                        <button
                          onClick={() => savePrintSettings({ ...printSettings, watermarkUseImage: false })}
                          className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${!printSettings.watermarkUseImage ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400' : 'border-border hover:bg-muted'}`}>
                          Texte
                        </button>
                        <button
                          onClick={() => savePrintSettings({ ...printSettings, watermarkUseImage: true })}
                          disabled={!printSettings.logoBase64}
                          className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${printSettings.watermarkUseImage ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400' : 'border-border hover:bg-muted'} disabled:opacity-40 disabled:cursor-not-allowed`}>
                          Logo {!printSettings.logoBase64 && '(importez le logo)'}
                        </button>
                      </div>
                    </div>

                    {!printSettings.watermarkUseImage && (
                      <div>
                        <label className="block text-sm font-medium mb-1">Texte du filigrane</label>
                        <input className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          placeholder="Ex : CONFIDENTIEL ou POPYTECH"
                          value={printSettings.watermarkText}
                          onChange={e => savePrintSettings({ ...printSettings, watermarkText: e.target.value })} />
                      </div>
                    )}

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-sm font-medium">Opacité</label>
                        <span className="text-sm font-bold text-indigo-600">{printSettings.watermarkOpacity}%</span>
                      </div>
                      <input type="range" min={3} max={60} step={1}
                        className="w-full accent-indigo-600"
                        value={printSettings.watermarkOpacity}
                        onChange={e => savePrintSettings({ ...printSettings, watermarkOpacity: Number(e.target.value) })} />
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>Discret (3%)</span>
                        <span>Visible (60%)</span>
                      </div>
                    </div>

                    {/* Aperçu filigrane */}
                    <div className="rounded-lg border border-border bg-muted/20 h-24 flex items-center justify-center overflow-hidden relative">
                      <p className="text-xs text-muted-foreground absolute top-2 left-3">Aperçu</p>
                      {printSettings.watermarkUseImage && printSettings.logoBase64 ? (
                        <img src={printSettings.logoBase64} alt="watermark preview"
                          style={{ maxHeight: '60px', opacity: printSettings.watermarkOpacity / 100 }}
                          className="object-contain" />
                      ) : (
                        <span style={{
                          fontSize: '28px', fontWeight: 900, color: 'currentColor',
                          opacity: printSettings.watermarkOpacity / 100,
                          transform: 'rotate(-20deg)', display: 'block',
                          letterSpacing: '0.05em', textTransform: 'uppercase',
                        }}>
                          {printSettings.watermarkText || printSettings.agencyName || 'POPYTECH'}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-border">
                <button onClick={() => setShowPrintSettings(false)}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors">
                  Enregistrer & fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Templates ── */}
      {showTemplates && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowTemplates(false)}>
          <div className="bg-background rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-background z-10">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-indigo-500" />
                <h2 className="font-bold text-foreground">Templates de contrats</h2>
              </div>
              <button onClick={() => setShowTemplates(false)} className="p-1.5 rounded hover:bg-muted transition-colors"><X className="h-5 w-5" /></button>
            </div>
              <div className="p-6 space-y-5">
                {(isRespFormations
                  ? TYPE_GROUPS.filter(g => g.label.includes('Formation'))
                  : TYPE_GROUPS
                ).map(group => (
                <div key={group.label}>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">{group.label}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {group.types.map(t => {
                      const hasTemplate = !!TEMPLATES[t.key]
                      return (
                        <button key={t.key} onClick={() => applyTemplate(t.key)}
                          className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${hasTemplate ? 'border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20' : 'border-border hover:bg-muted/50'}`}>
                          <div className={`p-1.5 rounded-lg shrink-0 ${TYPE_COLORS[t.key]}`}>
                            <BookOpen className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{t.label}</p>
                            <p className="text-xs text-muted-foreground">{hasTemplate ? 'Template disponible' : 'Document vierge'}</p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Aperçu ── */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setSelected(null)}>
          <div className="bg-background rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-background z-10">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-indigo-500" />
                <h2 className="font-bold text-foreground">{selected.title}</h2>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => { openEdit(selected); setSelected(null) }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80 text-foreground text-sm font-medium transition-colors">
                  <Edit2 className="h-4 w-4" /> Modifier
                </button>
                  <button onClick={() => printContract(selected, printSettings)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-100 hover:bg-indigo-200 text-indigo-700 text-sm font-medium transition-colors">
                    <Printer className="h-4 w-4" /> Imprimer / PDF
                  </button>
                    <button
                      onClick={async () => { setDownloadingId(selected.id); await downloadContractPDF(selected, printSettings); setDownloadingId(null) }}
                      disabled={downloadingId === selected.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-700 text-sm font-medium transition-colors disabled:opacity-60">
                      {downloadingId === selected.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Télécharger PDF
                    </button>
                <button onClick={() => setSelected(null)} className="p-1.5 rounded hover:bg-muted transition-colors"><X className="h-5 w-5" /></button>
              </div>
            </div>
            <div className="p-6 space-y-5">
              {/* En-tête aperçu avec logo */}
              {(printSettings.logoBase64 || printSettings.agencyName) && (
                <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-xl border border-border">
                  {printSettings.logoBase64 ? (
                    <img src={printSettings.logoBase64} alt="Logo" className="h-12 object-contain" />
                  ) : (
                    <div className="h-12 w-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center text-indigo-600 font-black text-xl">
                      {(printSettings.agencyName || 'P').charAt(0)}
                    </div>
                  )}
                  <div>
                    <p className="font-bold text-foreground">{printSettings.agencyName}</p>
                    {printSettings.agencyDescription && <p className="text-xs text-muted-foreground">{printSettings.agencyDescription}</p>}
                    {(printSettings.agencyAddress || printSettings.agencyContact) && (
                      <p className="text-xs text-muted-foreground">{[printSettings.agencyAddress, printSettings.agencyContact].filter(Boolean).join(' · ')}</p>
                    )}
                  </div>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${TYPE_COLORS[selected.type]}`}>{TYPE_LABELS[selected.type]}</span>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1 ${STATUS_CONFIG[selected.status].color}`}>
                  {React.createElement(STATUS_CONFIG[selected.status].icon, { className: 'h-3 w-3' })}
                  {STATUS_CONFIG[selected.status].label}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {selected.start_date && <div><span className="text-muted-foreground">Date de début</span><p className="font-medium">{fmtDate(selected.start_date)}</p></div>}
                {selected.end_date && <div><span className="text-muted-foreground">Date de fin</span><p className={`font-medium ${isExpiringSoon(selected.end_date) ? 'text-amber-600' : ''}`}>{fmtDate(selected.end_date)}{isExpiringSoon(selected.end_date) ? ' ⚠' : ''}</p></div>}
                {selected.client?.company_name && <div><span className="text-muted-foreground">Client lié</span><p className="font-medium">{selected.client.company_name}</p></div>}
                {selected.team_member?.full_name && <div><span className="text-muted-foreground">Membre équipe</span><p className="font-medium">{selected.team_member.full_name}</p></div>}
                {selected.signed_at && <div><span className="text-muted-foreground">Signé le</span><p className="font-medium">{fmtDate(selected.signed_at)}</p></div>}
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Parties concernées</p>
                <div className="bg-muted/40 rounded-lg p-4 text-sm whitespace-pre-wrap">{selected.parties}</div>
              </div>
              {selected.content && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Contenu du contrat</p>
                  <div className="bg-muted/40 rounded-lg p-4 text-sm whitespace-pre-wrap max-h-72 overflow-y-auto">{selected.content}</div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-6 pt-4 border-t border-border">
                {[`Signature — ${printSettings.agencyName || 'Popytech'}`, 'Signature — Partie 2'].map(s => (
                  <div key={s}>
                    <p className="text-xs text-muted-foreground mb-2">{s}</p>
                    <div className="h-16 border-b-2 border-border" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Formulaire ── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-background rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-background z-10">
              <h2 className="font-bold text-foreground">{editing ? 'Modifier le contrat' : 'Nouveau contrat'}</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded hover:bg-muted transition-colors"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Titre *</label>
                <input className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Ex : NDA avec Client XYZ"
                  value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Type *</label>
                    <select className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value as ContractType }))}>
                      {(isRespFormations
                        ? [{ label: 'Formations', types: TYPE_GROUPS.find(g => g.label.includes('Formation'))?.types ?? [] }]
                        : TYPE_GROUPS
                      ).map(g => (
                        <optgroup key={g.label} label={g.label}>
                          {g.types.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
                        </optgroup>
                      ))}
                    </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Statut *</label>
                  <select className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value as ContractStatus }))}>
                    {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Parties concernées *</label>
                <textarea className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  rows={2} placeholder="Ex : Popytech SARL et Client ABC"
                  value={form.parties} onChange={e => setForm(p => ({ ...p, parties: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Date de début</label>
                  <input type="date" className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={form.start_date} onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Date de fin</label>
                  <input type="date" className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={form.end_date} onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Client lié</label>
                  <select className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={form.client_id} onChange={e => setForm(p => ({ ...p, client_id: e.target.value }))}>
                    <option value="">— Aucun —</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Membre équipe</label>
                  <select className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={form.team_member_id} onChange={e => setForm(p => ({ ...p, team_member_id: e.target.value }))}>
                    <option value="">— Aucun —</option>
                    {team.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Date de signature</label>
                <input type="date" className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.signed_at} onChange={e => setForm(p => ({ ...p, signed_at: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Contenu du contrat</label>
                <textarea className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none font-mono"
                  rows={10} placeholder="Rédigez ou collez le contenu du contrat ici..."
                  value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg border border-border text-sm hover:bg-muted transition-colors">Annuler</button>
                <button onClick={saveContract} disabled={!form.title.trim() || !form.parties.trim()}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors disabled:opacity-50">
                  {editing ? 'Enregistrer' : 'Créer le contrat'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Signature ── */}
      {showSignModal && signingContract && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-background rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-background z-10">
              <div className="flex items-center gap-2">
                <PenLine className="h-5 w-5 text-emerald-500" />
                <h2 className="font-bold text-foreground">Signer le contrat</h2>
              </div>
              <button onClick={() => setShowSignModal(false)} className="p-1.5 rounded hover:bg-muted transition-colors"><X className="h-5 w-5" /></button>
            </div>

            {signSuccess ? (
              <div className="p-10 text-center">
                <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="h-8 w-8 text-emerald-600" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">Contrat signé !</h3>
                <p className="text-sm text-muted-foreground">Le PDF signé a été sauvegardé et téléchargé.</p>
              </div>
            ) : (
              <div className="p-6 space-y-5">
                {/* Info contrat */}
                <div className="bg-muted/40 rounded-xl p-3 flex items-center gap-3">
                  <FileText className="h-5 w-5 text-indigo-500 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">{signingContract.title}</p>
                    <p className="text-xs text-muted-foreground">{TYPE_LABELS[signingContract.type]}</p>
                  </div>
                </div>

                {/* Mode de signature */}
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Mode de signature</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setSignMode('draw')}
                      className={`py-2.5 px-3 rounded-xl border text-sm font-medium transition-all flex items-center justify-center gap-2 ${signMode === 'draw' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400' : 'border-border hover:bg-muted'}`}>
                      <PenLine className="h-4 w-4" /> Signature dessinée
                    </button>
                    <button
                      onClick={() => setSignMode('manual')}
                      className={`py-2.5 px-3 rounded-xl border text-sm font-medium transition-all flex items-center justify-center gap-2 ${signMode === 'manual' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400' : 'border-border hover:bg-muted'}`}>
                      <Check className="h-4 w-4" /> Validation manuelle
                    </button>
                  </div>
                </div>

                {/* Canvas de dessin */}
                {signMode === 'draw' && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Dessinez votre signature</p>
                      <button onClick={clearCanvas} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                        <RotateCcw className="h-3 w-3" /> Effacer
                      </button>
                    </div>
                    <div className="rounded-xl border-2 border-dashed border-emerald-300 dark:border-emerald-700 bg-white dark:bg-zinc-900 overflow-hidden" style={{ touchAction: 'none' }}>
                      <canvas
                        ref={canvasRef}
                        width={520}
                        height={140}
                        className="w-full cursor-crosshair"
                        onMouseDown={onCanvasStart}
                        onMouseMove={onCanvasMove}
                        onMouseUp={onCanvasEnd}
                        onMouseLeave={onCanvasEnd}
                        onTouchStart={onCanvasStart}
                        onTouchMove={onCanvasMove}
                        onTouchEnd={onCanvasEnd}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1.5 text-center">Signez à la souris ou au doigt (tactile)</p>
                  </div>
                )}

                {/* Infos signataire */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Nom du signataire *</label>
                    <input
                      className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="Nom complet"
                      value={signerName}
                      onChange={e => setSignerName(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Qualité / Titre</label>
                    <input
                      className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="Ex : Directeur Général"
                      value={signerRole}
                      onChange={e => setSignerRole(e.target.value)} />
                  </div>
                </div>

                {/* Note légale */}
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-3">
                  <p className="text-xs text-amber-800 dark:text-amber-400">
                    <strong>Note :</strong> La signature sera intégrée dans le PDF et le fichier sera sauvegardé dans votre espace Supabase Storage. Le statut du contrat passera à <strong>Actif</strong>.
                  </p>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-1">
                  <button onClick={() => setShowSignModal(false)} className="px-4 py-2 rounded-lg border border-border text-sm hover:bg-muted transition-colors">Annuler</button>
                  <button
                    onClick={confirmSignature}
                    disabled={signingLoading || !signerName.trim() || (signMode === 'draw' && isCanvasEmpty())}
                    className="flex items-center gap-2 px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors disabled:opacity-50">
                    {signingLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                    {signingLoading ? 'Signature en cours...' : 'Signer & Enregistrer'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Confirm delete ── */}
      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-background rounded-2xl shadow-2xl p-6 w-full max-w-sm">
            <h3 className="font-bold text-foreground mb-2">Supprimer ce contrat ?</h3>
            <p className="text-sm text-muted-foreground mb-5">Cette action est irréversible.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleting(null)} className="px-4 py-2 rounded-lg border border-border text-sm hover:bg-muted transition-colors">Annuler</button>
              <button onClick={() => deleteContract(deleting)} className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors">Supprimer</button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
