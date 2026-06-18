"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function BetaaldPage() {
  const router = useRouter()

  useEffect(() => {
    const timer = setTimeout(() => router.push("/dashboard"), 5000)
    return () => clearTimeout(timer)
  }, [router])

  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-green-500/20 border border-green-500/40 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold mb-2">Betaling geslaagd</h1>
        <p className="text-gray-400 mb-6">Je abonnement is actief. Je wordt doorgestuurd naar het dashboard.</p>
        <button onClick={() => router.push("/dashboard")}
          className="bg-blue-600 hover:bg-blue-500 transition-colors px-6 py-3 rounded-xl font-medium">
          Naar dashboard →
        </button>
      </div>
    </div>
  )
}
