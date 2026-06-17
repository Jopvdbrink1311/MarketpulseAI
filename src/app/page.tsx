"use client"

import { useEffect, useRef } from "react"
import Link from "next/link"

const TICKERS = [
  { symbol: "AAPL", price: 211.45, change: +2.79 },
  { symbol: "NVDA", price: 135.72, change: +1.08 },
  { symbol: "TSLA", price: 248.91, change: -0.44 },
  { symbol: "MSFT", price: 512.33, change: +0.79 },
  { symbol: "AMZN", price: 234.60, change: +3.12 },
  { symbol: "S&P 500", price: 5821.35, change: +1.08 },
  { symbol: "NASDAQ", price: 19204.22, change: +1.88 },
  { symbol: "AEX", price: 942.18, change: +0.57 },
  { symbol: "META", price: 612.44, change: +1.34 },
  { symbol: "GOOGL", price: 178.92, change: +0.91 },
  { symbol: "BRK.B", price: 453.21, change: -0.12 },
  { symbol: "JPM", price: 248.67, change: +0.65 },
]

type Particle = {
  x: number
  y: number
  vx: number
  vy: number
  ticker: { symbol: string; price: number; change: number }
  opacity: number
  fontSize: number
}

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener("resize", resize)

    const particles: Particle[] = Array.from({ length: 35 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 2.5,
      vy: (Math.random() - 0.5) * 2.5,
      ticker: TICKERS[Math.floor(Math.random() * TICKERS.length)],
      opacity: 0.25 + Math.random() * 0.4,
      fontSize: 12 + Math.floor(Math.random() * 14),
    }))

    type Line = {
      x: number
      y: number
      points: number[]
      speed: number
      opacity: number
      color: string
      width: number
    }

    const lines: Line[] = Array.from({ length: 8 }, () => {
      const rising = Math.random() > 0.35
      const pts = Array.from({ length: 40 }, (_, i) => {
        const trend = rising ? -i * 2.5 : i * 1.5
        return trend + (Math.random() - 0.5) * 18
      })
      return {
        x: Math.random() * window.innerWidth,
        y: 100 + Math.random() * (window.innerHeight - 200),
        points: pts,
        speed: 0.4 + Math.random() * 0.8,
        opacity: 0.12 + Math.random() * 0.2,
        color: rising ? "34,197,94" : "239,68,68",
        width: 1 + Math.random() * 1.5,
      }
    })

    let frame: number
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // draw lines
      for (const line of lines) {
        line.x -= line.speed
        if (line.x < -300) {
          line.x = canvas.width + 100
          line.y = 100 + Math.random() * (canvas.height - 200)
        }

        ctx.beginPath()
        ctx.strokeStyle = `rgba(${line.color}, ${line.opacity})`
        ctx.lineWidth = line.width
        ctx.lineJoin = "round"
        const segW = 8
        for (let i = 0; i < line.points.length; i++) {
          const px = line.x + i * segW
          const py = line.y + line.points[i]
          i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)
        }
        ctx.stroke()
      }

      // draw ticker text
      for (const p of particles) {
        p.x += p.vx
        p.y += p.vy

        if (p.x < -200) p.x = canvas.width + 100
        if (p.x > canvas.width + 200) p.x = -100
        if (p.y < -50) p.y = canvas.height + 50
        if (p.y > canvas.height + 50) p.y = -50

        const isPos = p.ticker.change >= 0
        const color = isPos ? `rgba(34, 197, 94, ${p.opacity})` : `rgba(239, 68, 68, ${p.opacity})`

        ctx.font = `${p.fontSize}px monospace`
        ctx.fillStyle = color
        ctx.fillText(
          `${p.ticker.symbol}  $${p.ticker.price.toLocaleString("en-US", { minimumFractionDigits: 2 })}  ${isPos ? "▲" : "▼"} ${Math.abs(p.ticker.change).toFixed(2)}%`,
          p.x,
          p.y
        )
      }

      frame = requestAnimationFrame(draw)
    }

    draw()
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener("resize", resize)
    }
  }, [])

  return (
    <main className="relative min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center px-6 overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />

      {/* gradient overlay */}
      <div className="absolute inset-0 bg-gradient-radial pointer-events-none" style={{
        background: "radial-gradient(ellipse at center, transparent 0%, rgba(3,7,18,0.85) 70%)"
      }} />

      <div className="relative z-10 max-w-2xl text-center space-y-6">
        <div className="inline-block bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium px-4 py-1.5 rounded-full">
          Binnenkort beschikbaar
        </div>

        <h1 className="text-5xl font-bold tracking-tight">
          Market<span className="text-blue-500">Pulse</span> AI
        </h1>

        <p className="text-lg text-gray-400 leading-relaxed">
          Realtime marktinzichten, aangedreven door AI. Volg aandelen,
          analyseer trends en neem betere beslissingen — allemaal op één plek.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Link href="/login" className="bg-blue-600 hover:bg-blue-500 transition-colors px-6 py-3 rounded-lg font-medium">
            Aan de slag
          </Link>
          <Link href="/dashboard" className="border border-gray-700 hover:border-gray-500 transition-colors px-6 py-3 rounded-lg font-medium text-gray-300">
            Dashboard bekijken
          </Link>
        </div>
      </div>
    </main>
  )
}
