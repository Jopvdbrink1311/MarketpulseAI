"use client"

import { useEffect, useState, useRef } from "react"

type Alert = {
  id: string
  symbol: string
  name: string
  condition: "above" | "below"
  target_price: number
  triggered: boolean
  created_at: string
}

type Quote = { symbol: string; price: number; changePercent: number }
type SearchResult = { symbol: string; name: string; exchange: string }

function fmt(price: number) {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(price)
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [quotes, setQuotes] = useState<Record<string, Quote>>({})
  const [loading, setLoading] = useState(true)
  const [triggered, setTriggered] = useState<Alert[]>([])

  // form
  const [showForm, setShowForm] = useState(false)
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [selected, setSelected] = useState<SearchResult | null>(null)
  const [condition, setCondition] = useState<"above" | "below">("below")
  const [targetPrice, setTargetPrice] = useState("")
  const [adding, setAdding] = useState(false)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  async function loadAlerts() {
    const res = await fetch("/api/alerts")
    if (!res.ok) { setLoading(false); return }
    const data: Alert[] = await res.json()
    setAlerts(data)
    setLoading(false)

    if (data.length > 0) {
      const symbols = [...new Set(data.map(a => a.symbol))].join(",")
      fetch(`/api/quotes?symbols=${symbols}`)
        .then(r => r.json())
        .then((qs: Quote[]) => {
          if (!Array.isArray(qs)) return
          const map: Record<string, Quote> = {}
          qs.forEach(q => (map[q.symbol] = q))
          setQuotes(map)

          // check welke alerts getriggerd zijn
          const hit = data.filter(alert => {
            const q = map[alert.symbol]
            if (!q || alert.triggered) return false
            return alert.condition === "above"
              ? q.price >= alert.target_price
              : q.price <= alert.target_price
          })
          setTriggered(hit)
        })
    }
  }

  useEffect(() => { loadAlerts() }, [])

  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
      setResults(await res.json())
    }, 300)
  }, [query])

  async function addAlert() {
    if (!selected || !targetPrice) return
    setAdding(true)
    await fetch("/api/alerts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        symbol: selected.symbol,
        name: selected.name,
        condition,
        target_price: parseFloat(targetPrice),
      }),
    })
    setQuery(""); setSelected(null); setTargetPrice(""); setShowForm(false); setAdding(false)
    loadAlerts()
  }

  async function deleteAlert(id: string) {
    await fetch("/api/alerts", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    })
    setAlerts(prev => prev.filter(a => a.id !== id))
    setTriggered(prev => prev.filter(a => a.id !== id))
  }

  const active = alerts.filter(a => !triggered.find(t => t.id === a.id))

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 text-white">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Prijsalerts</h1>
          <p className="text-gray-400 text-sm mt-1">Ontvang een melding als een koers jouw doelprijs bereikt</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 hover:bg-blue-500 transition-colors text-sm px-4 py-2 rounded-lg font-medium">
          + Alert toevoegen
        </button>
      </div>

      {/* Getriggerde alerts */}
      {triggered.length > 0 && (
        <div className="mb-8 space-y-3">
          <h2 className="text-xs font-semibold text-yellow-400 uppercase tracking-widest">🔔 Getriggerd</h2>
          {triggered.map(alert => {
            const q = quotes[alert.symbol]
            return (
              <div key={alert.id} className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-5 py-4 flex items-center justify-between">
                <div>
                  <p className="font-semibold">{alert.name} <span className="text-gray-400 text-sm">({alert.symbol})</span></p>
                  <p className="text-yellow-400 text-sm mt-0.5">
                    Doelprijs {fmt(alert.target_price)} bereikt · Huidige prijs: {q ? fmt(q.price) : "—"}
                  </p>
                </div>
                <button onClick={() => deleteAlert(alert.id)} className="text-gray-500 hover:text-red-400 transition-colors text-lg">×</button>
              </div>
            )
          })}
        </div>
      )}

      {/* Formulier */}
      {showForm && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-8">
          <h2 className="font-semibold mb-4">Nieuwe alert</h2>
          <div className="space-y-4">
            <div className="relative">
              <input
                value={query}
                onChange={e => { setQuery(e.target.value); setSelected(null) }}
                placeholder="Zoek aandeel of crypto..."
                className="w-full bg-gray-800 border border-gray-700 focus:border-blue-500 outline-none rounded-xl px-4 py-3 text-white placeholder-gray-500"
              />
              {selected && <div className="absolute right-4 top-3 text-green-400 text-sm font-medium">{selected.symbol} ✓</div>}
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
                <label className="text-xs text-gray-400 mb-1 block">Conditie</label>
                <div className="flex bg-gray-800 rounded-xl p-1">
                  <button onClick={() => setCondition("below")}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${condition === "below" ? "bg-red-500/20 text-red-400" : "text-gray-400 hover:text-white"}`}>
                    Daalt onder
                  </button>
                  <button onClick={() => setCondition("above")}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${condition === "above" ? "bg-green-500/20 text-green-400" : "text-gray-400 hover:text-white"}`}>
                    Stijgt boven
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Doelprijs (USD)</label>
                <input
                  type="number" value={targetPrice} onChange={e => setTargetPrice(e.target.value)}
                  placeholder="200.00"
                  className="w-full bg-gray-800 border border-gray-700 focus:border-blue-500 outline-none rounded-xl px-4 py-3 text-white placeholder-gray-500"
                />
              </div>
            </div>

            {selected && targetPrice && (
              <p className="text-sm text-gray-400 bg-gray-800 rounded-xl px-4 py-3">
                Alert: <span className="text-white font-medium">{selected.name}</span> {condition === "below" ? "daalt onder" : "stijgt boven"} <span className="text-white font-medium">{fmt(parseFloat(targetPrice))}</span>
              </p>
            )}

            <div className="flex gap-3">
              <button onClick={addAlert} disabled={!selected || !targetPrice || adding}
                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 transition-colors px-5 py-2.5 rounded-lg font-medium text-sm">
                {adding ? "Toevoegen..." : "Alert aanmaken"}
              </button>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-white text-sm px-4">Annuleren</button>
            </div>
          </div>
        </div>
      )}

      {loading && <p className="text-gray-500 text-center py-10">Laden...</p>}

      {!loading && alerts.length === 0 && !showForm && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center">
          <p className="text-gray-500 mb-4">Geen alerts ingesteld.</p>
          <button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-500 transition-colors px-5 py-2.5 rounded-lg font-medium text-sm">
            Eerste alert aanmaken
          </button>
        </div>
      )}

      {!loading && active.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">Actieve alerts</h2>
          {active.map(alert => {
            const q = quotes[alert.symbol]
            const distance = q ? Math.abs(((q.price - alert.target_price) / alert.target_price) * 100) : null
            return (
              <div key={alert.id} className="bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-xl px-5 py-4 flex items-center justify-between transition-colors group">
                <div className="flex items-center gap-4">
                  <div className={`w-2 h-2 rounded-full ${alert.condition === "below" ? "bg-red-400" : "bg-green-400"}`} />
                  <div>
                    <p className="font-semibold text-sm">{alert.name} <span className="text-gray-500">({alert.symbol})</span></p>
                    <p className="text-gray-400 text-xs mt-0.5">
                      {alert.condition === "below" ? "Daalt onder" : "Stijgt boven"} {fmt(alert.target_price)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-sm font-medium">{q ? fmt(q.price) : "—"}</p>
                    {distance !== null && (
                      <p className="text-xs text-gray-500">{distance.toFixed(1)}% verwijderd</p>
                    )}
                  </div>
                  <button onClick={() => deleteAlert(alert.id)}
                    className="text-gray-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 text-lg">×</button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
