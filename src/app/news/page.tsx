"use client"

import { useEffect, useState } from "react"

type Article = {
  title: string
  summary: string
  sentiment: "positief" | "negatief" | "neutraal"
  url?: string
}

const sentimentStyle = {
  positief: "bg-green-500/10 text-green-400 border-green-500/20",
  negatief: "bg-red-500/10 text-red-400 border-red-500/20",
  neutraal: "bg-gray-500/10 text-gray-400 border-gray-500/20",
}

export default function NewsPage() {
  const [articles, setArticles] = useState<Article[]>([])
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  function load() {
    setLoading(true)
    setError("")
    fetch("/api/news")
      .then((r) => r.json())
      .then((d) => {
        setArticles(d.articles ?? [])
        setUpdatedAt(d.updatedAt ?? null)
      })
      .catch(() => setError("Kon geen nieuws ophalen."))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    const interval = setInterval(load, 3600 * 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Marktnieuws</h1>
          <p className="text-gray-400 text-sm mt-1">
            AI-samenvatting van de belangrijkste berichten
            {updatedAt && (
              <> · bijgewerkt om {new Date(updatedAt).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}</>
            )}
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="text-sm text-gray-400 hover:text-white transition-colors disabled:opacity-50"
        >
          ↻ Vernieuwen
        </button>
      </div>

      {loading && (
        <div className="space-y-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-6 animate-pulse">
              <div className="h-4 bg-gray-800 rounded w-3/4 mb-3" />
              <div className="h-3 bg-gray-800 rounded w-full mb-2" />
              <div className="h-3 bg-gray-800 rounded w-5/6" />
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="text-red-400 text-center py-20">{error}</div>
      )}

      {!loading && !error && (
        <div className="space-y-4">
          {articles.map((article, i) => (
            <a
              key={i}
              href={article.url ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              className={`block bg-gray-900 border border-gray-800 rounded-xl p-6 transition-colors ${article.url ? "hover:border-gray-600 cursor-pointer" : "cursor-default"}`}
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <h2 className="text-base font-semibold leading-snug">{article.title}</h2>
                <span className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full border ${sentimentStyle[article.sentiment] ?? sentimentStyle.neutraal}`}>
                  {article.sentiment}
                </span>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed">{article.summary}</p>
              {article.url && (
                <p className="text-blue-400 text-xs mt-3">Lees meer →</p>
              )}
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
