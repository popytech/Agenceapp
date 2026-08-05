-- ============================================================
-- Formulaire d'inscription personnalise + lien public partageable
-- pour les formations.
-- A coller dans Supabase > SQL Editor > New Query > Run
-- ============================================================

-- Champs personnalises definis par formation (tableau de
-- {key,label,type,required}), et reponses du candidat a ces champs.
alter table public.trainings
  add column if not exists custom_fields jsonb not null default '[]'::jsonb;

alter table public.formation_registrations
  add column if not exists custom_answers jsonb;

-- ============================================================
-- FIN DU SCRIPT
-- ============================================================
