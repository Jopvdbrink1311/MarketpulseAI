"use client"

import { useEffect, useState, useRef } from "react"
import StockChart from "@/components/stock-chart"

type WatchItem = { symbol: string; name: string }
type Quote = { symbol: string; name: string; price: number; change: number; changePercent: number; currency: string }
type SearchResult = { symbol: string; name: string; exchange: string }

function formatPrice(price: number, currency: string) {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: currency === "EUR" ? "EUR" : "USD",
    minimumFractionDigits: 2,
  }).format(price)
}

export default function WatchlistPage() {
  const [items, setItems] = useState<WatchItem[]>([])
  const [quotes, setQuotes] = useState<Record<string, Quote>>({})
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedQuote, setSelectedQuote] = useState<WatchItem | null>(null)
  const [loading, setLoading] = useState(true)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  async function loadWatchlist() {
    const res = await fetch("/api/watchlist")
    if (!res.ok) return
    const data: WatchItem[] = await res.json()
    setItems(data)
    setLoading(false)
    if (data.length > 0) fetchQuotes(data.map((d) => d.symbol))
  }

  async function fetchQuotes(symbols: string[]) {
    const res = await fetch(`/api/quotes?symbols=${symbols.join(",")}`)
    const data = await res.json()
    if (Array.isArray(data)) {
      const map: Record<string, Quote> = {}
      data.forEach((q: Quote) => (map[q.symbol] = q))
      setQuotes(map)
    }
  }

  useEffect(() => { loadWatchlist() }, [])

  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(async () => {
      setSearching(true)
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
      setResults(await res.json())
      setSearching(false)
    }, 300)
  }, [query])

  async function addToWatchlist(item: SearchResult) {
    await fetch("/api/watchlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbol: item.symbol, name: item.name }),
    })
    setQuery("")
    setResults([])
    loadWatchlist()
  }

  async function removeFromWatchlist(symbol: string) {
    await fetch("/api/watchlist", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbol }),
    })
    setItems((prev) => prev.filter((i) => i.symbol !== symbol))
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      {selectedQuote && (
        <StockChart symbol={selectedQuote.symbol} name={selectedQuote.name} onClose={() => setSelectedQuote(null)} />
      )}

      <h1 className="text-2xl font-bold mb-2">Watchlist</h1>
      <p className="text-gray-400 text-sm mb-8">Volg jouw favoriete aandelen</p>

      {/* Zoekbalk */}
      <div className="relative mb-8">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Zoek een aandeel of ETF (bijv. ASML, Apple, S&P 500)..."
          className="w-full bg-gray-900 border border-gray-700 focus:border-blue-500 outline-none rounded-xl px-4 py-3 text-white placeholder-gray-500"
        />
        {(results.length > 0 || searching) && (
          <div className="absolute top-full mt-1 w-full bg-gray-900 border border-gray-800 rounded-xl overflow-hidden z-10 shadow-xl">
            {searching && <p className="text-gray-500 text-sm px-4 py-3">Zoeken...</p>}
            {results.map((r) => (
              <button
                key={r.symbol}
                onClick={() => addToWatchlist(r)}
                className="w-full text-left px-4 py-3 hover:bg-gray-800 transition-colors flex justify-between items-center"
              >
                <div>
                  <span className="font-medium text-sm">{r.symbol}</span>
                  <span className="text-gray-400 text-sm ml-2">{r.name}</span>
                </div>
                <span className="text-gray-500 text-xs">{r.exchange}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Watchlist */}
      {loading && <p className="text-gray-500 text-center py-10">Laden...</p>}

      {!loading && items.length === 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-10 text-center">
          <p className="text-gray-500">Je watchlist is leeg. Zoek een aandeel hierboven.</p>
        </div>
      )}

      {!loading && items.length > 0 && (
        <div className="space-y-3">
          {items.map((item) => {
            const q = quotes[item.symbol]
            const isPositive = (q?.changePercent ?? 0) >= 0
            return (
              <div
                key={item.symbol}
                className="bg-gray-900 border border-gray-800 rounded-xl px-5 py-4 flex items-center justify-between hover:border-gray-700 transition-colors"
              >
                <button className="text-left flex-1" onClick={() => setSelectedQuote(item)}>
                  <p className="font-semibold">{item.name}</p>
                  <p className="text-gray-500 text-xs mt-0.5">{item.symbol}</p>
                </button>

                <div className="text-right mr-6">
                  {q ? (
                    <>
                      <p className="font-bold">{formatPrice(q.price, q.currency)}</p>
                      <p className={`text-sm ${isPositive ? "text-green-400" : "text-red-400"}`}>
                        {isPositive ? "+" : ""}{q.changePercent.toFixed(2)}%
                      </p>
                    </>
                  ) : (
                    <p className="text-gray-600 text-sm">—</p>
                  )}
                </div>

                <button
                  onClick={() => removeFromWatchlist(item.symbol)}
                  className="text-gray-600 hover:text-red-400 transition-colors text-lg"
                >
                  ×
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
