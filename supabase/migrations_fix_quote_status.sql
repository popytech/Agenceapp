-- ============================================================
-- CORRECTIF : quotes.status utilisait les valeurs francaises
-- ('brouillon' par defaut) alors que tout le code frontend
-- (src/app/dashboard/quotes/page.tsx) verifie les valeurs anglaises
-- ('draft','sent','accepted','rejected','expired'). Resultat : les
-- boutons "Envoyer"/"Accepter" ne s'affichaient jamais car
-- q.status === 'draft' n'etait jamais vrai.
-- A coller dans Supabase > SQL Editor > New Query > Run
-- ============================================================

alter table public.quotes alter column status set default 'draft';

update public.quotes set status = 'draft' where status = 'brouillon';
update public.quotes set status = 'sent' where status = 'envoye';
update public.quotes set status = 'accepted' where status = 'accepte';
update public.quotes set status = 'rejected' where status = 'refuse';

-- ============================================================
-- FIN DU SCRIPT
-- ============================================================
