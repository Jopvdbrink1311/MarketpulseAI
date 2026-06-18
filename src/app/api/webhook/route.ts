import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { createClient } from "@supabase/supabase-js"

export async function POST(req: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Niet geconfigureerd" }, { status: 503 })
  }
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
  const body = await req.text()
  const sig = req.headers.get("stripe-signature")!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return NextResponse.json({ error: "Webhook verificatie mislukt" }, { status: 400 })
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session
    const userId = session.metadata?.userId
    const tierId = session.metadata?.tierId
    if (userId && tierId) {
      await supabaseAdmin.from("subscriptions").upsert({
        user_id: userId,
        tier: tierId,
        stripe_customer_id: session.customer as string,
        stripe_subscription_id: session.subscription as string,
        status: "active",
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" })
    }
  }

  if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object as Stripe.Subscription
    await supabaseAdmin
      .from("subscriptions")
      .update({ status: "cancelled", tier: "gratis", updated_at: new Date().toISOString() })
      .eq("stripe_subscription_id", sub.id)
  }

  return NextResponse.json({ received: true })
}
