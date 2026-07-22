import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET — liste des relances programmées
export async function GET() {
  const { data, error } = await supabase
    .from("scheduled_followups")
    .select(`
      *,
      prospect:prospects(id, name, company, email, phone, whatsapp),
      offer:offers(id, service, price, tracking_token)
    `)
    .order("scheduled_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

// POST — programmer une nouvelle relance automatique
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { offer_id, prospect_id, channel, followup_type, message, scheduled_at } = body;

  if (!offer_id || !prospect_id || !scheduled_at) {
    return NextResponse.json({ error: "offer_id, prospect_id, scheduled_at sont requis" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("scheduled_followups")
    .insert({ offer_id, prospect_id, channel: channel || "Email", followup_type: followup_type || "Relance 1", message, scheduled_at, status: "pending" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, data });
}

// DELETE — annuler une relance programmée
export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id requis" }, { status: 400 });

  const { error } = await supabase
    .from("scheduled_followups")
    .delete()
    .eq("id", id)
    .eq("status", "pending");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
