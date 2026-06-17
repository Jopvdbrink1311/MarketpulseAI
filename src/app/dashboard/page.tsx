"use client"

import { useEffect, useState } from "react"
import StockChart from "@/components/stock-chart"

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

const INDICES = ["^GSPC", "^IXIC", "^AEX"]
const STOCKS = ["AAPL", "MSFT", "NVDA", "TSLA", "AMZN"]

function formatPrice(price: number, currency: string) {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: currency === "EUR" ? "EUR" : "USD",
    minimumFractionDigits: 2,
  }).format(price)
}

function QuoteCard({ quote, onClick }: { quote: Quote; onClick: () => void }) {
  const isPositive = quote.change >= 0
  const isPreMarket = quote.marketState === "PRE" && quote.preMarketPrice !== null
  const prePositive = (quote.preMarketChangePercent ?? 0) >= 0

  return (
    <div onClick={onClick} className="bg-gray-900 border border-gray-800 rounded-xl p-5 cursor-pointer hover:border-gray-600 transition-colors">
      <div className="flex justify-between items-start mb-3">
        <div>
          <p className="text-gray-400 text-xs font-medium uppercase tracking-wide">{quote.symbol.replace("^", "")}</p>
          <p className="text-sm text-gray-300 mt-0.5 truncate max-w-[140px]">{quote.name}</p>
        </div>
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${isPositive ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
          {isPositive ? "+" : ""}{quote.changePercent.toFixed(2)}%
        </span>
      </div>
      <p className="text-2xl font-bold">{formatPrice(quote.price, quote.currency)}</p>
      <p className={`text-sm mt-1 ${isPositive ? "text-green-400" : "text-red-400"}`}>
        {isPositive ? "+" : ""}{formatPrice(quote.change, quote.currency)}
      </p>

      {isPreMarket && quote.preMarketPrice && (
        <div className="mt-3 pt-3 border-t border-gray-800">
          <p className="text-gray-500 text-xs mb-1">Pre-market</p>
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold">{formatPrice(quote.preMarketPrice, quote.currency)}</p>
            <span className={`text-xs ${prePositive ? "text-green-400" : "text-red-400"}`}>
              {prePositive ? "+" : ""}{quote.preMarketChangePercent?.toFixed(2)}%
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

export default function DashboardPage() {
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null)

  useEffect(() => {
    fetch("/api/quotes")
      .then((r) => r.json())
      .then((data) => {
        if (!Array.isArray(data)) throw new Error(data.error ?? "Onbekende fout")
        setQuotes(data)
      })
      .catch(() => setError("Kon geen data ophalen."))
      .finally(() => setLoading(false))
  }, [])

  const indices = quotes.filter((q) => INDICES.includes(q.symbol))
  const stocks = quotes.filter((q) => STOCKS.includes(q.symbol))

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-gray-400 text-sm mt-1">Live marktdata</p>
        </div>
        {!loading && (
          <button
            onClick={() => { setLoading(true); setError(""); fetch("/api/quotes").then(r => r.json()).then(setQuotes).finally(() => setLoading(false)) }}
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            ↻ Vernieuwen
          </button>
        )}
      </div>

      {loading && (
        <div className="text-gray-400 text-center py-20">Data ophalen...</div>
      )}

      {error && (
        <div className="text-red-400 text-center py-20">{error}</div>
      )}

      {selectedQuote && (
        <StockChart
          symbol={selectedQuote.symbol}
          name={selectedQuote.name}
          onClose={() => setSelectedQuote(null)}
        />
      )}

      {!loading && !error && (
        <>
          <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-3">Indices</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            {indices.map((q) => <QuoteCard key={q.symbol} quote={q} onClick={() => setSelectedQuote(q)} />)}
          </div>

          <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-3">Aandelen</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {stocks.map((q) => <QuoteCard key={q.symbol} quote={q} onClick={() => setSelectedQuote(q)} />)}
          </div>
        </>
      )}
    </div>
  )
}
