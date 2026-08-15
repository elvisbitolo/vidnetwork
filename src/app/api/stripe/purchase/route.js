import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { getSubscription, isActiveSub } from "@/lib/server/subscription";
import { getStripe } from "@/lib/server/stripe";
import { appOrigin } from "@/lib/server/origin";
import { getCourse } from "@/lib/server/courses";
import { getEvent } from "@/lib/server/events";
import { getSpace } from "@/lib/server/spaces";
import {
  PURCHASE_TYPES,
  PURCHASE_COLLECTIONS,
  isPurchasable,
  hasPurchased,
  getOrCreateStripePrice,
} from "@/lib/server/purchases";
import {
  getPromoByCode,
  validatePromo,
  getOrCreateStripeCoupon,
  normalizeCode,
} from "@/lib/server/promocodes";
import { rateLimitGuard } from "@/lib/server/rate-limit";
import { logError } from "@/lib/server/log";

function targetPage(targetType) {
  if (targetType === "course") return "/courses";
  if (targetType === "event") return "/events";
  return "/spaces";
}

export async function POST(req) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const sub = await getSubscription(user.uid);
  if (!isActiveSub(sub)) {
    return NextResponse.json({ error: "Active membership required" }, { status: 403 });
  }

  const limited = rateLimitGuard(`purchase:${user.uid}`, { limit: 10 });
  if (limited) return limited;

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const { targetType, targetId, promoCode } = body || {};
  if (!PURCHASE_TYPES.includes(targetType) || typeof targetId !== "string" || !targetId) {
    return NextResponse.json({ error: "A purchasable target is required" }, { status: 400 });
  }

  let promo = null;
  if (promoCode) {
    promo = await getPromoByCode(promoCode);
    const verdict = validatePromo(promo);
    if (!verdict.ok) {
      return NextResponse.json({ error: verdict.reason }, { status: 400 });
    }
  }

  const loader = targetType === "course" ? getCourse : targetType === "event" ? getEvent : getSpace;
  const item = await loader(targetId);
  if (!item) {
    return NextResponse.json({ error: "Target not found" }, { status: 404 });
  }
  if (!isPurchasable(item)) {
    return NextResponse.json({ error: "This item is not for sale" }, { status: 400 });
  }
  if (await hasPurchased(user.uid, targetType, targetId)) {
    return NextResponse.json({ error: "You already have access to this" }, { status: 409 });
  }

  try {
    const stripe = getStripe();
    const collection = PURCHASE_COLLECTIONS[targetType];
    const price = await getOrCreateStripePrice({
      targetType,
      targetId,
      collection,
      item,
    });
    const origin = appOrigin(req);
    const page = targetPage(targetType);
    const coupon = promo ? await getOrCreateStripeCoupon(promo) : null;
    const session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        line_items: [{ price: price.id, quantity: 1 }],
        ...(coupon ? { discounts: [{ coupon: coupon.id }] } : {}),
        customer_email: user.email || undefined,
        metadata: {
          uid: user.uid,
          targetType,
          targetId,
          promoCode: promo ? promo.code : "",
        },
        success_url: `${origin}${page}?purchase=success`,
        cancel_url: `${origin}${page}?purchase=cancelled`,
      },
      { idempotencyKey: `purchase:${targetType}:${targetId}:${user.uid}:${normalizeCode(promo?.code || "")}` }
    );
    return NextResponse.json({ url: session.url });
  } catch (err) {
    logError("stripe.purchase_session_failed", {
      uid: user.uid,
      targetType,
      targetId,
      error: err.message,
    });
    return NextResponse.json({ error: "Could not start checkout" }, { status: 502 });
  }
}
