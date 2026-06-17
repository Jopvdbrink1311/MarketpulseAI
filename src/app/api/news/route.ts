import { NextResponse } from "next/server"
import { XMLParser } from "fast-xml-parser"
import Anthropic from "@anthropic-ai/sdk"

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const RSS_FEEDS = [
  "https://finance.yahoo.com/news/rssindex",
  "https://feeds.finance.yahoo.com/rss/2.0/headline?s=^GSPC,^IXIC,AAPL,MSFT,NVDA,TSLA,AMZN&region=US&lang=en-US",
]

type RawItem = {
  title: string
  description?: string
  link: string
  pubDate: string
}

async function fetchRSS(url: string): Promise<RawItem[]> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
    })
    const xml = await res.text()
    const parser = new XMLParser()
    const json = parser.parse(xml)
    const items = json?.rss?.channel?.item ?? []
    return Array.isArray(items) ? items : [items]
  } catch {
    return []
  }
}

export async function GET() {
  const allItems = (await Promise.all(RSS_FEEDS.map(fetchRSS))).flat()

  const seen = new Set<string>()
  const unique = allItems.filter((item) => {
    if (seen.has(item.title)) return false
    seen.add(item.title)
    return true
  })

  const top20 = unique.slice(0, 20)

  const nieuwsLijst = top20
    .map((item, i) => `${i + 1}. [URL: ${item.link}]\nTitel: ${item.title}\n${item.description ?? ""}`)
    .join("\n\n")

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: `Dit zijn de laatste financiële nieuwsberichten. Selecteer de 6 belangrijkste voor een belegger en geef van elk:
- Een duidelijke Nederlandse titel
- Een samenvatting van 2-3 zinnen in het Nederlands
- Een sentiment: "positief", "negatief" of "neutraal"
- De originele URL (kopieer exact uit [URL: ...])

Geef je antwoord als JSON array met dit formaat:
[{ "title": "...", "summary": "...", "sentiment": "positief", "url": "https://..." }]

Nieuwsberichten:
${nieuwsLijst}`,
      },
    ],
  })

  const text = response.content[0].type === "text" ? response.content[0].text : "[]"

  let articles = []
  try {
    const match = text.match(/\[[\s\S]*\]/)
    articles = match ? JSON.parse(match[0]) : []
  } catch {
    articles = []
  }

  return NextResponse.json(
    { articles, updatedAt: new Date().toISOString() },
    { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=60" } }
  )
}
