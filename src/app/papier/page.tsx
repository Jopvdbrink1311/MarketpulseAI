"use client"

import { useEffect, useState, useRef } from "react"
import StockChart from "@/components/stock-chart"

const STARTKAPITAAL = 10000

type PapierPositie = {
  symbol: string
  name: string
  shares: number
  aankoopprijs: number
  aankoopDatum: string
}

type Quote = { symbol: string; price: number; changePercent: number; name: string }
type SearchResult = { symbol: string; name: string; exchange: string }

function fmtEur(amount: number) {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", minimumFractionDigits: 2 }).format(amount)
}

export default function PapierPage() {
  const [cash, setCash] = useState(STARTKAPITAAL)
  const [posities, setPosities] = useState<PapierPositie[]>([])
  const [quotes, setQuotes] = useState<Record<string, Quote>>({})
  const [geselecteerd, setGeselecteerd] = useState<PapierPositie | null>(null)

  const [query, setQuery] = useState("")
  const [resultaten, setResultaten] = useState<SearchResult[]>([])
  const [gekozen, setGekozen] = useState<SearchResult | null>(null)
  const [aantalStr, setAantalStr] = useState("")
  const [koopprijs, setKoopprijs] = useState<number | null>(null)
  const [koopLoading, setKoopLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [bericht, setBericht] = useState<{ tekst: string; type: "ok" | "fout" } | null>(null)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const opgeslagen = localStorage.getItem("papier_portfolio")
    if (opgeslagen) {
      const data = JSON.parse(opgeslagen)
      setCash(data.cash ?? STARTKAPITAAL)
      setPosities(data.posities ?? [])
    }
  }, [])

  function opslaan(nieuwCash: number, nieuwPosities: PapierPositie[]) {
    localStorage.setItem("papier_portfolio", JSON.stringify({ cash: nieuwCash, posities: nieuwPosities }))
  }

  useEffect(() => {
    if (posities.length === 0) return
    const symbols = posities.map(p => p.symbol).join(",")
    fetch(`/api/quotes?symbols=${symbols}`)
      .then(r => r.json())
      .then((qs: Quote[]) => {
        if (!Array.isArray(qs)) return
        const map: Record<string, Quote> = {}
        qs.forEach(q => (map[q.symbol] = q))
        setQuotes(map)
      })
  }, [posities])

  useEffect(() => {
    if (!query.trim()) { setResultaten([]); return }
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
      setResultaten(await res.json())
    }, 300)
  }, [query])

  useEffect(() => {
    if (!gekozen) return
    setKoopprijs(null)
    fetch(`/api/quotes?symbols=${gekozen.symbol}`)
      .then(r => r.json())
      .then((qs: Quote[]) => {
        if (Array.isArray(qs) && qs[0]) setKoopprijs(qs[0].price * 0.92)
      })
  }, [gekozen])

  function toonBericht(tekst: string, type: "ok" | "fout" = "ok") {
    setBericht({ tekst, type })
    setTimeout(() => setBericht(null), 4000)
  }

  async function koop() {
    if (!gekozen || !aantalStr || !koopprijs) return
    const aantal = parseFloat(aantalStr)
    const totaal = aantal * koopprijs
    if (totaal > cash) { toonBericht("Niet genoeg cash voor deze aankoop.", "fout"); return }
    setKoopLoading(true)
    const nieuwCash = cash - totaal
    const nieuwPosities = [...posities]
    const bestaand = nieuwPosities.find(p => p.symbol === gekozen.symbol)
    if (bestaand) {
      const totaalShares = bestaand.shares + aantal
      bestaand.aankoopprijs = (bestaand.aankoopprijs * bestaand.shares + koopprijs * aantal) / totaalShares
      bestaand.shares = totaalShares
    } else {
      nieuwPosities.push({ symbol: gekozen.symbol, name: gekozen.name, shares: aantal, aankoopprijs: koopprijs, aankoopDatum: new Date().toLocaleDateString("nl-NL") })
    }
    setCash(nieuwCash)
    setPosities(nieuwPosities)
    opslaan(nieuwCash, nieuwPosities)
    setQuery(""); setGekozen(null); setAantalStr(""); setShowForm(false)
    toonBericht(`${aantal}× ${gekozen.name} gekocht voor ${fmtEur(totaal)}`)
    setKoopLoading(false)
  }

  function verkoop(symbol: string) {
    const pos = posities.find(p => p.symbol === symbol)
    if (!pos) return
    const q = quotes[symbol]
    const verkoopprijs = q ? q.price * 0.92 : pos.aankoopprijs
    const opbrengst = pos.shares * verkoopprijs
    const nieuwCash = cash + opbrengst
    const nieuwPosities = posities.filter(p => p.symbol !== symbol)
    setCash(nieuwCash)
    setPosities(nieuwPosities)
    opslaan(nieuwCash, nieuwPosities)
    toonBericht(`${pos.name} verkocht voor ${fmtEur(opbrengst)}`)
  }

  function reset() {
    if (!confirm("Weet je zeker dat je opnieuw wilt beginnen?")) return
    setCash(STARTKAPITAAL); setPosities([]); setQuotes({})
    localStorage.removeItem("papier_portfolio")
  }

  const totaalWaarde = posities.reduce((sum, p) => {
    const q = quotes[p.symbol]
    return sum + p.shares * (q ? q.price * 0.92 : p.aankoopprijs)
  }, 0)
  const totaalVermogen = cash + totaalWaarde
  const rendement = totaalVermogen - STARTKAPITAAL
  const rendementPct = (rendement / STARTKAPITAAL) * 100
  const isUp = rendement >= 0
  const cashPct = totaalVermogen > 0 ? (cash / totaalVermogen) * 100 : 100
  const belegdPct = 100 - cashPct

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 text-white">
      {geselecteerd && (
        <StockChart symbol={geselecteerd.symbol} name={geselecteerd.name} onClose={() => setGeselecteerd(null)} />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <h1 className="text-2xl font-bold text-white">Papierbeleggen</h1>
            <span className="text-xs bg-yellow-500/15 text-yellow-400 border border-yellow-500/25 px-2.5 py-0.5 rounded-full font-medium tracking-wide">
              Simulatie
            </span>
          </div>
          <p className="text-gray-500 text-sm">Oefen met €10.000 nep-geld — zonder enig risico</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 transition-colors text-sm px-4 py-2.5 rounded-xl font-medium"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Koop aandeel
          </button>
          <button onClick={reset} className="p-2.5 text-gray-600 hover:text-red-400 transition-colors rounded-xl hover:bg-gray-800" title="Reset portfolio">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Notificatie */}
      {bericht && (
        <div className={`mb-6 rounded-xl px-4 py-3 text-sm flex items-center gap-2 ${
          bericht.type === "fout"
            ? "bg-red-500/10 border border-red-500/20 text-red-400"
            : "bg-green-500/10 border border-green-500/20 text-green-400"
        }`}>
          {bericht.type === "fout"
            ? <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            : <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
          }
          {bericht.tekst}
        </div>
      )}

      {/* Vermogensoverzicht */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
        <div className="grid grid-cols-4 gap-6 mb-5">
          <div>
            <p className="text-gray-500 text-xs uppercase tracking-wide mb-1.5">Totaal vermogen</p>
            <p className="text-2xl font-bold">{fmtEur(totaalVermogen)}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs uppercase tracking-wide mb-1.5">Cash</p>
            <p className="text-2xl font-bold text-blue-400">{fmtEur(cash)}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs uppercase tracking-wide mb-1.5">Belegd</p>
            <p className="text-2xl font-bold">{fmtEur(totaalWaarde)}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs uppercase tracking-wide mb-1.5">Rendement</p>
            <p className={`text-2xl font-bold ${isUp ? "text-green-400" : "text-red-400"}`}>
              {isUp ? "+" : ""}{rendementPct.toFixed(2)}%
            </p>
            <p className={`text-xs mt-0.5 ${isUp ? "text-green-400/70" : "text-red-400/70"}`}>
              {isUp ? "+" : ""}{fmtEur(rendement)}
            </p>
          </div>
        </div>

        {/* Verdeling balk */}
        <div>
          <div className="flex justify-between text-xs text-gray-500 mb-1.5">
            <span>Verdeling</span>
            <span>{cashPct.toFixed(0)}% cash · {belegdPct.toFixed(0)}% belegd</span>
          </div>
          <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden flex">
            <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${cashPct}%` }} />
            <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${belegdPct}%` }} />
          </div>
        </div>
      </div>

      {/* Koopformulier */}
      {showForm && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold">Aandeel kopen</h2>
            <button onClick={() => setShowForm(false)} className="text-gray-600 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="space-y-4">
            <div className="relative">
              <input
                value={query}
                onChange={e => { setQuery(e.target.value); setGekozen(null); setKoopprijs(null) }}
                placeholder="Zoek aandeel (bijv. Apple, ASML...)"
                className="w-full bg-gray-800 border border-gray-700 focus:border-blue-500 outline-none rounded-xl px-4 py-3 text-white placeholder-gray-500 text-sm"
              />
              {gekozen && (
                <div className="absolute right-3 top-2.5 flex items-center gap-1 bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-1 rounded-lg text-xs font-medium">
                  {gekozen.symbol} ✓
                </div>
              )}
              {resultaten.length > 0 && !gekozen && (
                <div className="absolute top-full mt-1 w-full bg-gray-800 border border-gray-700 rounded-xl overflow-hidden z-10 shadow-2xl">
                  {resultaten.map(r => (
                    <button key={r.symbol} onClick={() => { setGekozen(r); setQuery(r.name); setResultaten([]) }}
                      className="w-full text-left px-4 py-3 hover:bg-gray-700 transition-colors flex justify-between items-center border-b border-gray-700/50 last:border-0">
                      <span className="text-sm"><span className="font-semibold">{r.symbol}</span> <span className="text-gray-400">{r.name}</span></span>
                      <span className="text-gray-500 text-xs">{r.exchange}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block">Aantal aandelen</label>
                <input
                  type="number" value={aantalStr} onChange={e => setAantalStr(e.target.value)}
                  placeholder="10"
                  className="w-full bg-gray-800 border border-gray-700 focus:border-blue-500 outline-none rounded-xl px-4 py-3 text-white placeholder-gray-500 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block">Prijs per aandeel</label>
                <div className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm">
                  {koopprijs ? <span className="text-white font-medium">{fmtEur(koopprijs)}</span> : <span className="text-gray-500">—</span>}
                </div>
              </div>
            </div>

            {gekozen && aantalStr && koopprijs && (
              <div className={`rounded-xl px-4 py-3 text-sm flex items-center justify-between ${
                parseFloat(aantalStr) * koopprijs > cash
                  ? "bg-red-500/10 border border-red-500/20"
                  : "bg-gray-800 border border-gray-700"
              }`}>
                <span className="text-gray-400">Totale kosten</span>
                <div className="text-right">
                  <span className={`font-semibold ${parseFloat(aantalStr) * koopprijs > cash ? "text-red-400" : "text-white"}`}>
                    {fmtEur(parseFloat(aantalStr) * koopprijs)}
                  </span>
                  {parseFloat(aantalStr) * koopprijs > cash && (
                    <p className="text-xs text-red-400 mt-0.5">Onvoldoende cash</p>
                  )}
                </div>
              </div>
            )}

            <button onClick={koop}
              disabled={!gekozen || !aantalStr || !koopprijs || koopLoading || parseFloat(aantalStr) * (koopprijs ?? 0) > cash}
              className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors py-3 rounded-xl font-semibold text-sm">
              {koopLoading ? "Kopen..." : "Bevestig aankoop"}
            </button>
          </div>
        </div>
      )}

      {/* Lege staat */}
      {posities.length === 0 && !showForm && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-14 text-center">
          <div className="w-14 h-14 bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="font-semibold mb-1">Je hebt {fmtEur(STARTKAPITAAL)} nep-geld</p>
          <p className="text-gray-500 text-sm mb-6">Koop je eerste aandeel en kijk hoe beleggen werkt</p>
          <button onClick={() => setShowForm(true)}
            className="bg-blue-600 hover:bg-blue-500 transition-colors px-6 py-2.5 rounded-xl font-medium text-sm">
            Eerste aandeel kopen
          </button>
        </div>
      )}

      {/* Positielijst */}
      {posities.length > 0 && (
        <div>
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] text-xs text-gray-600 px-4 pb-2 uppercase tracking-wider">
            <span>Aandeel</span>
            <span className="text-right">Aantal</span>
            <span className="text-right">Koopprijs</span>
            <span className="text-right">Rendement</span>
            <span className="text-right">Waarde</span>
            <span />
          </div>
          <div className="space-y-2">
            {posities.map(pos => {
              const q = quotes[pos.symbol]
              const huidigePrijs = q ? q.price * 0.92 : pos.aankoopprijs
              const waarde = pos.shares * huidigePrijs
              const winst = waarde - pos.shares * pos.aankoopprijs
              const winstPct = (winst / (pos.shares * pos.aankoopprijs)) * 100
              const posUp = winst >= 0

              return (
                <div key={pos.symbol} className="bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-xl px-4 py-3.5 grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] items-center gap-2 transition-all group">
                  <button className="text-left" onClick={() => setGeselecteerd(pos)}>
                    <p className="font-semibold text-sm group-hover:text-white transition-colors">{pos.name}</p>
                    <p className="text-gray-600 text-xs mt-0.5">{pos.symbol} · {pos.aankoopDatum}</p>
                  </button>
                  <p className="text-right text-sm text-gray-300">{pos.shares}</p>
                  <p className="text-right text-sm text-gray-300">{fmtEur(pos.aankoopprijs)}</p>
                  <div className="text-right">
                    <p className={`text-sm font-semibold ${posUp ? "text-green-400" : "text-red-400"}`}>
                      {posUp ? "+" : ""}{winstPct.toFixed(2)}%
                    </p>
                    <p className={`text-xs mt-0.5 ${posUp ? "text-green-400/70" : "text-red-400/70"}`}>
                      {posUp ? "+" : ""}{fmtEur(winst)}
                    </p>
                  </div>
                  <p className="text-right text-sm font-bold">{fmtEur(waarde)}</p>
                  <button onClick={() => verkoop(pos.symbol)}
                    className="text-xs text-gray-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 border border-gray-700 hover:border-red-500/30 px-2 py-1 rounded-lg whitespace-nowrap">
                    Verkoop
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
