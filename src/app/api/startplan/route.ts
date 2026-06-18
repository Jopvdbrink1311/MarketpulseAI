import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const { doel, horizon, bedrag, risico } = await req.json()

  const doelLabels: Record<string, string> = {
    pensioen: "sparen voor pensioen op lange termijn",
    huis: "sparen voor een huis",
    groei: "vermogen laten groeien",
    passief: "passief inkomen via dividenden",
    leren: "leren beleggen zonder groot doel",
  }

  const horizonLabels: Record<string, string> = {
    kort: "minder dan 3 jaar",
    middel: "3 tot 10 jaar",
    lang: "meer dan 10 jaar",
  }

  const bedragLabels: Record<string, string> = {
    klein: "minder dan €500 per maand",
    middel: "€500 tot €1000 per maand",
    groot: "meer dan €1000 per maand",
  }

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1200,
    messages: [{
      role: "user",
      content: `Je bent een toegankelijke beleggingsadviseur voor beginners. Geef een persoonlijk startplan in simpel Nederlands — geen jargon, geen ingewikkelde termen.

Profiel van de belegger:
- Doel: ${doelLabels[doel] ?? doel}
- Tijdshorizon: ${horizonLabels[horizon] ?? horizon}
- Maandelijks bedrag: ${bedragLabels[bedrag] ?? bedrag}
- Risicoprofiel: ${risico}

Schrijf een persoonlijk startplan met deze structuur (gebruik ## voor headers):

## Jouw startplan
Leg in 2-3 zinnen uit wat het beste past bij dit profiel. Spreek de persoon direct aan met "jij/jouw".

## Stap 1 — Begin hiermee
Noem 1 of 2 concrete producten (ETF of aandeel met naam en ticker) om mee te starten. Leg in 1 zin uit waarom, zonder jargon.

## Stap 2 — Spreid verder
Geef 1 extra toevoeging als ze iets meer willen doen. Simpel houden.

## Wat te verwachten
Realistische verwachting van rendement op hun tijdshorizon. Eerlijk maar niet ontmoedigend.

## Gouden regel
1 simpele beleggingsregel die ze altijd moeten onthouden.

Schrijf alsof je een slimme vriend bent die uitlegt hoe het werkt. Geen disclaimers. Gebruik GEEN emoji's.`,
    }],
  })

  const text = response.content[0].type === "text" ? response.content[0].text : ""
  return NextResponse.json({ plan: text })
}
