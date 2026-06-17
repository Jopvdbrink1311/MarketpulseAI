"use client"

import { useEffect, useState } from "react"
import { LineChart, Line, ResponsiveContainer } from "recharts"

export function SparklineChart({ symbol, positive, height = 48 }: { symbol: string; positive: boolean; height?: number }) {
  const [data, setData] = useState<{ price: number }[]>([])

  useEffect(() => {
    fetch(`/api/chart?symbol=${encodeURIComponent(symbol)}&range=5d`)
      .then(r => r.json())
      .then(d => { if (d.data) setData(d.data) })
      .catch(() => {})
  }, [symbol])

  if (data.length < 2) return <div style={{ height }} className="w-full" />

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data}>
        <Line
          type="monotone"
          dataKey="price"
          stroke={positive ? "#22c55e" : "#ef4444"}
          strokeWidth={1.5}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
