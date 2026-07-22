import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      storageKey: 'popy-tech-auth',
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    }
  }
)

    export type UserRole =
        | 'ceo'
        | 'super_admin'
        | 'chef_projet'
    | 'designer'
    | 'developpeur'
    | 'marketeur'
    | 'cm'
    | 'vidéaste'
    | 'monteur_video'
    | 'formateur'
    | 'responsable_formations'
    | 'assistante_direction'
    | 'stagiaire'
    | 'client'
    | 'creatrice_contenu'
    | 'commercial_digital'

export interface Profile {
  id: string
  full_name: string | null
  email: string | null
  phone: string | null
  avatar_url: string | null
  role: UserRole
  status: 'active' | 'suspended'
  two_factor_enabled: boolean
  created_at: string
  updated_at: string
}

export interface Client {
  id: string
  company_name: string
  contact_name: string
  email: string | null
  phone: string | null
  address: string | null
  status: 'prospect' | 'actif' | 'inactif'
  notes: string | null
  portal_enabled: boolean | null
  portal_password: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface Project {
  id: string
  client_id: string | null
  title: string
  description: string | null
  status: 'en_attente' | 'en_cours' | 'en_validation' | 'termine' | 'bloque'
  start_date: string | null
  end_date: string | null
  budget: number
  created_by: string | null
  created_at: string
  updated_at: string
  clients?: Client
}

export interface Task {
  id: string
  project_id: string | null
  assigned_to: string | null
  created_by: string | null
  title: string
  description: string | null
  priority: 'basse' | 'moyenne' | 'elevee'
  status: 'a_faire' | 'en_cours' | 'en_revision' | 'termine'
  deadline: string | null
  parent_task_id: string | null
  position: number
  created_at: string
  updated_at: string
  profiles?: Profile
  projects?: Project
}

export interface Invoice {
  id: string
  client_id: string | null
  project_id: string | null
  invoice_number: string | null
  total_amount: number
  paid_amount: number
  status: 'impayee' | 'partielle' | 'payee'
  due_date: string | null
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  clients?: Client
  projects?: Project
}

export interface Quote {
  id: string
  client_id: string | null
  quote_number: string | null
  total_amount: number
  status: 'brouillon' | 'envoye' | 'accepte' | 'refuse'
  valid_until: string | null
  notes: string | null
  created_by: string | null
  created_at: string
  clients?: Client
}

export interface Payment {
  id: string
  invoice_id: string | null
  amount: number
  payment_method: string | null
  transaction_ref: string | null
  payment_date: string
  notes: string | null
  recorded_by: string | null
  created_at: string
}

export interface Expense {
  id: string
  title: string
  amount: number
  category: string | null
  expense_date: string
  receipt_url: string | null
  notes: string | null
  created_by: string | null
  created_at: string
}

export interface Training {
  id: string
  title: string
  description: string | null
  price: number
  duration_hours: number | null
  is_published: boolean
  cover_url: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface TrainingModule {
  id: string
  training_id: string
  title: string
  content: string | null
  video_url: string | null
  position: number
  created_at: string
}

export interface Intern {
  id: string
  user_id: string
  mentor_id: string | null
  start_date: string | null
  end_date: string | null
  school: string | null
  domain: string | null
  status: 'actif' | 'termine' | 'suspendu'
  evaluation_score: number | null
  notes: string | null
  created_at: string
  profiles?: Profile
  mentor?: Profile
}

export interface Message {
  id: string
  sender_id: string
  receiver_id: string
  content: string
  is_read: boolean
  created_at: string
  sender?: Profile
  receiver?: Profile
}

export interface Notification {
  id: string
  user_id: string
  title: string
  message: string | null
  type: 'info' | 'success' | 'warning' | 'error'
  is_read: boolean
  link: string | null
  created_at: string
}

export interface OfferSend {
  id: string
  client_id: string | null
  sent_by: string | null
  offer_type: 'pack_reseaux' | 'site_web' | 'identite_visuelle' | 'publicite' | 'formation' | 'video' | 'autre'
  title: string
  description: string | null
  amount: number | null
  sent_at: string
  status: 'envoye' | 'vu' | 'interesse' | 'accepte' | 'refuse'
  notes: string | null
  created_at: string
  clients?: Client
}

export interface ClientFollowup {
  id: string
  client_id: string | null
  done_by: string | null
  followup_type: 'appel' | 'message' | 'email' | 'visite' | 'autre'
  notes: string | null
  next_followup_date: string | null
  status: 'planifie' | 'fait' | 'sans_reponse' | 'relance'
  followup_date: string
  created_at: string
  clients?: Client
}

export interface VideoProject {
  id: string
  title: string
  client_id: string | null
  project_id: string | null
  assigned_to: string | null
  video_type: string
  status: 'brief' | 'tournage' | 'montage' | 'revision' | 'livre' | 'archive'
  duration_min: number | null
  deadline: string | null
  drive_link: string | null
  notes: string | null
  created_at: string
  updated_at: string
  clients?: Client
  profiles?: Profile
}

export interface DesignProject {
  id: string
  title: string
  client_id: string | null
  project_id: string | null
  assigned_to: string | null
  design_type: string
  status: 'brief' | 'en_cours' | 'revision' | 'valide' | 'livre' | 'archive'
  deadline: string | null
  drive_link: string | null
  notes: string | null
  created_at: string
  updated_at: string
  clients?: Client
  profiles?: Profile
}
