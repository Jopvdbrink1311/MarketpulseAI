import Anthropic from "@anthropic-ai/sdk"
import { NextRequest, NextResponse } from "next/server"

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { messages, marketData } = await req.json()

    const systemPrompt = `Je bent MarketPulse AI, een professionele financieel adviseur. Je helpt gebruikers met vragen over aandelen, markten, beleggen en financiële strategie. Geef duidelijke, eerlijke en onderbouwde adviezen. Spreek Nederlands.

BELANGRIJK: De onderstaande marktdata is LIVE en ECHT, opgehaald van Yahoo Finance op dit moment. Gebruik deze data altijd als basis voor je antwoorden. Zeg NOOIT dat je geen realtime data hebt.

${marketData ? `Live marktdata van Yahoo Finance:\n${marketData}` : "Geen marktdata beschikbaar."}

Houd antwoorden beknopt maar volledig. Gebruik markdown voor opmaak. Gebruik GEEN emoji's.`

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
