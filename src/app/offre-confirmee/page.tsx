"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

interface OfferData {
  service: string;
  price: number;
  message: string;
  details: string | null;
  sent_at: string;
  prospect_name: string;
  prospect_company: string | null;
  prospect_email: string;
  prospect_phone: string | null;
  prospect_whatsapp: string | null;
}

function OffreContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const response = searchParams.get("response"); // "accepted" | "refused"
  const [offer, setOffer] = useState<OfferData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [responding, setResponding] = useState(false);

  const handleRespond = async (action: "accept" | "refuse") => {
    if (!token || responding) return;
    setResponding(true);
    try {
      const res = await fetch(`/api/marketing/offer-respond?token=${token}&action=${action}`);
      // The API redirects, so we follow the final URL
      if (res.redirected) {
        window.location.href = res.url;
      } else {
        window.location.href = `/offre-confirmee?token=${token}&response=${action === "accept" ? "accepted" : "refused"}`;
      }
    } catch {
      window.location.href = `/offre-confirmee?token=${token}&response=${action === "accept" ? "accepted" : "refused"}`;
    }
  };

  useEffect(() => {
    if (!token) {
      setError("Lien invalide.");
      setLoading(false);
      return;
    }
    fetch(`/api/marketing/offer-by-token?token=${token}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setOffer(data);
      })
      .catch(() => setError("Impossible de charger l'offre."))
      .finally(() => setLoading(false));
  }, [token]);

  const fmt = (n: number) =>
    n.toLocaleString("fr-FR") + " GNF";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f4f6fa]">
        <div className="animate-pulse text-gray-400 text-lg">Chargement de l'offre…</div>
      </div>
    );
  }

  if (error || !offer) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f4f6fa]">
        <div className="bg-white rounded-2xl shadow-lg p-12 text-center max-w-md">
          <div className="text-5xl mb-4">🔗</div>
          <h1 className="text-xl font-bold text-gray-800 mb-2">Lien expiré ou invalide</h1>
          <p className="text-gray-500">Ce lien n'est plus disponible. Contactez-nous directement.</p>
          <a
            href="mailto:contact@popytech.com"
            className="mt-6 inline-block bg-blue-600 text-white px-6 py-3 rounded-full font-semibold hover:bg-blue-700 transition-colors"
          >
            Nous contacter
          </a>
        </div>
      </div>
    );
  }

  const sentDate = new Date(offer.sent_at).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="min-h-screen bg-[#f4f6fa] py-10 px-4">
      <div className="max-w-2xl mx-auto">

        {/* Response banner */}
        {response === "accepted" && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-5 mb-6 flex items-center gap-4">
            <div className="text-3xl">🎉</div>
            <div>
              <p className="font-bold text-green-800 text-base">Offre acceptée !</p>
              <p className="text-green-600 text-sm">Merci ! Notre équipe vous contactera très prochainement pour démarrer.</p>
            </div>
          </div>
        )}
        {response === "refused" && (
          <div className="bg-gray-100 border border-gray-200 rounded-2xl p-5 mb-6 flex items-center gap-4">
            <div className="text-3xl">👋</div>
            <div>
              <p className="font-bold text-gray-700 text-base">Offre déclinée</p>
              <p className="text-gray-500 text-sm">Nous en prenons note. N'hésitez pas à nous recontacter si vous changez d'avis.</p>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="rounded-2xl overflow-hidden shadow-xl mb-6">
          <div className="bg-gradient-to-r from-blue-600 to-purple-700 px-8 py-10 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-full mb-4">
              <svg width="32" height="32" fill="none" viewBox="0 0 24 24">
                <path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h1 className="text-3xl font-extrabold text-white mb-1">Popytech</h1>
            <p className="text-white/70 text-sm">Proposition commerciale • {sentDate}</p>
          </div>

          {/* Body */}
          <div className="bg-white px-8 py-8">
              <p className="text-gray-700 text-base mb-1">
                Bonjour{" "}
                <span className="font-bold text-gray-900">
                  {offer.prospect_name}
                  {offer.prospect_company ? ` de ${offer.prospect_company}` : ""}
                </span>
                ,
              </p>
              <p className="text-gray-400 text-sm mb-6">
                Voici le détail complet de notre proposition commerciale pour vous.
              </p>
                {/* Offer card */}
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 mb-6">
                <p className="text-xs font-bold text-blue-500 uppercase tracking-widest mb-1">Service proposé</p>
                <p className="text-xl font-bold text-gray-900 mb-4">{offer.service}</p>
                <hr className="border-blue-100 mb-4" />
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Investissement</p>
                <p className="text-4xl font-extrabold text-blue-600">{fmt(offer.price)}</p>
              </div>

              {/* Details */}
              {offer.details ? (
                <div className="mb-6">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Ce qui est inclus</p>
                  <div className="space-y-2">
                    {offer.details.split("\n").filter(Boolean).map((line, i) => {
                      const isBullet = line.trim().startsWith("•") || line.trim().startsWith("-") || line.trim().startsWith("*");
                      const text = isBullet ? line.trim().replace(/^[•\-*]\s*/, "") : line.trim();
                      return (
                        <div key={i} className={`flex items-start gap-3 ${isBullet ? "bg-gray-50 rounded-lg px-4 py-2.5" : "px-1 py-1"}`}>
                          {isBullet && (
                            <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                                <path d="M1 4L3.5 6.5L9 1" stroke="#3B82F6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </div>
                          )}
                          <p className={`text-sm ${isBullet ? "text-gray-700 font-medium" : "text-gray-500"}`}>{text}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="mb-6 bg-yellow-50 border border-yellow-100 rounded-xl px-5 py-4">
                  <p className="text-sm text-yellow-700">Pour plus de détails sur cette offre, contactez-nous directement.</p>
                </div>
              )}

              {/* Accept / Refuse */}
              {!response && (
                <div className="flex flex-col sm:flex-row gap-3 mb-6">
                  <button
                    onClick={() => handleRespond("accept")}
                    disabled={responding}
                    className="flex-1 text-center bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold py-3 px-6 rounded-full hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-wait"
                  >
                    {responding ? "Traitement…" : "✓ Accepter l'offre"}
                  </button>
                  <button
                    onClick={() => handleRespond("refuse")}
                    disabled={responding}
                    className="flex-1 text-center bg-gray-100 text-gray-600 font-bold py-3 px-6 rounded-full hover:bg-gray-200 transition-colors disabled:opacity-60 disabled:cursor-wait"
                  >
                    Décliner
                  </button>
                </div>
              )}

            <p className="text-gray-400 text-sm text-center leading-relaxed">
              Des questions ? Contactez-nous directement :<br />
              <a href="mailto:contact@popytech.com" className="text-blue-500 hover:underline">
                contact@popytech.com
              </a>
              {offer.prospect_whatsapp && (
                <>
                  {" · "}
                  <a
                    href={`https://wa.me/${offer.prospect_whatsapp.replace(/\D/g, "")}`}
                    className="text-green-500 hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    WhatsApp
                  </a>
                </>
              )}
            </p>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 border-t border-gray-100 px-8 py-6 text-center">
            <p className="text-xs text-gray-500 font-semibold mb-1">Popytech Agency</p>
            <p className="text-xs text-gray-400 mb-4">Agence de communication & marketing digital — Conakry, Guinée</p>

            {/* Icônes réseaux sociaux */}
            <div className="flex items-center justify-center gap-3 mb-4">
              <a
                href="https://popytech.com"
                target="_blank"
                rel="noopener noreferrer"
                title="Site web"
                className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center hover:bg-indigo-100 transition-colors"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                </svg>
              </a>
              <a
                href="https://www.facebook.com/popytech"
                target="_blank"
                rel="noopener noreferrer"
                title="Facebook"
                className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center hover:bg-blue-100 transition-colors"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#1877F2">
                  <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073c0 6.026 4.388 11.022 10.125 11.927v-8.437H7.078v-3.49h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.49h-2.796v8.437C19.612 23.095 24 18.1 24 12.073z"/>
                </svg>
              </a>
              <a
                href="https://www.linkedin.com/company/popytech"
                target="_blank"
                rel="noopener noreferrer"
                title="LinkedIn"
                className="w-9 h-9 rounded-lg bg-sky-50 flex items-center justify-center hover:bg-sky-100 transition-colors"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#0A66C2">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
              </a>
              <a
                href="https://wa.me/224629371360"
                target="_blank"
                rel="noopener noreferrer"
                title="WhatsApp — Message direct"
                className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center hover:bg-green-100 transition-colors"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#25D366">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
                </svg>
              </a>
            </div>

            <p className="text-xs text-gray-300">Vous recevez cet email car vous avez été contacté par notre équipe commerciale.</p>
          </div>
        </div>

      </div>
    </div>
  );
}

export default function OffreConfirmeePage() {
  return (
    <Suspense>
      <OffreContent />
    </Suspense>
  );
}
