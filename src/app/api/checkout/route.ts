import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function POST(req: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Stripe niet geconfigureerd" }, { status: 503 })
  }
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) => toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 })

  const { priceId, tierId } = await req.json()
  if (!priceId) return NextResponse.json({ error: "Geen priceId" }, { status: 400 })

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? req.headers.get("origin") ?? "http://localhost:3000"

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    customer_email: user.email,
    metadata: { userId: user.id, tierId },
    success_url: `${baseUrl}/betaald?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/prijzen`,
  })

  return NextResponse.json({ url: session.url })
}
