"use client"

import { useState, useEffect } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

export default function BriefingPage() {
  const [briefing, setBriefing] = useState("")
  const [loading, setLoading] = useState(false)
  const [lastGenerated, setLastGenerated] = useState<string | null>(null)
  const [generatedDate, setGeneratedDate] = useState<string | null>(null)

  const today = new Date().toISOString().split("T")[0]

  useEffect(() => {
    const cached = localStorage.getItem("briefing_text")
    const cachedDate = localStorage.getItem("briefing_date")
    if (cached && cachedDate === today) {
      setBriefing(cached)
      setLastGenerated(localStorage.getItem("briefing_time"))
      setGeneratedDate(cachedDate)
    }
  }, [today])

  async function generateBriefing() {
    setLoading(true)
    setBriefing("")

    try {
      const [quotesRes, newsRes] = await Promise.all([
        fetch("/api/quotes"),
        fetch("/api/news"),
      ])

      const quotes = await quotesRes.json()
      const newsData = await newsRes.json()

      const marketData = Array.isArray(quotes)
        ? quotes.map((q: { name: string; price: number; changePercent: number }) =>
            `${q.name}: $${q.price.toFixed(2)} (${q.changePercent >= 0 ? "+" : ""}${q.changePercent.toFixed(2)}%)`
          ).join("\n")
        : ""

      const news = Array.isArray(newsData)
        ? newsData.map((n: { title: string; summary: string }) =>
            `- ${n.title}: ${n.summary}`
          ).join("\n")
        : ""

      const res = await fetch("/api/briefing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ marketData, news }),
      })

      const data = await res.json()
      const text = data.briefing ?? ""
      const now = new Date().toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })

      setBriefing(text)
      setLastGenerated(now)
      setGeneratedDate(today)
      localStorage.setItem("briefing_text", text)
      localStorage.setItem("briefing_date", today)
      localStorage.setItem("briefing_time", now)
    } catch {
      setBriefing("Er ging iets mis bij het genereren van de briefing.")
    } finally {
      setLoading(false)
    }
  }

  const todayLabel = new Date().toLocaleDateString("nl-NL", {
    weekday: "long", year: "numeric", month: "long", day: "numeric"
  })

  return (
    <div className="max-w-3xl mx-auto px-6 py-10 text-white">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Dagelijkse Briefing</h1>
          <p className="text-gray-400 text-sm mt-1 capitalize">{todayLabel}</p>
        </div>
        <button
          onClick={generateBriefing}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 transition-colors px-5 py-2.5 rounded-xl font-medium text-sm"
        >
          {loading ? "Genereren..." : briefing ? "↻ Vernieuwen" : "Genereer briefing"}
        </button>
      </div>

      {!briefing && !loading && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center">
          <p className="text-gray-400 text-lg font-medium mb-2">Geen briefing voor vandaag</p>
          <p className="text-gray-500 text-sm mb-6">
            Genereer een AI-samenvatting van de markt, het nieuws en wat het betekent voor jouw portfolio.
          </p>
          <button
            onClick={generateBriefing}
            className="bg-blue-600 hover:bg-blue-500 transition-colors px-6 py-3 rounded-xl font-medium"
          >
            Genereer briefing
          </button>
        </div>
      )}

      {loading && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
          <div className="flex items-center gap-3 text-gray-400 mb-4">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            Claude analyseert de markt...
          </div>
          <div className="space-y-3">
            {["Marktdata ophalen", "Nieuws verwerken", "Briefing schrijven"].map((step, i) => (
              <div key={i} className="flex items-center gap-3 text-sm text-gray-600">
                <div className="w-1.5 h-1.5 rounded-full bg-gray-700" />
                {step}
              </div>
            ))}
          </div>
        </div>
      )}

      {briefing && !loading && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
          {lastGenerated && (
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-400" />
                <span className="text-xs text-gray-500">Gegenereerd om {lastGenerated}</span>
              </div>
              {generatedDate === today && (
                <span className="text-xs bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-0.5 rounded-full">
                  Vandaag
                </span>
              )}
            </div>
          )}
          <div className="prose prose-invert prose-sm max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{briefing}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  )
}
