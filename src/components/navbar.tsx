"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import type { User } from "@supabase/supabase-js"

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/advisor", label: "AI Adviseur" },
  { href: "/watchlist", label: "Watchlist" },
  { href: "/news", label: "Nieuws" },
]

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => setUser(data.user))

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/")
    router.refresh()
  }

  return (
    <nav className="border-b border-gray-800 bg-gray-950 px-6 py-4">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <Link href="/" className="text-lg font-bold text-white">
          Market<span className="text-blue-500">Pulse</span> AI
        </Link>

        <div className="flex items-center gap-1">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                pathname === link.href
                  ? "bg-gray-800 text-white"
                  : "text-gray-400 hover:text-white hover:bg-gray-800/50"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {user ? (
          <div className="flex items-center gap-3">
            <span className="text-gray-400 text-sm">{user.email}</span>
            <button
              onClick={handleLogout}
              className="border border-gray-700 hover:border-gray-500 transition-colors text-sm px-4 py-2 rounded-lg font-medium text-gray-300"
            >
              Uitloggen
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            className="bg-blue-600 hover:bg-blue-500 transition-colors text-sm px-4 py-2 rounded-lg font-medium"
          >
            Inloggen
          </Link>
        )}
      </div>
    </nav>
  )
}
