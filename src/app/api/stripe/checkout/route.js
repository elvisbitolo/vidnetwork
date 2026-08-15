import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { getStripe } from "@/lib/server/stripe";
import { TIERS, priceIdFor } from "@/lib/server/plans";
import { requireUser, guardJson } from "@/lib/server/authorize";
import { rateLimitGuard } from "@/lib/server/rate-limit";
import { planChange, buildSubscriptionDoc } from "@/lib/server/billing";
import { appOrigin } from "@/lib/server/origin";
import {
  getPromoByCode,
  validatePromo,
  getOrCreateStripeCoupon,
} from "@/lib/server/promocodes";

const ALLOWED_PLANS = {
  monthly: "MONTHLY",
  yearly: "YEARLY",
};

const ACTIVE_STATUSES = ["active", "trialing", "past_due"];

export async function POST(req) {
  const auth = await requireUser();
  const denied = guardJson(auth);
  if (denied) return denied;

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const limited = rateLimitGuard(`checkout:${auth.user.uid}`, { limit: 10 });
  if (limited) return limited;
  const limitedIp = rateLimitGuard(`checkout-ip:${ip}`, { limit: 30 });
  if (limitedIp) return limitedIp;

  const { plan, tier = "standard", promoCode } = await req.json();
  const planKey = ALLOWED_PLANS[plan];
  if (!planKey) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }
  if (!TIERS.includes(tier)) {
    return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
  }

  let promo = null;
  if (promoCode) {
    promo = await getPromoByCode(promoCode);
    const verdict = validatePromo(promo);
    if (!verdict.ok) {
      return NextResponse.json({ error: verdict.reason }, { status: 400 });
    }
  }

  const priceId = priceIdFor(tier, planKey);
  if (!priceId) {
    return NextResponse.json(
      { error: "Pricing not configured for this tier" },
      { status: 500 }
    );
  }

  const stripe = getStripe();
  const origin = appOrigin(req);

  const userDoc = auth.userDoc;
  let customerId = userDoc?.stripeCustomerId;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: auth.user.email,
      metadata: { uid: auth.user.uid },
    });
    customerId = customer.id;
    await adminDb().collection("users").doc(auth.user.uid).update({ stripeCustomerId: customerId });
  }

  const allSubs = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 1,
  });
  const isFirstSubscription = allSubs.data.length === 0;

  const activeSubs = await stripe.subscriptions.list({
    customer: customerId,
    status: ACTIVE_STATUSES.join(","),
    limit: 1,
  });
  const activeSub = activeSubs.data[0];

  if (activeSub) {
    const currentPriceId = activeSub.items.data[0]?.price?.id;
    const action = planChange({
      currentStatus: activeSub.status,
      currentPriceId,
      requestedPriceId: priceId,
    });

    if (action === "none") {
      return NextResponse.json({ switched: true, tier, unchanged: true });
    }

    await stripe.subscriptions.update(activeSub.id, {
      items: [{ id: activeSub.items.data[0].id, price: priceId }],
      metadata: { tier },
      proration_behavior: "create_prorations",
    });

    const customer = await stripe.customers.retrieve(customerId);
    await adminDb().collection("subscriptions").doc(auth.user.uid).set(
      buildSubscriptionDoc({
        subscription: {
          ...activeSub,
          metadata: { tier },
          items: { data: [{ price: { id: priceId, recurring: { interval: plan === "yearly" ? "year" : "month" } } }] },
        },
        customer,
        tier,
      })
    );

    await adminDb().collection("auditLogs").add({
      actorId: auth.user.uid,
      actorName: auth.userDoc?.name || auth.user.email || "",
      action: "billing.plan_changed",
      targetId: activeSub.id,
      metadata: { fromPrice: currentPriceId, toPrice: priceId, tier },
      createdAt: new Date(),
    });

    return NextResponse.json({ switched: true, tier });
  }

  const subscriptionData = isFirstSubscription
    ? {
        trial_period_days: 14,
        trial_settings: {
          end_behavior: { missing_payment_method: "cancel" },
        },
      }
    : {};

  const coupon = promo ? await getOrCreateStripeCoupon(promo) : null;

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    ...(coupon ? { discounts: [{ coupon: coupon.id }] } : {}),
    metadata: { uid: auth.user.uid, tier, promoCode: promo ? promo.code : "" },
    subscription_data: {
      ...subscriptionData,
      metadata: { tier, promoCode: promo ? promo.code : "" },
    },
    payment_method_collection: isFirstSubscription ? "if_required" : "always",
    payment_method_types: ["card", "paypal"],
    success_url: `${origin}/account?checkout=success`,
    cancel_url: `${origin}/pricing`,
  });

  return NextResponse.json({ url: session.url, plan });
}
