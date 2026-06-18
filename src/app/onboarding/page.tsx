"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

const DOELEN = [
  { value: "pensioen", label: "Pensioen", desc: "Rustig opbouwen voor later" },
  { value: "huis", label: "Een huis kopen", desc: "Sparen voor een grote aankoop" },
  { value: "groei", label: "Vermogen groeien", desc: "Mijn geld harder laten werken" },
  { value: "passief", label: "Passief inkomen", desc: "Elke maand dividend ontvangen" },
  { value: "leren", label: "Gewoon leren", desc: "Begrijpen hoe beleggen werkt" },
]

const HORIZONTEN = [
  { value: "kort", label: "Korte termijn", desc: "Minder dan 3 jaar" },
  { value: "middel", label: "Middellang", desc: "3 tot 10 jaar" },
  { value: "lang", label: "Lange termijn", desc: "Meer dan 10 jaar" },
]

const BEDRAGEN = [
  { value: "klein", label: "Minder dan €500", desc: "Per maand" },
  { value: "middel", label: "€500 – €1.000", desc: "Per maand" },
  { value: "groot", label: "Meer dan €1.000", desc: "Per maand" },
]

const RISICOS = [
  { value: "laag", label: "Veilig", desc: "Liever minder rendement dan risico lopen", color: "blue" },
  { value: "gemiddeld", label: "Gebalanceerd", desc: "Mix van groei en zekerheid", color: "yellow" },
  { value: "hoog", label: "Groeigerich", desc: "Ik accepteer schommelingen voor meer rendement", color: "red" },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [stap, setStap] = useState(0)
  const [doel, setDoel] = useState("")
  const [horizon, setHorizon] = useState("")
  const [bedrag, setBedrag] = useState("")
  const [risico, setRisico] = useState("")
  const [plan, setPlan] = useState("")
  const [loading, setLoading] = useState(false)

  async function genereerPlan() {
    setLoading(true)
    const res = await fetch("/api/startplan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ doel, horizon, bedrag, risico }),
    })
    const data = await res.json()
    setPlan(data.plan ?? "")
    localStorage.setItem("belegger_profiel", JSON.stringify({ doel, horizon, bedrag, risico }))
    setLoading(false)
    setStap(4)
  }

  const stappen = [
    {
      vraag: "Wat is jouw doel met beleggen?",
      opties: DOELEN,
      waarde: doel,
      setWaarde: setDoel,
    },
    {
      vraag: "Hoe lang wil je beleggen?",
      opties: HORIZONTEN,
      waarde: horizon,
      setWaarde: setHorizon,
    },
    {
      vraag: "Hoeveel wil je maandelijks inleggen?",
      opties: BEDRAGEN,
      waarde: bedrag,
      setWaarde: setBedrag,
    },
    {
      vraag: "Hoeveel risico vind je oké?",
      opties: RISICOS,
      waarde: risico,
      setWaarde: setRisico,
    },
  ]

  const huidigeStap = stappen[stap]

  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-xl">

        {stap < 4 && (
          <>
            {/* Progress */}
            <div className="flex gap-2 mb-10">
              {stappen.map((_, i) => (
                <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= stap ? "bg-blue-500" : "bg-gray-800"}`} />
              ))}
            </div>

            <p className="text-gray-400 text-sm mb-2">Stap {stap + 1} van 4</p>
            <h1 className="text-2xl font-bold mb-8">{huidigeStap.vraag}</h1>

            <div className="space-y-3 mb-10">
              {huidigeStap.opties.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => huidigeStap.setWaarde(opt.value)}
                  className={`w-full text-left px-5 py-4 rounded-2xl border transition-all ${
                    huidigeStap.waarde === opt.value
                      ? "border-blue-500 bg-blue-600/10"
                      : "border-gray-800 bg-gray-900 hover:border-gray-600"
                  }`}
                >
                  <p className={`font-semibold ${huidigeStap.waarde === opt.value ? "text-blue-400" : "text-white"}`}>
                    {opt.label}
                  </p>
                  <p className="text-gray-400 text-sm mt-0.5">{opt.desc}</p>
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              {stap > 0 && (
                <button onClick={() => setStap(s => s - 1)} className="px-5 py-3 text-gray-400 hover:text-white transition-colors">
                  ← Terug
                </button>
              )}
              <button
                onClick={() => stap < 3 ? setStap(s => s + 1) : genereerPlan()}
                disabled={!huidigeStap.waarde || loading}
                className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 transition-colors px-6 py-3 rounded-xl font-semibold"
              >
                {stap < 3 ? "Volgende →" : loading ? "Plan maken..." : "Maak mijn startplan →"}
              </button>
            </div>
          </>
        )}

        {stap === 4 && plan && (
          <div>
            <div className="mb-6">
              <h1 className="text-2xl font-bold">Jouw persoonlijke startplan</h1>
              <p className="text-gray-400 text-sm mt-1">Op basis van jouw antwoorden</p>
            </div>

            <div className="bg-gray-900 border border-blue-500/20 rounded-2xl p-6 mb-6">
              <div className="prose prose-invert prose-sm max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{plan}</ReactMarkdown>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => router.push("/papier")}
                className="flex-1 bg-blue-600 hover:bg-blue-500 transition-colors px-6 py-3 rounded-xl font-semibold"
              >
                Oefen met papierbeleggen →
              </button>
              <button
                onClick={() => router.push("/dashboard")}
                className="px-6 py-3 border border-gray-700 hover:border-gray-500 rounded-xl text-gray-300 transition-colors"
              >
                Naar dashboard
              </button>
            </div>
          </div>
        )}

        {stap === 4 && loading && (
          <div className="text-center py-16">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-400">Jouw startplan wordt gemaakt...</p>
          </div>
        )}
      </div>
    </div>
  )
}
