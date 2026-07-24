-- ============================================================
-- UNIFICATION ACADEMY / FORMATIONS - UNE SEULE TABLE D'INSCRITS
-- Ajoute a formation_registrations tous les champs riches que
-- Gestion des inscrits (Academy) stockait dans `enrollments`
-- (souvent encodes en JSON dans notes). Academy et Formations
-- vont maintenant lire/ecrire la meme table - fini les doublons.
-- A coller dans Supabase > SQL Editor > New Query > Run
-- ============================================================

alter table public.formation_registrations
  add column if not exists gender text,
  add column if not exists birth_date date,
  add column if not exists profession text,
  add column if not exists city text,
  add column if not exists address text,
  add column if not exists session_label text,
  add column if not exists level text default 'debutant',
  add column if not exists course_start date,
  add column if not exists course_end date,
  add column if not exists commercial text,
  add column if not exists trainer text,
  add column if not exists room text,
  add column if not exists attendance_status text default 'present',
  add column if not exists certificate_issued boolean default false,
  add column if not exists certificate_number text,
  add column if not exists payment_method text default 'especes',
  add column if not exists progress integer default 0,
  add column if not exists learning_status text default 'active';

-- ============================================================
-- FIN DU SCRIPT
-- ============================================================
