import { NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: Request) {
  const { marketData } = await req.json()

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `Je bent een ervaren financieel analist. Analyseer de onderstaande live marktdata en geef 3 concrete beleggingskansen voor vandaag.

Live marktdata:
${marketData}

Geef je antwoord als JSON array:
[{
  "symbol": "AAPL",
  "name": "Apple",
  "type": "Koop" | "Afwachten" | "Vermijd",
  "confidence": 85,
  "reason": "Korte reden in 1 zin",
  "horizon": "Kort (dagen)" | "Middellang (weken)" | "Lang (maanden)"
}]

Baseer je analyse puur op de huidige koersbewegingen en percentages. Geen disclaimers.`,
      },
    ],
  })

  const text = response.content[0].type === "text" ? response.content[0].text : "[]"
  let opportunities = []
  try {
    const match = text.match(/\[[\s\S]*\]/)
    opportunities = match ? JSON.parse(match[0]) : []
  } catch { opportunities = [] }

  return NextResponse.json(opportunities, {
    headers: { "Cache-Control": "public, s-maxage=1800" }
  })
}
