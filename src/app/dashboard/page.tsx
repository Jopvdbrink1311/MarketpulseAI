"use client"

import { useEffect, useState } from "react"
import { SparklineChart } from "@/components/sparkline"
import StockChart from "@/components/stock-chart"
import Link from "next/link"

type Quote = {
  symbol: string
  name: string
  price: number
  change: number
  changePercent: number
  currency: string
  preMarketPrice: number | null
  preMarketChange: number | null
  preMarketChangePercent: number | null
  marketState: string
}

type NewsArticle = {
  title: string
  summary: string
  sentiment: "positief" | "negatief" | "neutraal"
  url?: string
}

type Opportunity = {
  symbol: string
  name: string
  type: "Koop" | "Afwachten" | "Vermijd"
  confidence: number
  reason: string
  horizon: string
}

const INDICES = ["^GSPC", "^IXIC", "^AEX"]
const STOCKS = ["AAPL", "MSFT", "NVDA", "TSLA", "AMZN"]
const CRYPTO = ["BTC-USD", "ETH-USD", "SOL-USD", "BNB-USD"]

function fmt(price: number, currency: string) {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: currency === "EUR" ? "EUR" : "USD",
    minimumFractionDigits: 2,
  }).format(price)
}

function IndexCard({ quote, onClick }: { quote: Quote; onClick: () => void }) {
  const pos = quote.change >= 0
  return (
    <div onClick={onClick} className="relative bg-gray-900 border border-gray-800 hover:border-gray-600 rounded-2xl p-6 cursor-pointer transition-all hover:scale-[1.01] overflow-hidden group">
      <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity ${pos ? "bg-green-500/5" : "bg-red-500/5"}`} />
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-gray-500 text-xs font-medium uppercase tracking-widest">{quote.symbol.replace("^", "")}</p>
          <p className="text-white font-semibold mt-0.5">{quote.name}</p>
        </div>
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${pos ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400"}`}>
          {pos ? "▲" : "▼"} {Math.abs(quote.changePercent).toFixed(2)}%
        </span>
      </div>
      <p className="text-3xl font-bold tracking-tight">{fmt(quote.price, quote.currency)}</p>
      <p className={`text-sm mt-1 font-medium ${pos ? "text-green-400" : "text-red-400"}`}>
        {pos ? "+" : ""}{fmt(quote.change, quote.currency)} vandaag
      </p>
      <div className="mt-4">
        <SparklineChart symbol={quote.symbol} positive={pos} />
      </div>
      {quote.marketState === "PRE" && quote.preMarketPrice && (
        <div className="mt-3 pt-3 border-t border-gray-800 flex justify-between text-xs">
          <span className="text-gray-500">Pre-market</span>
          <span className={`font-medium ${(quote.preMarketChangePercent ?? 0) >= 0 ? "text-green-400" : "text-red-400"}`}>
            {fmt(quote.preMarketPrice, quote.currency)} ({(quote.preMarketChangePercent ?? 0) >= 0 ? "+" : ""}{quote.preMarketChangePercent?.toFixed(2)}%)
          </span>
        </div>
      )}
    </div>
  )
}

function StockRow({ quote, onClick }: { quote: Quote; onClick: () => void }) {
  const pos = quote.change >= 0
  return (
    <div onClick={onClick} className="bg-gray-900 border border-gray-800 hover:border-gray-600 rounded-xl px-5 py-4 cursor-pointer transition-all hover:scale-[1.005] flex items-center gap-4 group">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${pos ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
        {quote.symbol.slice(0, 2)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm truncate">{quote.name}</p>
        <p className="text-gray-500 text-xs">{quote.symbol}</p>
      </div>
      <div className="w-20 shrink-0">
        <SparklineChart symbol={quote.symbol} positive={pos} height={32} />
      </div>
      <div className="text-right shrink-0">
        <p className="font-bold text-sm">{fmt(quote.price, quote.currency)}</p>
        <p className={`text-xs font-medium ${pos ? "text-green-400" : "text-red-400"}`}>
          {pos ? "+" : ""}{quote.changePercent.toFixed(2)}%
        </p>
      </div>
    </div>
  )
}

function MarketSummary({ quotes }: { quotes: Quote[] }) {
  const gainers = quotes.filter(q => q.changePercent > 0).length
  const losers = quotes.filter(q => q.changePercent < 0).length
  const now = new Date().toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })
  return (
    <div className="grid grid-cols-3 gap-4 mb-8">
      <div className="bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3 text-center">
        <p className="text-2xl font-bold text-green-400">{gainers}</p>
        <p className="text-xs text-gray-400 mt-0.5">Stijgers</p>
      </div>
      <div className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-center">
        <p className="text-2xl font-bold text-white">{now}</p>
        <p className="text-xs text-gray-400 mt-0.5">Laatste update</p>
      </div>
      <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-center">
        <p className="text-2xl font-bold text-red-400">{losers}</p>
        <p className="text-xs text-gray-400 mt-0.5">Dalers</p>
      </div>
    </div>
  )
}

const sentimentColor = {
  positief: "text-green-400",
  negatief: "text-red-400",
  neutraal: "text-gray-400",
}

const typeStyle = {
  Koop: "bg-green-500/15 text-green-400 border-green-500/20",
  Afwachten: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
  Vermijd: "bg-red-500/15 text-red-400 border-red-500/20",
}

export default function DashboardPage() {
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null)
  const [news, setNews] = useState<NewsArticle[]>([])
  const [newsLoading, setNewsLoading] = useState(true)
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [oppsLoading, setOppsLoading] = useState(false)

  function load() {
    setLoading(true)
    setError("")
    fetch("/api/quotes")
      .then((r) => r.json())
      .then((data) => {
        if (!Array.isArray(data)) throw new Error(data.error ?? "Onbekende fout")
        setQuotes(data)
        const marketData = data.map((q: Quote) =>
          `${q.name}: ${q.price.toFixed(2)} (${q.changePercent >= 0 ? "+" : ""}${q.changePercent.toFixed(2)}%)`
        ).join("\n")
        setOppsLoading(true)
        fetch("/api/opportunities", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ marketData }),
        })
          .then(r => r.json())
          .then(setOpportunities)
          .finally(() => setOppsLoading(false))
      })
      .catch(() => setError("Kon geen data ophalen."))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    setNewsLoading(true)
    fetch("/api/news")
      .then(r => r.json())
      .then(d => setNews(d.articles?.slice(0, 4) ?? []))
      .finally(() => setNewsLoading(false))
  }, [])

  const indices = quotes.filter((q) => INDICES.includes(q.symbol))
  const stocks = quotes.filter((q) => STOCKS.includes(q.symbol))
  const crypto = quotes.filter((q) => CRYPTO.includes(q.symbol))

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      {selectedQuote && (
        <StockChart symbol={selectedQuote.symbol} name={selectedQuote.name} onClose={() => setSelectedQuote(null)} />
      )}

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-gray-400 text-sm mt-1">Klik op een kaart voor de grafiek</p>
        </div>
        <button onClick={load} disabled={loading} className="text-sm text-gray-400 hover:text-white transition-colors disabled:opacity-50">
          ↻ Vernieuwen
        </button>
      </div>

      {loading && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4 mb-8">
            {[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-gray-900 rounded-xl animate-pulse" />)}
          </div>
          <div className="grid grid-cols-3 gap-4 mb-8">
            {[...Array(3)].map((_, i) => <div key={i} className="h-48 bg-gray-900 rounded-2xl animate-pulse" />)}
          </div>
        </div>
      )}

      {error && <div className="text-red-400 text-center py-20">{error}</div>}

      {!loading && !error && (
        <>
          <MarketSummary quotes={quotes} />

          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">Indices</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
            {indices.map((q) => <IndexCard key={q.symbol} quote={q} onClick={() => setSelectedQuote(q)} />)}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
            {/* Aandelen */}
            <div>
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">Aandelen</h2>
              <div className="space-y-3">
                {stocks.map((q) => <StockRow key={q.symbol} quote={q} onClick={() => setSelectedQuote(q)} />)}
              </div>
            </div>

            {/* AI Kansen */}
            <div>
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">AI Beleggingskansen</h2>
              {oppsLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-gray-900 rounded-xl animate-pulse" />)}
                </div>
              ) : (
                <div className="space-y-3">
                  {opportunities.map((opp, i) => (
                    <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm">{opp.symbol}</span>
                          <span className="text-gray-500 text-xs">{opp.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">{opp.confidence}%</span>
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${typeStyle[opp.type]}`}>
                            {opp.type}
                          </span>
                        </div>
                      </div>
                      <p className="text-gray-400 text-xs">{opp.reason}</p>
                      <p className="text-gray-600 text-xs mt-1">{opp.horizon}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Crypto */}
          <div className="mb-10">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">Crypto</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {crypto.map((q) => (
                <div key={q.symbol} onClick={() => setSelectedQuote(q)}
                  className="bg-gray-900 border border-gray-800 hover:border-gray-600 rounded-xl p-4 cursor-pointer transition-all hover:scale-[1.01]">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="text-gray-500 text-xs uppercase tracking-wide">{q.symbol.replace("-USD", "")}</p>
                      <p className="text-sm font-semibold text-white">{q.name}</p>
                    </div>
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${q.changePercent >= 0 ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400"}`}>
                      {q.changePercent >= 0 ? "▲" : "▼"} {Math.abs(q.changePercent).toFixed(2)}%
                    </span>
                  </div>
                  <p className="text-xl font-bold text-white">{fmt(q.price, "USD")}</p>
                  <div className="mt-2">
                    <SparklineChart symbol={q.symbol} positive={q.changePercent >= 0} height={36} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Nieuws */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Laatste Nieuws</h2>
              <Link href="/news" className="text-xs text-blue-400 hover:text-blue-300">Alles zien →</Link>
            </div>
            {newsLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-gray-900 rounded-xl animate-pulse" />)}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {news.map((article, i) => (
                  <a key={i} href={article.url ?? "#"} target="_blank" rel="noopener noreferrer"
                    className="bg-gray-900 border border-gray-800 hover:border-gray-600 rounded-xl p-4 transition-colors block">
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <p className="text-sm font-medium leading-snug line-clamp-2">{article.title}</p>
                      <span className={`shrink-0 text-xs font-medium ${sentimentColor[article.sentiment]}`}>
                        {article.sentiment === "positief" ? "▲" : article.sentiment === "negatief" ? "▼" : "●"}
                      </span>
                    </div>
                    <p className="text-gray-500 text-xs line-clamp-2">{article.summary}</p>
                  </a>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
