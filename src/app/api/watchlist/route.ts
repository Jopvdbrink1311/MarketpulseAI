import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) => toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
      },
    }
  )
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 })

  const { data } = await supabase
    .from("watchlist")
    .select("symbol, name, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 })

  const { symbol, name } = await req.json()
  const { error } = await supabase.from("watchlist").insert({ user_id: user.id, symbol, name })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 })

  const { symbol } = await req.json()
  await supabase.from("watchlist").delete().eq("user_id", user.id).eq("symbol", symbol)

  return NextResponse.json({ ok: true })
}
