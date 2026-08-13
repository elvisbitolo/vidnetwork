import { NextResponse } from "next/server";
import { getCurrentUser, getUserDoc } from "@/lib/server/auth";
import { adminDb } from "@/lib/firebase/admin";
import { getStripe } from "@/lib/server/stripe";
import { TIERS, priceIdFor } from "@/lib/server/plans";

const ALLOWED_PLANS = {
  monthly: "MONTHLY",
  yearly: "YEARLY",
};

export async function POST(req) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { plan, tier = "standard" } = await req.json();
  const planKey = ALLOWED_PLANS[plan];
  if (!planKey) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }
  if (!TIERS.includes(tier)) {
    return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
  }

  const priceId = priceIdFor(tier, planKey);
  if (!priceId) {
    return NextResponse.json(
      { error: "Pricing not configured for this tier" },
      { status: 500 }
    );
  }

  const stripe = getStripe();
  const origin = req.headers.get("origin") || "http://localhost:3000";

  const userDoc = await getUserDoc(user.uid);
  let customerId = userDoc?.stripeCustomerId;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { uid: user.uid },
    });
    customerId = customer.id;
    await adminDb().collection("users").doc(user.uid).update({ stripeCustomerId: customerId });
  }

  const existing = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 1,
  });
  const isFirstSubscription = existing.data.length === 0;

  const subscriptionData = isFirstSubscription
    ? {
        trial_period_days: 14,
        trial_settings: {
          end_behavior: { missing_payment_method: "cancel" },
        },
      }
    : {};

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    metadata: { uid: user.uid, tier },
    subscription_data: {
      ...subscriptionData,
      metadata: { tier },
    },
    payment_method_collection: isFirstSubscription ? "if_required" : "always",
    payment_method_types: ["card", "paypal"],
    success_url: `${origin}/account?checkout=success`,
    cancel_url: `${origin}/pricing`,
  });

  return NextResponse.json({ url: session.url });
}
