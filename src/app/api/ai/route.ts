import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `Tu es un assistant IA intégré dans POPY TECH, un ERP pour une agence de communication.
Tu aides l'équipe à aller plus vite dans leurs tâches quotidiennes.

Tu peux aider avec :
- Rédiger des entrées de journal / comptes rendus
- Créer des descriptions de tâches
- Rédiger des devis et propositions commerciales
- Générer des publications pour les réseaux sociaux (Instagram, Facebook, LinkedIn, TikTok)
- Rédiger des réponses aux avis clients
- Analyser et résumer des données
- Brainstormer des idées créatives pour les clients

Réponds toujours en français. Sois concis, professionnel et adapté au contexte d'une agence de communication.
Quand tu génères du contenu (post, texte, devis), formate-le directement prêt à être copié/collé.`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { context } = body;

    // Accepte soit messages[] soit message (string)
    let messages = body.messages;
    if (!messages || !Array.isArray(messages)) {
      if (body.message && typeof body.message === "string") {
        messages = [{ role: "user", content: body.message }];
      } else {
        return NextResponse.json({ error: "Messages requis" }, { status: 400 });
      }
    }

    const systemContent = context
      ? `${SYSTEM_PROMPT}\n\nContexte actuel : ${context}`
      : SYSTEM_PROMPT;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemContent },
        ...messages,
      ],
      max_tokens: 1500,
      temperature: 0.7,
    });

    const reply = completion.choices[0]?.message?.content ?? "";
    return NextResponse.json({ reply });
  } catch (error: unknown) {
    console.error("AI error:", error);
    const msg = error instanceof Error ? error.message : "Erreur interne";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
