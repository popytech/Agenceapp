-- AGENCE APP POPY TECH - reconstruction du noyau Supabase
-- ATTENTION : supprime toutes les tables du schema public du projet cible.

begin;

drop schema if exists public cascade;
create schema public;
grant usage on schema public to postgres, anon, authenticated, service_role;
grant all on schema public to postgres, service_role;

create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text unique,
  phone text,
  avatar_url text,
  role text not null default 'client',
  status text not null default 'active',
  two_factor_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  contact_name text,
  email text,
  phone text,
  address text,
  status text not null default 'prospect',
  notes text,
  portal_enabled boolean not null default false,
  portal_password text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete set null,
  title text not null,
  description text,
  status text not null default 'en_attente',
  start_date date,
  end_date date,
  budget numeric(15,2) not null default 0,
  progress integer not null default 0 check (progress between 0 and 100),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text,
  created_at timestamptz not null default now(),
  unique(project_id, user_id)
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  assigned_to uuid references public.profiles(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  title text not null,
  description text,
  priority text not null default 'moyenne',
  status text not null default 'a_faire',
  deadline date,
  parent_task_id uuid references public.tasks(id) on delete cascade,
  position integer not null default 0,
  progress integer not null default 0 check (progress between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.subtasks (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  title text not null,
  completed boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  invoice_number text unique,
  total_amount numeric(15,2) not null default 0,
  paid_amount numeric(15,2) not null default 0,
  status text not null default 'impayee',
  due_date date,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  is_recurring boolean not null default false,
  recurrence_interval text,
  next_invoice_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  description text not null,
  quantity numeric(12,2) not null default 1,
  unit_price numeric(15,2) not null default 0,
  total numeric(15,2) generated always as (quantity * unit_price) stored,
  created_at timestamptz not null default now()
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid references public.invoices(id) on delete set null,
  amount numeric(15,2) not null,
  payment_method text,
  transaction_ref text,
  payment_date date not null default current_date,
  notes text,
  recorded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete set null,
  title text not null,
  amount numeric(15,2) not null default 0,
  category text,
  expense_date date not null default current_date,
  receipt_url text,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete set null,
  quote_number text unique,
  total_amount numeric(15,2) not null default 0,
  status text not null default 'brouillon',
  valid_until date,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  title text not null,
  description text,
  start_at timestamptz not null,
  end_at timestamptz,
  status text not null default 'planifie',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.publications (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  assigned_to uuid references public.profiles(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  title text not null,
  content text,
  platform text,
  content_type text,
  status text not null default 'brouillon',
  scheduled_at timestamptz,
  published_at timestamptz,
  media_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.trainings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  price numeric(15,2) not null default 0,
  duration_hours integer,
  is_published boolean not null default false,
  cover_url text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.training_modules (
  id uuid primary key default gen_random_uuid(),
  training_id uuid not null references public.trainings(id) on delete cascade,
  title text not null,
  content text,
  video_url text,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.interns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  mentor_id uuid references public.profiles(id) on delete set null,
  start_date date,
  end_date date,
  school text,
  domain text,
  status text not null default 'actif',
  evaluation_score numeric(5,2),
  notes text,
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  title text not null,
  message text,
  type text not null default 'info',
  is_read boolean not null default false,
  link text,
  created_at timestamptz not null default now()
);

create table public.settings (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table public.time_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  task_id uuid references public.tasks(id) on delete set null,
  description text,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_minutes integer,
  created_at timestamptz not null default now()
);

create table public.daily_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  report_date date not null default current_date,
  content text,
  achievements text,
  blockers text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    lower(new.email),
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'role', 'client')
  ) on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'profiles','clients','projects','project_members','tasks','subtasks',
    'invoices','invoice_items','payments','expenses','quotes','appointments',
    'publications','trainings','training_modules','interns','notifications',
    'settings','time_entries','daily_reports'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('create policy %I on public.%I for select using (true)', table_name || '_select', table_name);
    execute format('create policy %I on public.%I for insert to authenticated with check (true)', table_name || '_insert', table_name);
    execute format('create policy %I on public.%I for update to authenticated using (true) with check (true)', table_name || '_update', table_name);
    execute format('create policy %I on public.%I for delete to authenticated using (true)', table_name || '_delete', table_name);
    execute format('grant select on public.%I to anon', table_name);
    execute format('grant select, insert, update, delete on public.%I to authenticated', table_name);
    execute format('grant all on public.%I to service_role', table_name);
  end loop;
end $$;

insert into storage.buckets (id, name, public)
values
  ('client-documents', 'client-documents', true),
  ('project-files', 'project-files', true),
  ('project-uploads', 'project-uploads', true),
  ('design-deliverables', 'design-deliverables', true),
  ('cm-documents', 'cm-documents', true),
  ('contracts', 'contracts', true)
on conflict (id) do update set public = excluded.public;

create policy "public_storage_read" on storage.objects for select using (bucket_id in (
  'client-documents','project-files','project-uploads','design-deliverables','cm-documents','contracts'
));
create policy "authenticated_storage_insert" on storage.objects for insert to authenticated with check (true);
create policy "authenticated_storage_update" on storage.objects for update to authenticated using (true) with check (true);
create policy "authenticated_storage_delete" on storage.objects for delete to authenticated using (true);

commit;
