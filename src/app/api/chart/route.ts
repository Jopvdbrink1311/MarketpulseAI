import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol")
  const range = req.nextUrl.searchParams.get("range") ?? "1mo"

  if (!symbol) return NextResponse.json({ error: "No symbol" }, { status: 400 })

  const intervalMap: Record<string, string> = {
    "1d": "5m",
    "5d": "15m",
    "1mo": "1d",
    "3mo": "1d",
    "1y": "1wk",
  }

  const interval = intervalMap[range] ?? "1d"
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}&range=${range}`

  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
    next: { revalidate: 300 },
  })

  const json = await res.json()
  const result = json?.chart?.result?.[0]
  if (!result) return NextResponse.json({ error: "No data" }, { status: 404 })

  const timestamps: number[] = result.timestamp ?? []
  const closes: number[] = result.indicators?.quote?.[0]?.close ?? []

  const data = timestamps
    .map((ts, i) => ({
      date: new Date(ts * 1000).toLocaleDateString("nl-NL", { day: "numeric", month: "short" }),
      price: closes[i] ? parseFloat(closes[i].toFixed(2)) : null,
    }))
    .filter((d) => d.price !== null)

  return NextResponse.json({ data, currency: result.meta?.currency ?? "USD" })
}
