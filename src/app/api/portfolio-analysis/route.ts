import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const { positions, quotes, totalInvested, totalValue, totalGainPct, riskProfile } = await req.json()

  const riskLabel = riskProfile === "hoog" ? "Hoog (groeigericht, volatiliteit acceptabel)"
    : riskProfile === "laag" ? "Laag (kapitaalbehoud, stabiele inkomsten)"
    : "Gemiddeld (balans groei en stabiliteit)"

  const portfolioSummary = positions.map((p: {
    name: string; symbol: string; shares: number; purchase_price: number
  }) => {
    const q = quotes[p.symbol]
    const currentPrice = q?.price ?? p.purchase_price
    const value = p.shares * currentPrice
    const gain = value - p.shares * p.purchase_price
    const gainPct = (gain / (p.shares * p.purchase_price)) * 100
    return `- ${p.name} (${p.symbol}): ${p.shares} aandelen, aankoopprijs $${p.purchase_price.toFixed(2)}, huidige prijs $${currentPrice.toFixed(2)}, rendement ${gainPct >= 0 ? "+" : ""}${gainPct.toFixed(2)}%, waarde $${value.toFixed(2)}`
  }).join("\n")

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1500,
    messages: [{
      role: "user",
      content: `Je bent een directe, scherpe financieel adviseur. Geen vage taal — geef concrete meningen en specifieke acties.

Risicoprofiel van de belegger: ${riskLabel}

Portfolio overzicht:
${portfolioSummary}

Totaal geïnvesteerd: $${totalInvested.toFixed(2)}
Totale waarde: $${totalValue.toFixed(2)}
Totaal rendement: ${totalGainPct >= 0 ? "+" : ""}${totalGainPct.toFixed(2)}%

Analyseer dit portfolio op basis van het risicoprofiel. Geef een analyse in het Nederlands met deze secties (gebruik ## voor headers):

## Overzicht
Beoordeel het portfolio in 2-3 zinnen. Geef ook een rapportcijfer (1-10) met uitleg.

## Fit met risicoprofiel
Past dit portfolio bij het risicoprofiel van de belegger? Wat klopt wel/niet?

## Sterke punten
Wat gaat goed?

## Risico's & zwakke plekken
Wees eerlijk en direct. Noem concentratierisico, sectorblootstelling, volatiliteit.

## Concrete aanbevelingen
Geef 3-4 specifieke acties (bijkopen, verkopen, spreiden, toevoegen). Noem bij voorkeur concrete aandelen of ETFs.

## Conclusie
1 zin. Wat is de belangrijkste actie die de belegger nu moet nemen?

Geen disclaimers. Geen "raadpleeg een adviseur". Jij bent de adviseur. Wees direct.`,
    }],
  })

  const text = response.content[0].type === "text" ? response.content[0].text : ""
  return NextResponse.json({ analysis: text })
}
