import { NextResponse } from 'next/server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function sql(query: string) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql_void`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  })
  return res
}

export async function GET() {
  // Étape 1 : créer la fonction exec_sql_void si elle n'existe pas
  // On utilise l'API SQL de Supabase via le endpoint /pg
  const CREATE_TABLE_SQL = `
    CREATE TABLE IF NOT EXISTS public.podcast_episodes (
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      title text NOT NULL,
      description text,
      episode_number integer,
      season integer DEFAULT 1,
      duration_minutes integer,
      audio_url text,
      cover_url text,
      guest_name text,
      guest_title text,
      category text,
      tags text,
      status text NOT NULL DEFAULT 'brouillon',
      published_at timestamptz,
      views integer DEFAULT 0,
      likes integer DEFAULT 0,
      client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
      created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
      created_at timestamptz DEFAULT now()
    );
    ALTER TABLE IF EXISTS public.podcast_episodes ENABLE ROW LEVEL SECURITY;
    DO $do$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'podcast_episodes' AND policyname = 'podcast_all'
      ) THEN
        CREATE POLICY podcast_all ON public.podcast_episodes FOR ALL USING (true) WITH CHECK (true);
      END IF;
    END $do$;
  `

  // Essai via l'API SQL Supabase (disponible pour les projets récents)
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      method: 'GET',
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
      },
    })

    // Tenter via le endpoint SQL direct
    const sqlRes = await fetch(`https://api.supabase.com/v1/projects/mmmdlthyvdokzdpjqfdr/database/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_KEY}`,
      },
      body: JSON.stringify({ query: CREATE_TABLE_SQL }),
    })

    const text = await sqlRes.text()

    if (sqlRes.ok) {
      return NextResponse.json({ ok: true, message: 'Table créée avec succès !' })
    }

    return NextResponse.json({ ok: false, sql: CREATE_TABLE_SQL, error: text, message: 'Copiez le SQL ci-dessous dans Supabase SQL Editor' })
  } catch (e: any) {
    return NextResponse.json({ ok: false, sql: CREATE_TABLE_SQL, error: e.message })
  }
}
