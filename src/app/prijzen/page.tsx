"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { TIERS } from "@/lib/prijzen"

export default function PrijzenPage() {
  const router = useRouter()
  const [loadingTier, setLoadingTier] = useState<string | null>(null)

  async function startBetaling(tierId: string, priceId: string) {
    setLoadingTier(tierId)
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId, tierId }),
      })
      const data = await res.json()
      if (data.error === "Niet ingelogd") {
        router.push("/login")
        return
      }
      if (data.url) window.location.href = data.url
    } catch {
      alert("Er ging iets mis. Probeer het opnieuw.")
    } finally {
      setLoadingTier(null)
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-16 text-white">
      <div className="text-center mb-14">
        <h1 className="text-4xl font-bold mb-4">Kies jouw plan</h1>
        <p className="text-gray-400 text-lg max-w-xl mx-auto">
          Begin gratis en upgrade wanneer je klaar bent voor meer. Geen verborgen kosten, altijd opzegbaar.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {TIERS.map(tier => (
          <div
            key={tier.id}
            className={`relative rounded-2xl p-7 flex flex-col ${
              tier.highlighted
                ? "bg-blue-600/10 border-2 border-blue-500"
                : "bg-gray-900 border border-gray-800"
            }`}
          >
            {tier.highlighted && (
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                <span className="bg-blue-600 text-white text-xs font-semibold px-4 py-1 rounded-full">
                  Meest gekozen
                </span>
              </div>
            )}

            <div className="mb-6">
              <h2 className="text-xl font-bold mb-1">{tier.naam}</h2>
              <p className="text-gray-400 text-sm">{tier.beschrijving}</p>
            </div>

            <div className="mb-8">
              {tier.prijs === 0 ? (
                <p className="text-4xl font-bold">Gratis</p>
              ) : (
                <div className="flex items-end gap-1">
                  <p className="text-4xl font-bold">€{tier.prijs.toFixed(2).replace(".", ",")}</p>
                  <p className="text-gray-400 mb-1.5">/maand</p>
                </div>
              )}
            </div>

            <ul className="space-y-3 mb-8 flex-1">
              {tier.features.map(f => (
                <li key={f} className="flex items-start gap-2.5 text-sm">
                  <svg className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-300">{f}</span>
                </li>
              ))}
            </ul>

            {tier.prijs === 0 ? (
              <button
                onClick={() => router.push("/dashboard")}
                className="w-full py-3 rounded-xl font-semibold border border-gray-700 hover:border-gray-500 text-gray-300 hover:text-white transition-colors"
              >
                Begin gratis
              </button>
            ) : tier.stripePriceId ? (
              <button
                onClick={() => startBetaling(tier.id, tier.stripePriceId!)}
                disabled={loadingTier === tier.id}
                className={`w-full py-3 rounded-xl font-semibold transition-colors disabled:opacity-50 ${
                  tier.highlighted
                    ? "bg-blue-600 hover:bg-blue-500 text-white"
                    : "bg-gray-800 hover:bg-gray-700 text-white"
                }`}
              >
                {loadingTier === tier.id ? "Laden..." : `Start ${tier.naam}`}
              </button>
            ) : (
              <button
                disabled
                className="w-full py-3 rounded-xl font-semibold bg-gray-800 text-gray-500 cursor-not-allowed"
              >
                Binnenkort beschikbaar
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
        {[
          { icon: "🔒", titel: "Veilig betalen", tekst: "Via Stripe, de betaalprovider van Shopify en Amazon" },
          { icon: "↩️", titel: "Altijd opzegbaar", tekst: "Geen contract, stop wanneer je wil" },
          { icon: "💶", titel: "Geen verborgen kosten", tekst: "Wat je ziet is wat je betaalt" },
        ].map(item => (
          <div key={item.titel} className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <p className="text-2xl mb-2">{item.icon}</p>
            <p className="font-semibold mb-1">{item.titel}</p>
            <p className="text-gray-400 text-sm">{item.tekst}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
