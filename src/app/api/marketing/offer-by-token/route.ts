import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Token manquant" }, { status: 400 });

  const { data: offer } = await supabase
    .from("offers")
      .select("service, price, message, details, sent_at, prospect_id")
    .eq("tracking_token", token)
    .single();

  if (!offer) return NextResponse.json({ error: "Offre introuvable" }, { status: 404 });

  const { data: prospect } = await supabase
    .from("prospects")
    .select("name, company, email, phone, whatsapp")
    .eq("id", offer.prospect_id)
    .single();

  return NextResponse.json({
    service: offer.service,
      price: offer.price,
      message: offer.message,
      details: offer.details || null,
      sent_at: offer.sent_at,
    prospect_name: prospect?.name || "Client",
    prospect_company: prospect?.company || null,
    prospect_email: prospect?.email || "",
    prospect_phone: prospect?.phone || null,
    prospect_whatsapp: prospect?.whatsapp || null,
  });
}
