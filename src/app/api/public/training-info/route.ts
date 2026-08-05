import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Identifiant manquant" }, { status: 400 });

  const { data: training } = await supabase
    .from("trainings")
    .select("id, title, description, price, duration_hours, is_published, custom_fields")
    .eq("id", id)
    .single();

  if (!training || !training.is_published) {
    return NextResponse.json({ error: "Formation introuvable" }, { status: 404 });
  }

  const { data: sessions } = await supabase
    .from("training_sessions")
    .select("id, title, format, start_date, end_date, capacity, location, visio_link")
    .eq("training_id", id)
    .in("status", ["planifiee", "en_cours"])
    .order("start_date", { ascending: true });

  return NextResponse.json({
    id: training.id,
    title: training.title,
    description: training.description,
    price: training.price,
    duration_hours: training.duration_hours,
    custom_fields: training.custom_fields || [],
    sessions: sessions || [],
  });
}
