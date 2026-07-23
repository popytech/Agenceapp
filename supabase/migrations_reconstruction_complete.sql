-- ============================================================
-- RECONSTRUCTION COMPLETE DU SCHEMA - AGENCE APP POPY TECH
-- Le schema live (rebuild_core.sql) etait une version simplifiee/
-- initiale qui ne correspond pas a ce que le code utilise reellement.
-- Ce script ajoute les colonnes manquantes sur les tables existantes
-- et cree toutes les tables absentes utilisees par le code.
-- Prototype solide : types simples, FK en "on delete set null" par
-- defaut, pas de contraintes strictes superflues.
-- A coller dans Supabase > SQL Editor > New Query > Run
-- ============================================================

create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ────────────────────────────────────────────────────────────
-- SECTION 1 : colonnes manquantes sur les tables existantes
-- ────────────────────────────────────────────────────────────

alter table public.invoices
  add column if not exists invoice_date date default current_date,
  add column if not exists issue_date date,
  add column if not exists currency text default 'GNF',
  add column if not exists company_name text,
  add column if not exists company_address text,
  add column if not exists company_email text,
  add column if not exists company_phone text,
  add column if not exists tax_number text,
  add column if not exists tax_rate numeric(5,2) default 0,
  add column if not exists discount numeric(15,2) default 0,
  add column if not exists terms text,
  add column if not exists quote_id uuid references public.quotes(id) on delete set null,
  add column if not exists items jsonb,
  add column if not exists subtotal numeric(15,2) default 0;

alter table public.quotes
  add column if not exists title text,
  add column if not exists description text,
  add column if not exists tax_rate numeric(5,2) default 18,
  add column if not exists items jsonb,
  add column if not exists subtotal numeric(15,2) default 0,
  add column if not exists tax_amount numeric(15,2) default 0,
  add column if not exists accepted_at timestamptz;

alter table public.time_entries
  add column if not exists duration_seconds integer,
  add column if not exists hourly_rate numeric(15,2) default 0,
  add column if not exists is_billable boolean default true;

alter table public.publications
  add column if not exists proof_link text,
  add column if not exists proof_url text,
  add column if not exists reach integer default 0,
  add column if not exists likes integer default 0,
  add column if not exists comments integer default 0,
  add column if not exists shares integer default 0,
  add column if not exists workflow_step text default 'script';

alter table public.trainings
  add column if not exists level text,
  add column if not exists category text;

alter table public.daily_reports
  add column if not exists mood text,
  add column if not exists tasks_done text,
  add column if not exists tasks_in_progress text,
  add column if not exists next_day_plan text,
  add column if not exists hours_worked numeric(5,2);

alter table public.appointments
  add column if not exists type text default 'rdv_client',
  add column if not exists location text,
  add column if not exists meeting_link text,
  add column if not exists notes text;

alter table public.invoice_items
  add column if not exists tax_rate numeric(5,2) default 0;

alter table public.tasks
  add column if not exists delivered_at timestamptz,
  add column if not exists delivery_notes text,
  add column if not exists delivery_criteria text,
  add column if not exists due_date date;

alter table public.subtasks
  add column if not exists assigned_to uuid references public.profiles(id) on delete set null,
  add column if not exists deadline date,
  add column if not exists is_done boolean default false;

-- Certaines pages (portail client) interrogent projects.name/deadline en plus
-- de title/end_date deja existants - colonnes independantes, pas de sync automatique.
alter table public.projects
  add column if not exists name text,
  add column if not exists deadline date;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'settings_key_unique'
  ) then
    alter table public.settings add constraint settings_key_unique unique (key);
  end if;
end $$;

-- ────────────────────────────────────────────────────────────
-- SECTION 2 : tables manquantes, par domaine
-- ────────────────────────────────────────────────────────────

-- CRM / Pipeline commercial
create table if not exists public.prospects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company text,
  email text,
  phone text,
  whatsapp text,
  service text,
  source text,
  notes text,
  status text default 'nouveau',
  heat text,
  temperature_score integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.offers (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid references public.prospects(id) on delete set null,
  service text,
  price numeric(15,2) default 0,
  message text,
  details text,
  status text default 'brouillon',
  pipeline_stage text default 'nouveau',
  sent_at timestamptz,
  opened_at timestamptz,
  clicked_at timestamptz,
  accepted_at timestamptz,
  refused_at timestamptz,
  open_count integer default 0,
  click_count integer default 0,
  tracking_token text,
  updates jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.email_logs (
  id uuid primary key default gen_random_uuid(),
  event text,
  offer_id uuid references public.offers(id) on delete set null,
  prospect_id uuid references public.prospects(id) on delete set null,
  recipient_email text,
  subject text,
  tracking_token text,
  created_at timestamptz default now()
);

create table if not exists public.marketing_activities (
  id uuid primary key default gen_random_uuid(),
  type text,
  description text,
  offer_id uuid references public.offers(id) on delete set null,
  prospect_id uuid references public.prospects(id) on delete set null,
  created_at timestamptz default now()
);

create table if not exists public.followups (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid references public.offers(id) on delete set null,
  prospect_id uuid references public.prospects(id) on delete set null,
  type text,
  channel text,
  message text,
  date date default current_date,
  sent_at timestamptz,
  responded boolean default false,
  response text,
  created_at timestamptz default now()
);

create table if not exists public.scheduled_followups (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid references public.offers(id) on delete set null,
  prospect_id uuid references public.prospects(id) on delete set null,
  followup_type text,
  channel text,
  message text,
  scheduled_at timestamptz,
  sent_at timestamptz,
  status text default 'planifie',
  error text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.sales_leads (
  id uuid primary key default gen_random_uuid(),
  company_name text,
  contact_name text,
  contact_email text,
  contact_phone text,
  source text,
  status text default 'nouveau',
  score integer default 0,
  urgency text,
  decision_level text,
  estimated_budget numeric(15,2),
  need text,
  notes text,
  assigned_to uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.proposals (
  id uuid primary key default gen_random_uuid(),
  sales_lead_id uuid references public.sales_leads(id) on delete set null,
  title text,
  description text,
  price numeric(15,2) default 0,
  pdf_url text,
  status text default 'brouillon',
  sent_at timestamptz,
  view_count integer default 0,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now()
);

create table if not exists public.commissions (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid references public.proposals(id) on delete cascade,
  amount numeric(15,2) default 0,
  percentage numeric(5,2) default 0,
  status text default 'en_attente',
  paid_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists public.meetings (
  id uuid primary key default gen_random_uuid(),
  title text,
  type text,
  sales_lead_id uuid references public.sales_leads(id) on delete set null,
  assigned_to uuid references public.profiles(id) on delete set null,
  scheduled_at timestamptz,
  duration_minutes integer default 30,
  meet_link text,
  location text,
  status text default 'planifie',
  outcome text,
  summary text,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now()
);

create table if not exists public.marketing_kpi (
  id uuid primary key default gen_random_uuid(),
  date date default current_date,
  user_id uuid references public.profiles(id) on delete set null,
  leads_generated integer default 0,
  spend numeric(15,2) default 0,
  created_at timestamptz default now()
);

create table if not exists public.business_contacts (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  company text,
  job_title text,
  email text,
  phone text,
  whatsapp text,
  website text,
  city text,
  sector text,
  relation_type text,
  tags text,
  notes jsonb,
  is_favorite boolean default false,
  follow_up_date date,
  status text default 'actif',
  priority text default 'normale',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now()
);

-- Community / Reseaux sociaux
create table if not exists public.social_connected_accounts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete set null,
  user_id uuid references public.profiles(id) on delete set null,
  platform text not null,
  platform_page_id text,
  platform_page_name text,
  platform_user_id text,
  platform_username text,
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  scope text,
  ig_user_id text,
  avatar_url text,
  followers_count integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.community_accounts (
  id uuid primary key default gen_random_uuid(),
  name text,
  platform text,
  account_url text,
  account_type text,
  client_id uuid references public.clients(id) on delete set null,
  followers_count integer default 0,
  bio text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now()
);

create table if not exists public.community_reviews (
  id uuid primary key default gen_random_uuid(),
  platform text,
  reviewer_name text,
  rating integer,
  content text,
  account_type text,
  client_id uuid references public.clients(id) on delete set null,
  review_date date default current_date,
  created_by uuid references public.profiles(id) on delete set null,
  response text,
  responded_at timestamptz,
  responded_by uuid references public.profiles(id) on delete set null,
  status text default 'nouveau',
  created_at timestamptz default now()
);

create table if not exists public.community_hashtags (
  id uuid primary key default gen_random_uuid(),
  tag text not null,
  category text,
  platform text,
  client_id uuid references public.clients(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  usage_count integer default 0,
  created_at timestamptz default now()
);

-- Contenu / Creator / Podcast
create table if not exists public.content_ideas (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  notes text,
  category text,
  platform text,
  status text default 'idee',
  content_type text,
  client_id uuid references public.clients(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  publish_date date,
  hook text,
  idea_status text,
  validation_status text,
  description text,
  user_id uuid references public.profiles(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now()
);

create table if not exists public.scripts (
  id uuid primary key default gen_random_uuid(),
  content_id uuid references public.content_ideas(id) on delete cascade,
  hook text,
  body text,
  cta text,
  visual_notes text,
  editing_instructions text,
  version integer default 1,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.productions (
  id uuid primary key default gen_random_uuid(),
  content_id uuid references public.content_ideas(id) on delete cascade,
  status text default 'a_faire',
  uploaded_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.content_feedback (
  id uuid primary key default gen_random_uuid(),
  content_id uuid references public.content_ideas(id) on delete cascade,
  reviewer_id uuid references public.profiles(id) on delete set null,
  reviewer_role text,
  comment text,
  approved boolean default false,
  created_at timestamptz default now()
);

create table if not exists public.group_messages (
  id uuid primary key default gen_random_uuid(),
  content text,
  sender_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now()
);

-- Design
create table if not exists public.design_tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  visual_type text,
  client_name text,
  deadline date,
  priority text default 'moyenne',
  status text default 'a_faire',
  revisions_included integer default 2,
  revisions_used integer default 0,
  assigned_to uuid references public.profiles(id) on delete set null,
  assigned_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.design_deliverables (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references public.design_tasks(id) on delete cascade,
  file_name text,
  file_type text,
  file_url text,
  version integer default 1,
  note text,
  uploaded_by uuid references public.profiles(id) on delete set null,
  uploaded_at timestamptz default now()
);

create table if not exists public.design_feedbacks (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references public.design_tasks(id) on delete cascade,
  deliverable_id uuid references public.design_deliverables(id) on delete cascade,
  comment text,
  status text default 'en_attente',
  requested_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now()
);

create table if not exists public.design_resources (
  id uuid primary key default gen_random_uuid(),
  name text,
  category text,
  client_name text,
  external_url text,
  file_url text,
  tags text,
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now()
);

-- Dev / Ingenierie
create table if not exists public.dev_projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  client_name text,
  description text,
  status text default 'actif',
  tech_stack text,
  deadline date,
  created_at timestamptz default now()
);

create table if not exists public.dev_tickets (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  type text,
  priority text default 'moyenne',
  status text default 'a_faire',
  project_id uuid references public.dev_projects(id) on delete set null,
  deadline date,
  estimated_hours numeric(6,2),
  assigned_to uuid references public.profiles(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now()
);

create table if not exists public.bug_reports (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  project_id uuid references public.dev_projects(id) on delete set null,
  severity text default 'moyenne',
  status text default 'ouvert',
  url text,
  browser text,
  reproduction_steps text,
  reported_by uuid references public.profiles(id) on delete set null,
  assigned_to uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now()
);

create table if not exists public.deployments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.dev_projects(id) on delete set null,
  version text,
  server text,
  url text,
  status text default 'ok',
  notes text,
  deployed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now()
);

create table if not exists public.dev_docs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.dev_projects(id) on delete set null,
  title text,
  type text,
  content text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now()
);

-- RH / Administration
create table if not exists public.leaves (
  id uuid primary key default gen_random_uuid(),
  employee_name text not null,
  role text,
  leave_type text default 'conge_paye',
  start_date date not null,
  end_date date not null,
  days numeric(5,1),
  reason text,
  status text default 'pending',
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.hr_leave_requests (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references public.profiles(id) on delete set null,
  start_date date,
  end_date date,
  type text,
  reason text,
  status text default 'pending',
  reviewed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now()
);

create table if not exists public.hr_attendance (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references public.profiles(id) on delete set null,
  date date default current_date,
  status text default 'present',
  note text,
  created_at timestamptz default now(),
  unique (employee_id, date)
);

create table if not exists public.payroll (
  id uuid primary key default gen_random_uuid(),
  employee_name text not null,
  role text,
  period text not null,
  salary_base numeric(15,2) default 0,
  bonuses numeric(15,2) default 0,
  deductions numeric(15,2) default 0,
  net_salary numeric(15,2) default 0,
  status text default 'pending',
  payment_date date,
  payment_method text default 'virement',
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.internal_announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  message text,
  priority text default 'normale',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now()
);

create table if not exists public.admin_documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text,
  file_url text,
  description text,
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now()
);

create table if not exists public.stock (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text default 'autre',
  quantity integer default 1,
  unit_value numeric(15,0) default 0,
  serial_number text,
  assigned_to text,
  condition text default 'bon',
  purchase_date date,
  warranty_until date,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  action text,
  entity_type text,
  entity_id uuid,
  details jsonb,
  created_at timestamptz default now()
);

-- Academy / Formations
create table if not exists public.enrollments (
  id uuid primary key default gen_random_uuid(),
  training_id uuid references public.trainings(id) on delete cascade,
  student_name text not null,
  student_email text,
  enrolled_at date default current_date,
  status text default 'active',
  progress integer default 0,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.training_sessions (
  id uuid primary key default gen_random_uuid(),
  training_id uuid references public.trainings(id) on delete cascade,
  trainer_id uuid references public.profiles(id) on delete set null,
  title text,
  format text,
  start_date date,
  end_date date,
  capacity integer default 20,
  location text,
  visio_link text,
  status text default 'planifie',
  created_at timestamptz default now()
);

create table if not exists public.formation_registrations (
  id uuid primary key default gen_random_uuid(),
  training_id uuid references public.trainings(id) on delete set null,
  session_id uuid references public.training_sessions(id) on delete set null,
  student_name text not null,
  student_email text,
  student_phone text,
  student_company text,
  amount_due numeric(15,2) default 0,
  amount_paid numeric(15,2) default 0,
  payment_status text default 'impaye',
  registration_status text default 'confirme',
  registered_by uuid references public.profiles(id) on delete set null,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.formation_payments (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid references public.formation_registrations(id) on delete cascade,
  training_id uuid references public.trainings(id) on delete set null,
  student_name text,
  amount numeric(15,2) default 0,
  payment_method text,
  reference text,
  notes text,
  collected_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now()
);

create table if not exists public.session_enrollments (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.training_sessions(id) on delete cascade,
  student_id uuid references public.profiles(id) on delete set null,
  status text default 'inscrit',
  grade numeric(5,2),
  attendance_rate numeric(5,2),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.training_enrollments (
  id uuid primary key default gen_random_uuid(),
  training_id uuid references public.trainings(id) on delete cascade,
  progress integer default 0,
  status text default 'active',
  created_at timestamptz default now()
);

create table if not exists public.training_feedback (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.training_sessions(id) on delete set null,
  student_id uuid references public.profiles(id) on delete set null,
  rating integer,
  comment text,
  created_at timestamptz default now()
);

create table if not exists public.academy_certifications (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.profiles(id) on delete set null,
  training_id uuid references public.trainings(id) on delete set null,
  status text default 'en_cours',
  certificate_number text,
  issued_at timestamptz,
  issued_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now()
);

-- Legal / Contrats / Documents
create table if not exists public.contracts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  type text,
  status text default 'brouillon',
  parties text,
  content text,
  start_date date,
  end_date date,
  client_id uuid references public.clients(id) on delete set null,
  team_member_id uuid references public.profiles(id) on delete set null,
  signed_at timestamptz,
  signed_by text,
  signature_data text,
  signed_pdf_url text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.client_documents (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete cascade,
  title text,
  category text,
  description text,
  file_name text,
  file_size integer,
  file_url text,
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now()
);

create table if not exists public.cm_documents (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete cascade,
  title text,
  category text,
  description text,
  file_name text,
  file_size integer,
  file_url text,
  scope text,
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now()
);

create table if not exists public.client_project_comments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete cascade,
  deliverable_id uuid,
  content text,
  type text,
  created_at timestamptz default now()
);

create table if not exists public.deliverables (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete set null,
  title text,
  status text default 'en_attente',
  approved_at timestamptz,
  rejected_at timestamptz,
  rejection_reason text,
  created_at timestamptz default now()
);

create table if not exists public.project_comments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  content text,
  created_at timestamptz default now()
);

create table if not exists public.project_files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  name text,
  file_path text,
  file_size integer,
  mime_type text,
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now()
);

-- Catalogue commercial
create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text,
  description text,
  price numeric(15,2) default 0,
  production_cost numeric(15,2) default 0,
  delivery_time text,
  revisions_included integer default 0,
  livrables text,
  production_responsible text,
  is_recurring boolean default false,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.service_margins (
  id uuid primary key default gen_random_uuid(),
  service_id uuid references public.services(id) on delete cascade unique,
  selling_price numeric(15,2) default 0,
  production_cost numeric(15,2) default 0,
  margin_percent numeric(5,2) default 0,
  updated_at timestamptz default now()
);

create table if not exists public.packs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price numeric(15,2) default 0,
  duration_days integer,
  discount_percent numeric(5,2) default 0,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.pack_services (
  pack_id uuid references public.packs(id) on delete cascade,
  service_id uuid references public.services(id) on delete cascade,
  quantity integer default 1,
  primary key (pack_id, service_id)
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete set null,
  service_id uuid references public.services(id) on delete set null,
  pack_id uuid references public.packs(id) on delete set null,
  monthly_price numeric(15,2) default 0,
  start_date date default current_date,
  next_billing_date date,
  commitment_months integer default 0,
  status text default 'actif',
  notes text,
  updated_at timestamptz default now(),
  created_at timestamptz default now()
);

-- Video
create table if not exists public.video_projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  client_id uuid references public.clients(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  assigned_to uuid references public.profiles(id) on delete set null,
  video_type text,
  status text default 'brief',
  duration_min integer,
  deadline date,
  drive_link text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Chat / divers
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid references public.profiles(id) on delete set null,
  receiver_id uuid references public.profiles(id) on delete set null,
  content text,
  is_read boolean default false,
  created_at timestamptz default now()
);

create table if not exists public.client_messages (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete cascade,
  sender text,
  message text,
  created_at timestamptz default now()
);

create table if not exists public.podcast_episodes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  episode_number integer,
  season integer default 1,
  duration_minutes integer,
  audio_url text,
  cover_url text,
  guest_name text,
  guest_title text,
  category text,
  tags text,
  status text default 'brouillon',
  published_at timestamptz,
  views integer default 0,
  likes integer default 0,
  client_id uuid references public.clients(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now()
);

-- ────────────────────────────────────────────────────────────
-- SECTION 3 : RLS permissive + grants pour toutes les nouvelles tables
-- (meme politique que rebuild_core.sql : select libre, ecriture pour
-- authenticated)
-- ────────────────────────────────────────────────────────────

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'prospects','offers','email_logs','marketing_activities','followups',
    'scheduled_followups','sales_leads','proposals','commissions','meetings',
    'marketing_kpi','business_contacts',
    'social_connected_accounts','community_accounts','community_reviews','community_hashtags',
    'content_ideas','scripts','productions','content_feedback','group_messages',
    'design_tasks','design_deliverables','design_feedbacks','design_resources',
    'dev_projects','dev_tickets','bug_reports','deployments','dev_docs',
    'leaves','hr_leave_requests','hr_attendance','payroll','internal_announcements',
    'admin_documents','stock','activity_logs',
    'enrollments','training_sessions','formation_registrations','formation_payments',
    'session_enrollments','training_enrollments','training_feedback','academy_certifications',
    'contracts','client_documents','cm_documents','client_project_comments','deliverables',
    'project_comments','project_files',
    'services','service_margins','packs','pack_services','subscriptions',
    'video_projects','messages','client_messages','podcast_episodes'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format(
      'create policy %I on public.%I for select using (true)',
      table_name || '_select', table_name
    );
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (true)',
      table_name || '_insert', table_name
    );
    execute format(
      'create policy %I on public.%I for update to authenticated using (true) with check (true)',
      table_name || '_update', table_name
    );
    execute format(
      'create policy %I on public.%I for delete to authenticated using (true)',
      table_name || '_delete', table_name
    );
    execute format('grant select on public.%I to anon', table_name);
    execute format('grant select, insert, update, delete on public.%I to authenticated', table_name);
    execute format('grant all on public.%I to service_role', table_name);
  end loop;
end $$;

-- Triggers updated_at pour les nouvelles tables qui ont cette colonne
do $$
declare table_name text;
begin
  foreach table_name in array array[
    'prospects','offers','scheduled_followups','sales_leads',
    'social_connected_accounts','scripts','productions','design_tasks',
    'leaves','payroll','stock','enrollments','session_enrollments',
    'formation_registrations','contracts','services','packs','subscriptions',
    'video_projects'
  ] loop
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.handle_updated_at()',
      table_name || '_updated_at', table_name
    );
  end loop;
end $$;

-- ============================================================
-- FIN DU SCRIPT
-- ============================================================
