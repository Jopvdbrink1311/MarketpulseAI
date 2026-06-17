import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")
  if (!q) return NextResponse.json([])

  const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&newsCount=0&quotesCount=8`
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } })
  const json = await res.json()

  const results = (json?.quotes ?? [])
    .filter((q: { quoteType: string }) => q.quoteType === "EQUITY" || q.quoteType === "INDEX" || q.quoteType === "ETF")
    .slice(0, 6)
    .map((q: { symbol: string; shortname?: string; longname?: string; exchange?: string }) => ({
      symbol: q.symbol,
      name: q.shortname ?? q.longname ?? q.symbol,
      exchange: q.exchange ?? "",
    }))

  return NextResponse.json(results)
}
