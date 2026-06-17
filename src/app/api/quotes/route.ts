import { NextRequest, NextResponse } from "next/server"

const SYMBOLS = [
  { symbol: "^GSPC", name: "S&P 500" },
  { symbol: "^IXIC", name: "NASDAQ" },
  { symbol: "^AEX", name: "AEX" },
  { symbol: "AAPL", name: "Apple" },
  { symbol: "MSFT", name: "Microsoft" },
  { symbol: "NVDA", name: "NVIDIA" },
  { symbol: "TSLA", name: "Tesla" },
  { symbol: "AMZN", name: "Amazon" },
  { symbol: "BTC-USD", name: "Bitcoin" },
  { symbol: "ETH-USD", name: "Ethereum" },
  { symbol: "SOL-USD", name: "Solana" },
  { symbol: "BNB-USD", name: "BNB" },
]

async function fetchQuote(symbol: string, name: string) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=2d`
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
    next: { revalidate: 60 },
  })
  const json = await res.json()
  const meta = json?.chart?.result?.[0]?.meta
  if (!meta) return null

  const price = meta.regularMarketPrice ?? 0
  const prev = meta.chartPreviousClose ?? meta.previousClose ?? price
  const change = price - prev
  const changePercent = prev ? (change / prev) * 100 : 0

  const preMarketPrice = meta.preMarketPrice ?? null
  const preMarketChange = preMarketPrice ? preMarketPrice - price : null
  const preMarketChangePercent = preMarketPrice && price ? ((preMarketPrice - price) / price) * 100 : null

  return {
    symbol,
    name,
    price,
    change,
    changePercent,
    currency: meta.currency ?? "USD",
    preMarketPrice,
    preMarketChange,
    preMarketChangePercent,
    marketState: meta.marketState ?? "REGULAR",
  }
}

export async function GET(req: NextRequest) {
  try {
    const customSymbols = req.nextUrl.searchParams.get("symbols")
    const symbolList = customSymbols
      ? customSymbols.split(",").map((s) => ({ symbol: s.trim(), name: s.trim() }))
      : SYMBOLS

    const results = await Promise.all(
      symbolList.map(({ symbol, name }) => fetchQuote(symbol, name).catch(() => null))
    )
    const quotes = results.filter(Boolean)
    return NextResponse.json(quotes)
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
