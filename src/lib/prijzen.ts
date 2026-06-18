export type Tier = {
  id: string
  naam: string
  prijs: number
  beschrijving: string
  features: string[]
  highlighted: boolean
  stripePriceId: string | null
}

export const TIERS: Tier[] = [
  {
    id: "gratis",
    naam: "Gratis",
    prijs: 0,
    beschrijving: "Voor iedereen die wil beginnen",
    stripePriceId: null,
    highlighted: false,
    features: [
      "Live marktdata (dashboard)",
      "Watchlist (max 5 aandelen)",
      "AI Nieuws (dagelijks)",
      "Papierbeleggen",
      "Onboarding startplan",
    ],
  },
  {
    id: "pro",
    naam: "Pro",
    prijs: 9.99,
    beschrijving: "Voor de serieuze belegger",
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO ?? null,
    highlighted: true,
    features: [
      "Alles van Gratis",
      "Portfolio tracker (onbeperkt)",
      "AI Adviseur (onbeperkt)",
      "Prijsalerts (onbeperkt)",
      "Dagelijkse AI Briefing",
      "Benchmark vergelijking",
      "AI Portfolio Analyse",
    ],
  },
  {
    id: "elite",
    naam: "Elite",
    prijs: 24.99,
    beschrijving: "Voor maximale inzichten",
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ELITE ?? null,
    highlighted: false,
    features: [
      "Alles van Pro",
      "\"Wat moet ik doen?\" knop",
      "Meerdere risicoprofielen",
      "Prioriteit AI-antwoorden",
      "Early access nieuwe features",
      "Directe support",
    ],
  },
]
