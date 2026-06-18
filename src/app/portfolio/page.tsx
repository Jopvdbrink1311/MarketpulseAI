"use client"

import { useEffect, useState, useRef } from "react"
import StockChart from "@/components/stock-chart"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

type Position = {
  symbol: string
  name: string
  shares: number
  purchase_price: number
}

type Quote = {
  symbol: string
  price: number
  changePercent: number
  currency: string
}

type SearchResult = { symbol: string; name: string; exchange: string }

function fmt(price: number, currency = "USD") {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: currency === "EUR" ? "EUR" : "USD",
    minimumFractionDigits: 2,
  }).format(price)
}

export default function PortfolioPage() {
  const [positions, setPositions] = useState<Position[]>([])
  const [quotes, setQuotes] = useState<Record<string, Quote>>({})
  const [loading, setLoading] = useState(true)
  const [selectedSymbol, setSelectedSymbol] = useState<Position | null>(null)
  const [currency, setCurrency] = useState<"USD" | "EUR">("EUR")
  const [eurRate, setEurRate] = useState(0.92)
  const [benchmarks, setBenchmarks] = useState<{ sp500: number | null; aex: number | null; nasdaq: number | null }>({ sp500: null, aex: null, nasdaq: null })

  useEffect(() => {
    fetch("https://query1.finance.yahoo.com/v8/finance/chart/EURUSD=X?interval=1d&range=1d", {
      headers: { "User-Agent": "Mozilla/5.0" }
    })
      .then(r => r.json())
      .then(d => {
        const rate = d?.chart?.result?.[0]?.meta?.regularMarketPrice
        if (rate) setEurRate(rate)
      })
      .catch(() => {})
  }, [])

  function convert(usdAmount: number) {
    return currency === "EUR" ? usdAmount * eurRate : usdAmount
  }

  function fmtC(amount: number) {
    return new Intl.NumberFormat("nl-NL", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    }).format(convert(amount))
  }

  // form
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [selected, setSelected] = useState<SearchResult | null>(null)
  const [shares, setShares] = useState("")
  const [purchasePrice, setPurchasePrice] = useState("")
  const [adding, setAdding] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [analysis, setAnalysis] = useState("")
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [riskProfile, setRiskProfile] = useState<"laag" | "gemiddeld" | "hoog">("gemiddeld")
  const [watAdvies, setWatAdvies] = useState("")
  const [watLoading, setWatLoading] = useState(false)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  async function loadPortfolio() {
    const res = await fetch("/api/portfolio")
    if (!res.ok) return
    const data: Position[] = await res.json()
    setPositions(data)
    setLoading(false)
    if (data.length > 0) {
      const symbols = data.map(p => p.symbol).join(",")
      fetch(`/api/quotes?symbols=${symbols}`)
        .then(r => r.json())
        .then((qs: Quote[]) => {
          if (!Array.isArray(qs)) return
          const map: Record<string, Quote> = {}
          qs.forEach(q => (map[q.symbol] = q))
          setQuotes(map)
        })
    }
  }

  const [marketData, setMarketData] = useState("")
  useEffect(() => {
    fetch("/api/quotes").then(r => r.json()).then((qs) => {
      if (!Array.isArray(qs)) return
      setMarketData(qs.map((q: { name: string; price: number; changePercent: number }) =>
        `${q.name}: $${q.price.toFixed(2)} (${q.changePercent >= 0 ? "+" : ""}${q.changePercent.toFixed(2)}%)`
      ).join("\n"))
    }).catch(() => {})
  }, [])

  useEffect(() => { loadPortfolio() }, [])

  useEffect(() => {
    async function loadBenchmarks() {
      const symbols = ["^GSPC", "^IXIC", "^AEX"]
      const results = await Promise.all(
        symbols.map(s =>
          fetch(`/api/chart?symbol=${encodeURIComponent(s)}&range=1y`)
            .then(r => r.json())
            .then((data: { price: number }[]) => {
              if (!Array.isArray(data) || data.length < 2) return null
              const first = data[0].price
              const last = data[data.length - 1].price
              return ((last - first) / first) * 100
            })
            .catch(() => null)
        )
      )
      setBenchmarks({ sp500: results[0], nasdaq: results[1], aex: results[2] })
    }
    loadBenchmarks()
  }, [])

  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
      setResults(await res.json())
    }, 300)
  }, [query])

  async function addPosition() {
    if (!selected || !shares || !purchasePrice) return
    setAdding(true)
    await fetch("/api/portfolio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        symbol: selected.symbol,
        name: selected.name,
        shares: parseFloat(shares),
        purchase_price: parseFloat(purchasePrice),
      }),
    })
    setQuery(""); setSelected(null); setShares(""); setPurchasePrice("")
    setResults([]); setShowForm(false); setAdding(false)
    loadPortfolio()
  }

  async function removePosition(symbol: string) {
    await fetch("/api/portfolio", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbol }),
    })
    setPositions(prev => prev.filter(p => p.symbol !== symbol))
  }

  // totalen
  const totalInvested = positions.reduce((sum, p) => sum + p.shares * p.purchase_price, 0)
  const totalValue = positions.reduce((sum, p) => {
    const q = quotes[p.symbol]
    return sum + p.shares * (q?.price ?? p.purchase_price)
  }, 0)
  const totalGain = totalValue - totalInvested
  const totalGainPct = totalInvested > 0 ? (totalGain / totalInvested) * 100 : 0
  const isUp = totalGain >= 0

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 text-white">
      {selectedSymbol && (
        <StockChart symbol={selectedSymbol.symbol} name={selectedSymbol.name} onClose={() => setSelectedSymbol(null)} />
      )}

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Portfolio</h1>
          <p className="text-gray-400 text-sm mt-1">Jouw beleggingen live bijgehouden</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-gray-800 rounded-lg p-1 text-sm">
            <button onClick={() => setCurrency("EUR")} className={`px-3 py-1 rounded-md transition-colors font-medium ${currency === "EUR" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"}`}>€ EUR</button>
            <button onClick={() => setCurrency("USD")} className={`px-3 py-1 rounded-md transition-colors font-medium ${currency === "USD" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"}`}>$ USD</button>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-blue-600 hover:bg-blue-500 transition-colors text-sm px-4 py-2 rounded-lg font-medium"
          >
            + Positie toevoegen
          </button>
        </div>
      </div>

      {/* Formulier */}
      {showForm && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-8">
          <h2 className="font-semibold mb-4">Nieuwe positie</h2>
          <div className="space-y-4">
            <div className="relative">
              <input
                value={query}
                onChange={e => { setQuery(e.target.value); setSelected(null) }}
                placeholder="Zoek aandeel (bijv. ASML, Apple...)"
                className="w-full bg-gray-800 border border-gray-700 focus:border-blue-500 outline-none rounded-xl px-4 py-3 text-white placeholder-gray-500"
              />
              {selected && (
                <div className="absolute right-4 top-3 text-green-400 text-sm font-medium">{selected.symbol} ✓</div>
              )}
              {results.length > 0 && !selected && (
                <div className="absolute top-full mt-1 w-full bg-gray-800 border border-gray-700 rounded-xl overflow-hidden z-10 shadow-xl">
                  {results.map(r => (
                    <button key={r.symbol} onClick={() => { setSelected(r); setQuery(r.name); setResults([]) }}
                      className="w-full text-left px-4 py-3 hover:bg-gray-700 transition-colors flex justify-between">
                      <span className="font-medium text-sm">{r.symbol} <span className="text-gray-400">{r.name}</span></span>
                      <span className="text-gray-500 text-xs">{r.exchange}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Aantal aandelen</label>
                <input
                  type="number" value={shares} onChange={e => setShares(e.target.value)}
                  placeholder="10"
                  className="w-full bg-gray-800 border border-gray-700 focus:border-blue-500 outline-none rounded-xl px-4 py-3 text-white placeholder-gray-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Aankoopprijs per aandeel</label>
                <input
                  type="number" value={purchasePrice} onChange={e => setPurchasePrice(e.target.value)}
                  placeholder="150.00"
                  className="w-full bg-gray-800 border border-gray-700 focus:border-blue-500 outline-none rounded-xl px-4 py-3 text-white placeholder-gray-500"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={addPosition} disabled={!selected || !shares || !purchasePrice || adding}
                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 transition-colors px-5 py-2.5 rounded-lg font-medium text-sm">
                {adding ? "Toevoegen..." : "Toevoegen"}
              </button>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-white text-sm px-4 py-2.5">
                Annuleren
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Totaal overzicht */}
      {!loading && positions.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Totale waarde</p>
            <p className="text-2xl font-bold text-white">{fmtC(totalValue)}</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Geïnvesteerd</p>
            <p className="text-2xl font-bold text-white">{fmtC(totalInvested)}</p>
          </div>
          <div className={`border rounded-2xl p-5 ${isUp ? "bg-green-500/10 border-green-500/20" : "bg-red-500/10 border-red-500/20"}`}>
            <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Totaal rendement</p>
            <p className={`text-2xl font-bold ${isUp ? "text-green-400" : "text-red-400"}`}>
              {isUp ? "+" : ""}{fmtC(totalGain)}
            </p>
            <p className={`text-sm ${isUp ? "text-green-400" : "text-red-400"}`}>
              {isUp ? "+" : ""}{totalGainPct.toFixed(2)}%
            </p>
          </div>
        </div>
      )}

      {/* Wat moet ik nu doen */}
      {!loading && positions.length > 0 && (
        <div className="mb-6">
          {!watAdvies && !watLoading && (
            <button
              onClick={async () => {
                setWatLoading(true)
                const res = await fetch("/api/wat-moet-ik-doen", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ positions, quotes, marketData, totalGainPct, riskProfile }),
                })
                const data = await res.json()
                setWatAdvies(data.advies ?? "")
                setWatLoading(false)
              }}
              className="w-full bg-green-600 hover:bg-green-500 transition-colors rounded-2xl px-6 py-5 text-left"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-bold">Wat moet ik nu doen?</p>
                  <p className="text-green-200/70 text-sm mt-0.5">Krijg direct concreet advies op basis van jouw portfolio en de markt</p>
                </div>
                <span className="text-2xl ml-4">→</span>
              </div>
            </button>
          )}

          {watLoading && (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 flex items-center gap-3 text-gray-400">
              <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
              Even kijken wat het beste is voor jou...
            </div>
          )}

          {watAdvies && (
            <div className="bg-gray-900 border border-green-500/20 rounded-2xl p-6">
              <div className="flex justify-between items-center mb-3">
                <p className="font-semibold text-green-400">Wat moet ik nu doen?</p>
                <button onClick={() => setWatAdvies("")} className="text-gray-500 hover:text-white text-sm transition-colors">↻ Opnieuw</button>
              </div>
              <div className="prose prose-invert prose-sm max-w-none">
                {watAdvies.split("\n").map((line, i) => (
                  <p key={i} className={line.startsWith("**") ? "font-semibold text-white" : "text-gray-300"}>
                    {line.replace(/\*\*/g, "")}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Benchmark vergelijking */}
      {!loading && positions.length > 0 && (benchmarks.sp500 !== null || benchmarks.nasdaq !== null || benchmarks.aex !== null) && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 mb-6">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-4">Jouw portfolio vs markt (1 jaar)</p>
          <div className="grid grid-cols-4 gap-4">
            {/* Portfolio */}
            <div className="col-span-1">
              <p className="text-xs text-gray-400 mb-1">Jouw portfolio</p>
              <p className={`text-xl font-bold ${totalGainPct >= 0 ? "text-green-400" : "text-red-400"}`}>
                {totalGainPct >= 0 ? "+" : ""}{totalGainPct.toFixed(2)}%
              </p>
              <div className={`mt-2 h-1.5 rounded-full ${totalGainPct >= 0 ? "bg-green-500" : "bg-red-500"}`}
                style={{ width: `${Math.min(Math.abs(totalGainPct) / 0.5, 100)}%` }} />
            </div>

            {[
              { label: "S&P 500", value: benchmarks.sp500 },
              { label: "Nasdaq", value: benchmarks.nasdaq },
              { label: "AEX", value: benchmarks.aex },
            ].map(({ label, value }) => {
              if (value === null) return null
              const beating = totalGainPct > value
              return (
                <div key={label}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <p className="text-xs text-gray-400">{label}</p>
                    {beating
                      ? <span className="text-xs text-green-400 font-medium">jij wint</span>
                      : <span className="text-xs text-red-400 font-medium">jij verliest</span>
                    }
                  </div>
                  <p className={`text-xl font-bold ${value >= 0 ? "text-gray-300" : "text-red-400"}`}>
                    {value >= 0 ? "+" : ""}{value.toFixed(2)}%
                  </p>
                  <div className="mt-2 h-1.5 rounded-full bg-gray-700"
                    style={{ width: `${Math.min(Math.abs(value) / 0.5, 100)}%` }} />
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* AI Analyse */}
      {!loading && positions.length > 0 && (
        <div className="mb-8">
          {!analysis && !analysisLoading && (
            <div className="bg-blue-600/10 border border-blue-500/30 rounded-2xl px-6 py-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-semibold text-blue-400">AI Portfolio Analyse</p>
                  <p className="text-gray-400 text-sm mt-0.5">Claude analyseert jouw portfolio op basis van jouw risicoprofiel</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide">Risicoprofiel</p>
                  <div className="flex bg-gray-900/60 rounded-xl p-1 gap-1">
                    {(["laag", "gemiddeld", "hoog"] as const).map(r => (
                      <button
                        key={r}
                        onClick={() => setRiskProfile(r)}
                        className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${
                          riskProfile === r
                            ? r === "laag"
                              ? "bg-blue-600/20 text-blue-400 border border-blue-500/40"
                              : r === "hoog"
                              ? "bg-red-600/20 text-red-400 border border-red-500/40"
                              : "bg-yellow-600/20 text-yellow-400 border border-yellow-500/40"
                            : "text-gray-500 hover:text-white"
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  onClick={async () => {
                    setAnalysisLoading(true)
                    const res = await fetch("/api/portfolio-analysis", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ positions, quotes, totalInvested, totalValue, totalGainPct, riskProfile }),
                    })
                    const data = await res.json()
                    setAnalysis(data.analysis ?? "")
                    setAnalysisLoading(false)
                  }}
                  className="bg-blue-600 hover:bg-blue-500 transition-colors px-6 py-2.5 rounded-xl font-medium text-sm"
                >
                  Analyseer
                </button>
              </div>
            </div>
          )}

          {analysisLoading && (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <div className="flex items-center gap-3 text-gray-400">
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                Claude analyseert jouw portfolio...
              </div>
            </div>
          )}

          {analysis && (
            <div className="bg-gray-900 border border-blue-500/20 rounded-2xl p-6">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🤖</span>
                  <h2 className="font-semibold text-blue-400">AI Portfolio Analyse</h2>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${
                    riskProfile === "laag" ? "bg-blue-600/20 text-blue-400" :
                    riskProfile === "hoog" ? "bg-red-600/20 text-red-400" :
                    "bg-yellow-600/20 text-yellow-400"
                  }`}>{riskProfile} risico</span>
                  <button onClick={() => setAnalysis("")} className="text-gray-500 hover:text-white text-sm transition-colors">
                    ↻ Opnieuw
                  </button>
                </div>
              </div>
              <div className="prose prose-invert prose-sm max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{analysis}</ReactMarkdown>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Posities */}
      {loading && <p className="text-gray-500 text-center py-10">Laden...</p>}

      {!loading && positions.length === 0 && !showForm && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center">
          <p className="text-gray-500 mb-4">Je portfolio is leeg.</p>
          <button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-500 transition-colors px-5 py-2.5 rounded-lg font-medium text-sm">
            Eerste positie toevoegen
          </button>
        </div>
      )}

      {!loading && positions.length > 0 && (
        <div className="space-y-3">
          <div className="grid grid-cols-6 text-xs text-gray-500 px-4 pb-1 uppercase tracking-wide">
            <span className="col-span-2">Aandeel</span>
            <span className="text-right">Aandelen</span>
            <span className="text-right">Huidige prijs</span>
            <span className="text-right">Rendement</span>
            <span className="text-right">Waarde</span>
          </div>
          {positions.map(pos => {
            const q = quotes[pos.symbol]
            const currentPrice = q?.price ?? pos.purchase_price
            const value = pos.shares * currentPrice
            const invested = pos.shares * pos.purchase_price
            const gain = value - invested
            const gainPct = (gain / invested) * 100
            const posUp = gain >= 0

            return (
              <div key={pos.symbol} className="bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-xl px-4 py-4 grid grid-cols-6 items-center transition-colors group">
                <button className="col-span-2 text-left" onClick={() => setSelectedSymbol(pos)}>
                  <p className="font-semibold text-sm">{pos.name}</p>
                  <p className="text-gray-500 text-xs">{pos.symbol}</p>
                </button>
                <p className="text-right text-sm">{pos.shares}</p>
                <div className="text-right">
                  <p className="text-sm font-medium">{q ? fmtC(currentPrice) : "—"}</p>
                  {q && <p className={`text-xs ${q.changePercent >= 0 ? "text-green-400" : "text-red-400"}`}>
                    {q.changePercent >= 0 ? "+" : ""}{q.changePercent.toFixed(2)}%
                  </p>}
                </div>
                <div className="text-right">
                  <p className={`text-sm font-medium ${posUp ? "text-green-400" : "text-red-400"}`}>
                    {posUp ? "+" : ""}{fmtC(gain)}
                  </p>
                  <p className={`text-xs ${posUp ? "text-green-400" : "text-red-400"}`}>
                    {posUp ? "+" : ""}{gainPct.toFixed(2)}%
                  </p>
                </div>
                <div className="text-right flex items-center justify-end gap-3">
                  <p className="text-sm font-bold">{fmtC(value)}</p>
                  <button onClick={() => removePosition(pos.symbol)}
                    className="text-gray-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 text-lg leading-none">×</button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
