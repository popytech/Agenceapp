-- ============================================================
-- SUIVI DES RELANCES DE PAIEMENT - FORMATIONS
-- Necessaire pour le cron /api/cron/formation-payment-reminders :
-- sans cette colonne, impossible de savoir si un apprenant a deja
-- ete relance recemment (et donc d'eviter de le spammer chaque jour).
-- A coller dans Supabase > SQL Editor > New Query > Run
-- ============================================================

alter table public.formation_registrations
  add column if not exists last_reminder_at timestamptz;

create index if not exists formation_registrations_last_reminder_at_idx
  on public.formation_registrations(last_reminder_at);

-- ============================================================
-- FIN DU SCRIPT
-- ============================================================
