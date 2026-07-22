-- ============================================================
-- TABLES MANQUANTES POPY TECH ERP
-- À coller dans Supabase > SQL Editor > New Query > Run
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. TABLE: leaves (Congés & Absences)
-- ────────────────────────────────────────────────────────────
create table if not exists public.leaves (
  id              uuid primary key default gen_random_uuid(),
  employee_name   text not null,
  role            text,
  leave_type      text not null default 'conge_paye',
  start_date      date not null,
  end_date        date not null,
  days            numeric(5,1),
  reason          text,
  status          text not null default 'pending'
                    check (status in ('pending', 'approved', 'rejected')),
  reviewed_by     uuid references public.profiles(id) on delete set null,
  reviewed_at     timestamptz,
  created_by      uuid references public.profiles(id) on delete set null,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- Index pour filtrer par statut / employé
create index if not exists leaves_status_idx on public.leaves(status);
create index if not exists leaves_employee_idx on public.leaves(employee_name);

-- RLS
alter table public.leaves enable row level security;

create policy "leaves_select" on public.leaves
  for select using (true);

create policy "leaves_insert" on public.leaves
  for insert with check (auth.uid() is not null);

create policy "leaves_update" on public.leaves
  for update using (auth.uid() is not null);

create policy "leaves_delete" on public.leaves
  for delete using (auth.uid() is not null);


-- ────────────────────────────────────────────────────────────
-- 2. TABLE: stock (Inventaire & Matériel)
-- ────────────────────────────────────────────────────────────
create table if not exists public.stock (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  category         text not null default 'autre',
  quantity         integer not null default 1,
  unit_value       numeric(15,0) default 0,
  serial_number    text,
  assigned_to      text,
  condition        text default 'bon'
                     check (condition in ('neuf', 'bon', 'usage', 'reparation', 'hors_service')),
  purchase_date    date,
  warranty_until   date,
  notes            text,
  created_by       uuid references public.profiles(id) on delete set null,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

-- Index
create index if not exists stock_category_idx on public.stock(category);
create index if not exists stock_condition_idx on public.stock(condition);

-- RLS
alter table public.stock enable row level security;

create policy "stock_select" on public.stock
  for select using (true);

create policy "stock_insert" on public.stock
  for insert with check (auth.uid() is not null);

create policy "stock_update" on public.stock
  for update using (auth.uid() is not null);

create policy "stock_delete" on public.stock
  for delete using (auth.uid() is not null);


-- ────────────────────────────────────────────────────────────
-- 3. TABLE: enrollments (Inscriptions Academy)
-- ────────────────────────────────────────────────────────────
create table if not exists public.enrollments (
  id              uuid primary key default gen_random_uuid(),
  training_id     uuid references public.trainings(id) on delete cascade,
  student_name    text not null,
  student_email   text,
  enrolled_at     date default current_date,
  status          text not null default 'active'
                    check (status in ('active', 'completed', 'paused', 'dropped')),
  progress        integer default 0 check (progress >= 0 and progress <= 100),
  notes           text,
  created_by      uuid references public.profiles(id) on delete set null,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- Index
create index if not exists enrollments_training_idx on public.enrollments(training_id);
create index if not exists enrollments_student_idx on public.enrollments(student_email);
create index if not exists enrollments_status_idx on public.enrollments(status);

-- RLS
alter table public.enrollments enable row level security;

create policy "enrollments_select" on public.enrollments
  for select using (true);

create policy "enrollments_insert" on public.enrollments
  for insert with check (auth.uid() is not null);

create policy "enrollments_update" on public.enrollments
  for update using (auth.uid() is not null);

create policy "enrollments_delete" on public.enrollments
  for delete using (auth.uid() is not null);


-- ────────────────────────────────────────────────────────────
-- 4. Trigger updated_at automatique (optionnel mais propre)
-- ────────────────────────────────────────────────────────────
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger leaves_updated_at
  before update on public.leaves
  for each row execute function public.handle_updated_at();

create trigger stock_updated_at
  before update on public.stock
  for each row execute function public.handle_updated_at();

create trigger enrollments_updated_at
  before update on public.enrollments
  for each row execute function public.handle_updated_at();

-- ============================================================
-- FIN DU SCRIPT
-- ============================================================


-- ============================================================
-- FIX RLS TABLE EXPENSES (si les boutons Paie ne fonctionnent pas)
-- Coller dans Supabase > SQL Editor et Run
-- ============================================================

-- Vérifier les politiques actuelles sur expenses:
-- SELECT * FROM pg_policies WHERE tablename = 'expenses';

-- Si les INSERT/UPDATE/DELETE bloquent, appliquer ceci:
DROP POLICY IF EXISTS "expenses_insert" ON public.expenses;
DROP POLICY IF EXISTS "expenses_update" ON public.expenses;
DROP POLICY IF EXISTS "expenses_delete" ON public.expenses;
DROP POLICY IF EXISTS "expenses_select" ON public.expenses;

-- Recréer avec politiques permissives pour les utilisateurs connectés
CREATE POLICY "expenses_select" ON public.expenses
  FOR SELECT USING (true);

CREATE POLICY "expenses_insert" ON public.expenses
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "expenses_update" ON public.expenses
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "expenses_delete" ON public.expenses
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- ============================================================
