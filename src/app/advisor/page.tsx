"use client"

import { useState, useRef, useEffect } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

type Message = {
  role: "user" | "assistant"
  content: string
}

const SUGGESTIONS = [
  "Hoe ziet de markt er vandaag uit?",
  "Is het een goed moment om Apple te kopen?",
  "Wat is het verschil tussen aandelen en ETFs?",
  "Hoe kan ik mijn portfolio spreiden?",
]

type RiskProfile = "laag" | "gemiddeld" | "hoog"

const RISK_OPTIONS: { value: RiskProfile; label: string; desc: string }[] = [
  { value: "laag", label: "Laag", desc: "ETFs, dividendaandelen, obligaties" },
  { value: "gemiddeld", label: "Gemiddeld", desc: "Mix van groei en stabiliteit" },
  { value: "hoog", label: "Hoog", desc: "Groeiaandelen, crypto, kleine bedrijven" },
]

export default function AdvisorPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [marketData, setMarketData] = useState("")
  const [riskProfile, setRiskProfile] = useState<RiskProfile>("gemiddeld")
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch("/api/quotes")
      .then((r) => r.json())
      .then((data) => {
        if (!Array.isArray(data)) return
        setMarketData(
          data.map((q: { name: string; price: number; changePercent: number }) =>
            `${q.name}: $${q.price.toFixed(2)} (${q.changePercent >= 0 ? "+" : ""}${q.changePercent.toFixed(2)}%)`
          ).join("\n")
        )
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, loading])

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return

    const newMessages: Message[] = [...messages, { role: "user", content: text }]
    setMessages(newMessages)
    setInput("")
    setLoading(true)

    try {
      const res = await fetch("/api/advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages, marketData, riskProfile }),
      })

      if (!res.body) throw new Error("Geen response")

      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setMessages([...newMessages, { role: "assistant", content: data.text }])
    } catch {
      setMessages([...newMessages, { role: "assistant", content: "Er ging iets mis. Probeer het opnieuw." }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-10 flex flex-col" style={{ height: "calc(100vh - 65px)" }}>
      <div className="mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">AI Adviseur</h1>
            <p className="text-gray-400 text-sm mt-1">Stel vragen over markten, aandelen en beleggen</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide">Risicoprofiel</p>
            <div className="flex bg-gray-900 border border-gray-800 rounded-xl p-1 gap-1">
              {RISK_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setRiskProfile(opt.value)}
                  title={opt.desc}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    riskProfile === opt.value
                      ? opt.value === "laag"
                        ? "bg-blue-600/20 text-blue-400 border border-blue-500/40"
                        : opt.value === "hoog"
                        ? "bg-red-600/20 text-red-400 border border-red-500/40"
                        : "bg-yellow-600/20 text-yellow-400 border border-yellow-500/40"
                      : "text-gray-500 hover:text-white"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 mb-6">
        {messages.length === 0 && (
          <div className="space-y-3 pt-4">
            <p className="text-gray-500 text-sm text-center mb-6">Kies een vraag of typ zelf iets</p>
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => sendMessage(s)}
                className="w-full text-left bg-gray-900 border border-gray-800 hover:border-gray-600 transition-colors rounded-xl px-5 py-4 text-gray-300"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-900 border border-gray-800 text-gray-100 prose prose-invert prose-sm max-w-none"
              }`}
            >
              {msg.role === "user" ? msg.content : (
                msg.content
                  ? <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                  : loading && i === messages.length - 1
                    ? <span className="text-gray-500">Aan het typen...</span>
                    : null
              )}
            </div>
          </div>
        ))}

        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); sendMessage(input) }}
        className="flex gap-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Stel een vraag..."
          disabled={loading}
          className="flex-1 bg-gray-900 border border-gray-700 focus:border-blue-500 outline-none rounded-xl px-4 py-3 text-white placeholder-gray-500 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 transition-colors px-5 py-3 rounded-xl font-medium"
        >
          Stuur
        </button>
      </form>
    </div>
  )
}
