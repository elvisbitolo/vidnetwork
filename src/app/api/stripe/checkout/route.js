import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { getStripe } from "@/lib/server/stripe";
import { TIERS, TIER_INFO, priceIdFor } from "@/lib/server/plans";
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

const FOUNDING_META_REF = () => adminDb().collection("meta").doc("founding");

async function foundingSlotAvailable() {
  const doc = await FOUNDING_META_REF().get();
  const used = doc.exists ? Number(doc.data()?.usedCount || 0) : 0;
  return used < TIER_INFO.lounge.founding.slots;
}

async function reserveFoundingSlot() {
  await adminDb().runTransaction(async (tx) => {
    const ref = FOUNDING_META_REF();
    const snap = await tx.get(ref);
    const used = snap.exists ? Number(snap.data()?.usedCount || 0) : 0;
    if (used >= TIER_INFO.lounge.founding.slots) return { ok: false };
    tx.set(
      ref,
      { usedCount: used + 1, updatedAt: new Date() },
      { merge: true }
    );
    return { ok: true };
  });
  return true;
}

export async function POST(req) {
  const auth = await requireUser();
  const denied = guardJson(auth);
  if (denied) return denied;

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const limited = rateLimitGuard(`checkout:${auth.user.uid}`, { limit: 10 });
  if (limited) return limited;
  const limitedIp = rateLimitGuard(`checkout-ip:${ip}`, { limit: 30 });
  if (limitedIp) return limitedIp;

  try {
    return await handleCheckout(req, auth);
  } catch (err) {
    return NextResponse.json(
      { error: `Checkout failed: ${err?.message || "Unexpected error"}` },
      { status: 500 }
    );
  }
}

async function handleCheckout(req, auth) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const { plan, tier = "lounge", promoCode } = body || {};
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
    status: "all",
    limit: 10,
  });
  const activeSub = activeSubs.data.find((sub) => ACTIVE_STATUSES.includes(sub.status));

  let priceId = priceIdFor(tier, planKey);
  let isFounding = false;

  const foundingEligible =
    tier === "lounge" &&
    planKey === "MONTHLY" &&
    !activeSub &&
    !userDoc?.foundingMember &&
    (await foundingSlotAvailable());

  if (foundingEligible) {
    const foundingPriceId =
      process.env.STRIPE_PRICE_LOUNGE_FOUNDING_MONTHLY ||
      null;
    if (foundingPriceId) {
      priceId = foundingPriceId;
      isFounding = true;
    }
  } else if (isFounding) {
    priceId = priceIdFor(tier, planKey);
    isFounding = false;
  }

  if (!priceId) {
    return NextResponse.json(
      { error: "Pricing not configured for this tier" },
      { status: 500 }
    );
  }

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

    const coupon = promo ? await getOrCreateStripeCoupon(promo) : null;

    await stripe.subscriptions.update(activeSub.id, {
      items: [{ id: activeSub.items.data[0].id, price: priceId }],
      metadata: { tier },
      proration_behavior: "create_prorations",
      ...(coupon ? { coupon: coupon.id } : {}),
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
      actorName: userDoc?.name || auth.user.email || "",
      action: "billing.plan_changed",
      targetId: activeSub.id,
      metadata: { fromPrice: currentPriceId, toPrice: priceId, tier },
      createdAt: new Date(),
    });

    return NextResponse.json({ switched: true, tier });
  }

  if (isFounding) {
    await reserveFoundingSlot();
    await adminDb().collection("users").doc(auth.user.uid).update({
      foundingMember: true,
      foundingTier: "lounge",
      foundingAt: new Date(),
    });
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
  const metadata = {
    uid: auth.user.uid,
    tier,
    ...(isFounding ? { founding: "true" } : {}),
    promoCode: promo ? promo.code : "",
  };

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    ...(coupon ? { discounts: [{ coupon: coupon.id }] } : {}),
    metadata,
    subscription_data: {
      ...subscriptionData,
      metadata,
    },
    payment_method_collection: isFirstSubscription ? "if_required" : "always",
    payment_method_types: isFirstSubscription ? ["card"] : ["card", "paypal"],
    success_url: `${origin}/account?checkout=success`,
    cancel_url: `${origin}/pricing`,
  });

  return NextResponse.json({ url: session.url, plan });
}