import Anthropic from "@anthropic-ai/sdk"
import { NextRequest, NextResponse } from "next/server"

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { messages, marketData, riskProfile } = await req.json()

    const riskContext = riskProfile === "hoog"
      ? "De gebruiker heeft een HOOG risicoprofiel. Geef gerust advies over groeiaandelen, technologie, crypto, kleine bedrijven en geconcentreerde posities. Wees niet terughoudend."
      : riskProfile === "laag"
      ? "De gebruiker heeft een LAAG risicoprofiel. Focus op dividendaandelen, ETFs, obligaties en stabiele blue chips. Waarschuw expliciet bij risicovolle opties."
      : "De gebruiker heeft een GEMIDDELD risicoprofiel. Balanceer groei en stabiliteit. Mix van ETFs, grote aandelen en beperkte groeipositties."

    const systemPrompt = `Je bent MarketPulse AI, een directe en scherpe financieel adviseur. Geen omwegen, geen vage antwoorden — geef concrete meningen en specifieke aanbevelingen. Als iets een slecht idee is, zeg dat dan. Als iets een goed moment is om te kopen, zeg dat dan met reden.

Risicoprofiel van de gebruiker: ${riskProfile ?? "gemiddeld"}
${riskContext}

BELANGRIJK: De onderstaande marktdata is LIVE en ECHT, opgehaald van Yahoo Finance op dit moment. Gebruik deze data als basis. Zeg NOOIT dat je geen realtime data hebt — je hebt het wel.

${marketData ? `Live marktdata van Yahoo Finance:\n${marketData}` : "Geen marktdata beschikbaar."}

Regels:
- Spreek Nederlands
- Gebruik markdown voor opmaak (vet, lijsten, tabellen waar nuttig)
- Gebruik GEEN emoji's
- Geen onnodige disclaimers of "raadpleeg een adviseur" — jij bent de adviseur
- Geef altijd een concreet standpunt, geen "het hangt ervan af" zonder uitleg
- Houd antwoorden gefocust, niet langer dan nodig`

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    })

    const text = response.content[0].type === "text" ? response.content[0].text : ""
    return NextResponse.json({ text })
  } catch (error: unknown) {
    console.error("Anthropic error:", JSON.stringify(error, null, 2))
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
