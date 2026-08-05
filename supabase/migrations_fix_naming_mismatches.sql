-- ============================================================
-- CORRECTIF : noms de colonnes reels attendus par le code, decouverts
-- en testant les fonctionnalites en conditions reelles apres la
-- reconstruction complete du schema.
-- A coller dans Supabase > SQL Editor > New Query > Run
-- ============================================================

-- Assistante de direction : formulaire "RDV" (meetings) utilise
-- date/description, absents de la version CRM de la table meetings.
alter table public.meetings
  add column if not exists date timestamptz,
  add column if not exists description text;

-- Academy / Formations : colonnes reelles utilisees par
-- src/app/dashboard/formations/page.tsx
alter table public.session_enrollments
  add column if not exists enrolled_at timestamptz default now();

alter table public.training_feedback
  add column if not exists submitted_at timestamptz default now(),
  add column if not exists satisfaction integer,
  add column if not exists trainer_note integer;

alter table public.formation_registrations
  add column if not exists registration_number text,
  add column if not exists registered_at timestamptz default now();

alter table public.formation_payments
  add column if not exists receipt_number text,
  add column if not exists payment_date date default current_date;

-- Commercial/CRM : CommercialDashboard.tsx utilise sales_lead_id ET lead_id
-- (nommage legacy garde en double dans le code), duration_min (pas
-- duration_minutes), et commissions.user_id pour filtrer "mes commissions".
alter table public.meetings
  add column if not exists lead_id uuid references public.sales_leads(id) on delete set null,
  add column if not exists duration_min integer default 30;

alter table public.proposals
  add column if not exists lead_id uuid references public.sales_leads(id) on delete set null;

alter table public.commissions
  add column if not exists user_id uuid references public.profiles(id) on delete set null;

-- Creatrice de contenu : scripts.version est un libelle libre ("V1","V2",
-- "Final"), pas un numero -- inserer "V1" dans une colonne integer plantait
-- silencieusement l'enregistrement.
alter table public.scripts
  alter column version drop default,
  alter column version type text using version::text,
  alter column version set default 'V1';

-- ============================================================
-- FIN DU SCRIPT
-- ============================================================
