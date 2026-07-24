-- ============================================================
-- CORRECTIF COLONNES MANQUANTES - MODULE FORMATIONS
-- Trouvees en creusant le bug "inscrits pas visibles entre
-- Academy et Sessions & Formateurs" : le code de
-- src/app/dashboard/formations/page.tsx utilise ces colonnes
-- qui n'existaient pas dans la migration de reconstruction.
-- A coller dans Supabase > SQL Editor > New Query > Run
-- ============================================================

alter table public.formation_registrations
  add column if not exists registration_number text,
  add column if not exists registered_at timestamptz default now();

alter table public.formation_payments
  add column if not exists payment_date date default current_date,
  add column if not exists receipt_number text;

-- ============================================================
-- FIN DU SCRIPT
-- ============================================================
