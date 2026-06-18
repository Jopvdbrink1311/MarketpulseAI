import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const { positions, quotes, marketData, totalGainPct, riskProfile } = await req.json()

  const portfolioText = positions.length === 0
    ? "De gebruiker heeft nog geen posities in hun portfolio."
    : positions.map((p: { name: string; symbol: string; shares: number; purchase_price: number }) => {
        const q = quotes[p.symbol]
        const currentPrice = q?.price ?? p.purchase_price
        const gainPct = ((currentPrice - p.purchase_price) / p.purchase_price) * 100
        return `- ${p.name} (${p.symbol}): ${gainPct >= 0 ? "+" : ""}${gainPct.toFixed(1)}% rendement`
      }).join("\n")

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 600,
    messages: [{
      role: "user",
      content: `Je bent een directe beleggingsadviseur. Geef een kort, concreet advies wat de gebruiker NU moet doen. Schrijf in simpel Nederlands, geen vakjargon.

Portfolio:
${portfolioText}
Totaal rendement portfolio: ${totalGainPct >= 0 ? "+" : ""}${totalGainPct.toFixed(1)}%
Risicoprofiel: ${riskProfile ?? "gemiddeld"}

Marktoverzicht:
${marketData}

Geef advies in dit formaat:

**Actie:** [één van: Bijkopen / Vasthouden / Gedeeltelijk verkopen / Wachten]

**Waarom:** Leg in 2-3 korte zinnen uit waarom deze actie nu logisch is. Simpele taal.

**Concreet:** Wat precies doen? Noem een specifiek aandeel of ETF als dat relevant is.

Wees direct. Geen "het hangt ervan af". Geef een duidelijk standpunt. Gebruik GEEN emoji's.`,
    }],
  })

  const text = response.content[0].type === "text" ? response.content[0].text : ""
  return NextResponse.json({ advies: text })
}
