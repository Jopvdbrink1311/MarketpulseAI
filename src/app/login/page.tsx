"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase"
import Link from "next/link"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isSignUp, setIsSignUp] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    const supabase = createClient()

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) {
        setError(error.message)
      } else {
        setError("Check je e-mail om je account te bevestigen.")
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError(error.message)
      } else {
        router.push("/dashboard")
        router.refresh()
      }
    }

    setLoading(false)
  }

  return (
    <div className="min-h-[calc(100vh-65px)] flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-2">
          {isSignUp ? "Account aanmaken" : "Inloggen"}
        </h1>
        <p className="text-gray-400 mb-8 text-sm">
          {isSignUp ? "Al een account?" : "Nog geen account?"}{" "}
          <button
            onClick={() => { setIsSignUp(!isSignUp); setError("") }}
            className="text-blue-400 hover:text-blue-300"
          >
            {isSignUp ? "Inloggen" : "Registreren"}
          </button>
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">E-mailadres</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
              placeholder="jij@email.com"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Wachtwoord</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 transition-colors py-3 rounded-lg font-medium"
          >
            {loading ? "Bezig..." : isSignUp ? "Account aanmaken" : "Inloggen"}
          </button>
        </form>
      </div>
    </div>
  )
}
