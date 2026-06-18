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
  const [bericht, setBericht] = useState("")
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Laad uit localStorage
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

  // Haal live quotes op
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

  // Zoekfunctie
  useEffect(() => {
    if (!query.trim()) { setResultaten([]); return }
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
      setResultaten(await res.json())
    }, 300)
  }, [query])

  // Haal prijs op bij selectie
  useEffect(() => {
    if (!gekozen) return
    setKoopprijs(null)
    fetch(`/api/quotes?symbols=${gekozen.symbol}`)
      .then(r => r.json())
      .then((qs: Quote[]) => {
        if (Array.isArray(qs) && qs[0]) setKoopprijs(qs[0].price * 0.92)
      })
  }, [gekozen])

  async function koop() {
    if (!gekozen || !aantalStr || !koopprijs) return
    const aantal = parseFloat(aantalStr)
    const totaal = aantal * koopprijs
    if (totaal > cash) {
      setBericht("Niet genoeg cash voor deze aankoop.")
      return
    }
    setKoopLoading(true)
    const nieuwCash = cash - totaal
    const nieuwPosities = [...posities]
    const bestaand = nieuwPosities.find(p => p.symbol === gekozen.symbol)
    if (bestaand) {
      const totaalShares = bestaand.shares + aantal
      bestaand.aankoopprijs = (bestaand.aankoopprijs * bestaand.shares + koopprijs * aantal) / totaalShares
      bestaand.shares = totaalShares
    } else {
      nieuwPosities.push({
        symbol: gekozen.symbol,
        name: gekozen.name,
        shares: aantal,
        aankoopprijs: koopprijs,
        aankoopDatum: new Date().toLocaleDateString("nl-NL"),
      })
    }
    setCash(nieuwCash)
    setPosities(nieuwPosities)
    opslaan(nieuwCash, nieuwPosities)
    setQuery(""); setGekozen(null); setAantalStr(""); setShowForm(false)
    setBericht(`${aantal}x ${gekozen.name} gekocht voor ${fmtEur(totaal)}`)
    setKoopLoading(false)
    setTimeout(() => setBericht(""), 4000)
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
    setBericht(`${pos.name} verkocht voor ${fmtEur(opbrengst)}`)
    setTimeout(() => setBericht(""), 4000)
  }

  function reset() {
    if (!confirm("Weet je zeker dat je opnieuw wilt beginnen?")) return
    setCash(STARTKAPITAAL)
    setPosities([])
    setQuotes({})
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

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 text-white">
      {geselecteerd && (
        <StockChart symbol={geselecteerd.symbol} name={geselecteerd.name} onClose={() => setGeselecteerd(null)} />
      )}

      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold">Papierbeleggen</h1>
            <span className="text-xs bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-2 py-0.5 rounded-full font-medium">Nep-geld</span>
          </div>
          <p className="text-gray-400 text-sm">Oefen met beleggen zonder echt geld te riskeren</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setShowForm(!showForm)}
            className="bg-blue-600 hover:bg-blue-500 transition-colors text-sm px-4 py-2 rounded-lg font-medium">
            + Koop aandeel
          </button>
          <button onClick={reset} className="text-gray-500 hover:text-red-400 text-sm transition-colors px-3 py-2">
            Reset
          </button>
        </div>
      </div>

      {bericht && (
        <div className="mb-6 bg-green-500/10 border border-green-500/30 text-green-400 rounded-xl px-4 py-3 text-sm">
          {bericht}
        </div>
      )}

      {/* Overzicht */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
          <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Totaal vermogen</p>
          <p className="text-xl font-bold">{fmtEur(totaalVermogen)}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
          <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Cash beschikbaar</p>
          <p className="text-xl font-bold text-blue-400">{fmtEur(cash)}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
          <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Belegd</p>
          <p className="text-xl font-bold">{fmtEur(totaalWaarde)}</p>
        </div>
        <div className={`border rounded-2xl p-4 ${isUp ? "bg-green-500/10 border-green-500/20" : "bg-red-500/10 border-red-500/20"}`}>
          <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Rendement</p>
          <p className={`text-xl font-bold ${isUp ? "text-green-400" : "text-red-400"}`}>
            {isUp ? "+" : ""}{fmtEur(rendement)}
          </p>
          <p className={`text-xs ${isUp ? "text-green-400" : "text-red-400"}`}>
            {isUp ? "+" : ""}{rendementPct.toFixed(2)}%
          </p>
        </div>
      </div>

      {/* Koopformulier */}
      {showForm && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-8">
          <h2 className="font-semibold mb-4">Aandeel kopen</h2>
          <div className="space-y-4">
            <div className="relative">
              <input
                value={query}
                onChange={e => { setQuery(e.target.value); setGekozen(null); setKoopprijs(null) }}
                placeholder="Zoek aandeel (bijv. Apple, ASML...)"
                className="w-full bg-gray-800 border border-gray-700 focus:border-blue-500 outline-none rounded-xl px-4 py-3 text-white placeholder-gray-500"
              />
              {gekozen && <div className="absolute right-4 top-3 text-green-400 text-sm font-medium">{gekozen.symbol} ✓</div>}
              {resultaten.length > 0 && !gekozen && (
                <div className="absolute top-full mt-1 w-full bg-gray-800 border border-gray-700 rounded-xl overflow-hidden z-10 shadow-xl">
                  {resultaten.map(r => (
                    <button key={r.symbol} onClick={() => { setGekozen(r); setQuery(r.name); setResultaten([]) }}
                      className="w-full text-left px-4 py-3 hover:bg-gray-700 transition-colors flex justify-between">
                      <span className="font-medium text-sm">{r.symbol} <span className="text-gray-400">{r.name}</span></span>
                      <span className="text-gray-500 text-xs">{r.exchange}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {koopprijs && (
              <p className="text-sm text-gray-400 bg-gray-800 rounded-xl px-4 py-3">
                Huidige prijs: <span className="text-white font-medium">{fmtEur(koopprijs)}</span> per aandeel
              </p>
            )}

            <div>
              <label className="text-xs text-gray-400 mb-1 block">Aantal aandelen</label>
              <input
                type="number" value={aantalStr} onChange={e => setAantalStr(e.target.value)}
                placeholder="10"
                className="w-full bg-gray-800 border border-gray-700 focus:border-blue-500 outline-none rounded-xl px-4 py-3 text-white placeholder-gray-500"
              />
            </div>

            {gekozen && aantalStr && koopprijs && (
              <p className="text-sm text-gray-400 bg-gray-800 rounded-xl px-4 py-3">
                Totale kosten: <span className={`font-medium ${parseFloat(aantalStr) * koopprijs > cash ? "text-red-400" : "text-white"}`}>
                  {fmtEur(parseFloat(aantalStr) * koopprijs)}
                </span>
                {parseFloat(aantalStr) * koopprijs > cash && <span className="text-red-400 ml-2">— niet genoeg cash</span>}
              </p>
            )}

            <div className="flex gap-3">
              <button onClick={koop}
                disabled={!gekozen || !aantalStr || !koopprijs || koopLoading || parseFloat(aantalStr) * (koopprijs ?? 0) > cash}
                className="bg-green-600 hover:bg-green-500 disabled:opacity-50 transition-colors px-5 py-2.5 rounded-lg font-medium text-sm">
                {koopLoading ? "Kopen..." : "Kopen"}
              </button>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-white text-sm px-4">Annuleren</button>
            </div>
          </div>
        </div>
      )}

      {/* Posities */}
      {posities.length === 0 && !showForm && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center">
          <p className="text-3xl mb-4">📄</p>
          <p className="text-gray-400 mb-2 font-medium">Je hebt {fmtEur(STARTKAPITAAL)} nep-geld</p>
          <p className="text-gray-500 text-sm mb-6">Koop aandelen en leer hoe beleggen werkt — zonder risico</p>
          <button onClick={() => setShowForm(true)}
            className="bg-blue-600 hover:bg-blue-500 transition-colors px-6 py-3 rounded-xl font-medium">
            Eerste aandeel kopen
          </button>
        </div>
      )}

      {posities.length > 0 && (
        <div className="space-y-3">
          <div className="grid grid-cols-6 text-xs text-gray-500 px-4 pb-1 uppercase tracking-wide">
            <span className="col-span-2">Aandeel</span>
            <span className="text-right">Aandelen</span>
            <span className="text-right">Koopprijs</span>
            <span className="text-right">Rendement</span>
            <span className="text-right">Waarde</span>
          </div>
          {posities.map(pos => {
            const q = quotes[pos.symbol]
            const huidigePrijs = q ? q.price * 0.92 : pos.aankoopprijs
            const waarde = pos.shares * huidigePrijs
            const winst = waarde - pos.shares * pos.aankoopprijs
            const winstPct = (winst / (pos.shares * pos.aankoopprijs)) * 100
            const posUp = winst >= 0

            return (
              <div key={pos.symbol} className="bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-xl px-4 py-4 grid grid-cols-6 items-center transition-colors group">
                <button className="col-span-2 text-left" onClick={() => setGeselecteerd(pos)}>
                  <p className="font-semibold text-sm">{pos.name}</p>
                  <p className="text-gray-500 text-xs">{pos.symbol} · gekocht op {pos.aankoopDatum}</p>
                </button>
                <p className="text-right text-sm">{pos.shares}</p>
                <p className="text-right text-sm">{fmtEur(pos.aankoopprijs)}</p>
                <div className="text-right">
                  <p className={`text-sm font-medium ${posUp ? "text-green-400" : "text-red-400"}`}>
                    {posUp ? "+" : ""}{fmtEur(winst)}
                  </p>
                  <p className={`text-xs ${posUp ? "text-green-400" : "text-red-400"}`}>
                    {posUp ? "+" : ""}{winstPct.toFixed(2)}%
                  </p>
                </div>
                <div className="text-right flex items-center justify-end gap-3">
                  <p className="text-sm font-bold">{fmtEur(waarde)}</p>
                  <button onClick={() => verkoop(pos.symbol)}
                    className="text-gray-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 text-xs font-medium">
                    Verkoop
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
