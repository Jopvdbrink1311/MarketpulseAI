"use client"

import { useEffect, useState } from "react"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

type ChartPoint = { date: string; price: number }

const RANGES = ["1d", "5d", "1mo", "3mo", "1y"]

export default function StockChart({ symbol, name, onClose }: { symbol: string; name: string; onClose: () => void }) {
  const [data, setData] = useState<ChartPoint[]>([])
  const [range, setRange] = useState("1mo")
  const [loading, setLoading] = useState(true)
  const [currency, setCurrency] = useState("USD")

  useEffect(() => {
    setLoading(true)
    fetch(`/api/chart?symbol=${encodeURIComponent(symbol)}&range=${range}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d.data ?? [])
        setCurrency(d.currency ?? "USD")
      })
      .finally(() => setLoading(false))
  }, [symbol, range])

  const first = data[0]?.price ?? 0
  const last = data[data.length - 1]?.price ?? 0
  const isPositive = last >= first
  const color = isPositive ? "#22c55e" : "#ef4444"

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-2xl">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-xl font-bold">{name}</h2>
            <p className="text-gray-400 text-sm">{symbol.replace("^", "")}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none">×</button>
        </div>

        <div className="flex gap-2 mb-4">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                range === r ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white bg-gray-800"
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="h-64 flex items-center justify-center text-gray-500">Laden...</div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fill: "#6b7280", fontSize: 11 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis domain={["auto", "auto"]} tick={{ fill: "#6b7280", fontSize: 11 }} tickLine={false} axisLine={false} width={60}
                tickFormatter={(v) => `${currency === "EUR" ? "€" : "$"}${v.toLocaleString()}`}
              />
              <Tooltip
                contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151", borderRadius: "8px", fontSize: "12px" }}
                formatter={(v: number) => [`${currency === "EUR" ? "€" : "$"}${v.toFixed(2)}`, "Prijs"]}
              />
              <Area type="monotone" dataKey="price" stroke={color} strokeWidth={2} fill="url(#colorPrice)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
