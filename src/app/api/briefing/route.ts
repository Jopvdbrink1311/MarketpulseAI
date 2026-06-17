import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const { marketData, news } = await req.json()

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) => toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  let portfolioContext = ""
  if (user) {
    const { data: positions } = await supabase
      .from("portfolio")
      .select("symbol, name, shares, purchase_price")
      .eq("user_id", user.id)

    if (positions && positions.length > 0) {
      portfolioContext = `\nPortfolio van de gebruiker:\n${positions.map(p =>
        `- ${p.name} (${p.symbol}): ${p.shares} aandelen, gekocht op $${p.purchase_price}`
      ).join("\n")}`
    }
  }

  const today = new Date().toLocaleDateString("nl-NL", { weekday: "long", year: "numeric", month: "long", day: "numeric" })

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1200,
    messages: [{
      role: "user",
      content: `Je bent een scherpe financieel analist. Genereer een beknopte dagelijkse marktbriefing voor ${today}.

Live marktdata:
${marketData}

Belangrijkste nieuwsberichten van vandaag:
${news}
${portfolioContext}

Schrijf de briefing in het Nederlands met deze structuur (gebruik ## voor headers):

## Marktoverzicht
Hoe staan de markten er vandaag voor? Wat is de stemming (bull/bear/neutraal)? 2-3 zinnen.

## Belangrijkste bewegingen
Noem 2-3 opvallende koersbewegingen of trends van vandaag met concrete cijfers.

## Wat drijft de markt
De 2 belangrijkste factoren die de markt vandaag bepalen (nieuws, macro, sentiment).
${portfolioContext ? `
## Relevant voor jouw portfolio
Wat betekent het nieuws van vandaag specifiek voor de posities in het portfolio? Wees direct.` : ""}

## Kans van de dag
1 specifiek aandeel, ETF of sector die vandaag interessant is, met korte onderbouwing.

Wees scherp en direct. Geen vage taal. Gebruik GEEN emoji's.`,
    }],
  })

  const text = response.content[0].type === "text" ? response.content[0].text : ""
  return NextResponse.json({ briefing: text })
}
