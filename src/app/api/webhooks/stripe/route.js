import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { getStripe } from "@/lib/server/stripe";
import { buildSubscriptionDoc, fromEpoch } from "@/lib/server/billing";
import { createNotification } from "@/lib/server/notifications";
import { sendEmail } from "@/lib/server/email";
import { recordPurchase, PURCHASE_TYPES, verifyPurchaseAmount } from "@/lib/server/purchases";
import { getCourse } from "@/lib/server/courses";
import { getEvent } from "@/lib/server/events";
import { getSpace } from "@/lib/server/spaces";
import { runAutomations } from "@/lib/server/automations";
import { recordPromoUse } from "@/lib/server/promocodes";
import { logError } from "@/lib/server/log";

async function loadTarget(targetType, targetId) {
  if (targetType === "course") return getCourse(targetId);
  if (targetType === "event") return getEvent(targetId);
  return getSpace(targetId);
}

async function markEvent(eventId, status, error = "", extra = {}) {
  await adminDb().collection("stripeEvents").doc(eventId).set({
    status,
    error: error || "",
    receivedAt: new Date(),
    processedAt: new Date(),
    ...extra,
  });
}

async function syncSubscription(subscriptionId) {
  const subscription = await getStripe().subscriptions.retrieve(subscriptionId, {
    expand: ["customer"],
  });
  const customer = subscription.customer;
  if (customer?.deleted || !customer?.metadata?.uid) {
    throw new Error(`No uid on customer ${subscription.customer}`);
  }
  const uid = customer.metadata.uid;
  const existing = await adminDb().collection("subscriptions").doc(uid).get();
  const tier = subscription.metadata?.tier || existing.data()?.tier || "lounge";
  await adminDb()
    .collection("subscriptions")
    .doc(uid)
    .set(buildSubscriptionDoc({ subscription, customer, tier }));
  return { uid, customer, subscription };
}

async function notifyBilling(uid, text) {
  await createNotification({
    userId: uid,
    type: "billing",
    actorId: "",
    actorName: "Community",
    targetId: "",
    href: "/account",
    text,
  });
}

export async function POST(req) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "STRIPE_WEBHOOK_SECRET not set" },
      { status: 500 }
    );
  }

  const payload = await req.text();
  const signature = req.headers.get("stripe-signature");

  let event;
  try {
    event = getStripe().webhooks.constructEvent(payload, signature, secret);
  } catch (err) {
    return NextResponse.json(
      { error: `Webhook signature invalid: ${err.message}` },
      { status: 400 }
    );
  }

  try {
    await adminDb().collection("stripeEvents").doc(event.id).create({
      status: "processing",
      type: event.type,
      receivedAt: new Date(),
    });
  } catch {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    let shouldMarkProcessed = true;
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        if (
          session.metadata?.uid &&
          PURCHASE_TYPES.includes(session.metadata?.targetType) &&
          session.metadata?.targetId
        ) {
          const uid = session.metadata.uid;
          const { targetType, targetId } = session.metadata;
          const item = await loadTarget(targetType, targetId);
          const paid = Number(session.amount_subtotal) || Number(session.amount_total) || 0;
          const expected = Number(item?.purchasePriceCents) || 0;
          const verified = verifyPurchaseAmount(paid, expected);
          if (!verified.ok) {
            shouldMarkProcessed = false;
            await markEvent(event.id, "failed", verified.reason, { type: event.type });
            const paymentIntent =
              typeof session.payment_intent === "string"
                ? session.payment_intent
                : session.payment_intent?.id;
            if (paymentIntent) {
              try {
                await getStripe().refunds.create({ payment_intent: paymentIntent });
                logError("stripe.purchase_amount_mismatch_refunded", {
                  uid,
                  targetType,
                  targetId,
                  paid,
                  expected,
                  reason: verified.reason,
                });
              } catch (refundErr) {
                logError("stripe.refund_failed", {
                  uid,
                  targetType,
                  targetId,
                  paymentIntent,
                  error: refundErr.message,
                });
              }
            }
            break;
          }
          await recordPurchase({
            uid,
            targetType,
            targetId,
            sessionId: session.id,
            promoCode: session.metadata?.promoCode || "",
          });
          if (session.payment_intent) {
            await adminDb()
              .collection("stripePayments")
              .doc(typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent.id)
              .set({
                uid,
                targetType,
                targetId,
                sessionId: session.id,
                createdAt: new Date(),
              });
          }
          if (session.metadata?.promoCode) {
            await recordPromoUse(session.metadata.promoCode).catch((err) => {
              logError("promo.record_use_failed", { code: session.metadata.promoCode, error: err.message });
            });
          }
          const label = item?.title || item?.name || "content";
          await createNotification({
            userId: uid,
            type: "purchase",
            actorId: "",
            actorName: "Community",
            targetId,
            href: targetType === "course" ? `/courses/${targetId}` : targetType === "event" ? "/events" : `/spaces/${item?.slug || ""}`,
            text: `You now have access to "${label}"`,
          });
          await runAutomations("purchase", {
            subjectUid: uid,
            subjectName: session.customer_details?.name || session.customer_email || "Member",
            memberName: session.customer_details?.name || session.customer_email || "Member",
            memberEmail: session.customer_email || "",
            targetType,
            targetId,
            itemName: label,
            priceCents: paid,
            spaceId: targetType === "space" ? targetId : (item?.spaceId || ""),
          }).catch((err) => {
            logError("automation.purchase_hook_failed", { uid, targetType, targetId, error: err.message });
          });
          if (session.customer_details?.email) {
            await sendEmail({
              to: session.customer_details.email,
              subject: `Your purchase of "${label}" is complete`,
              text: `Thanks for buying "${label}". You now have access — enjoy!\n\n— The Yarnery Lounge Team`,
            }).catch(() => {});
          }
          break;
        }
        if (!session.subscription) break;
        const { uid, subscription } = await syncSubscription(session.subscription);
        if (session.metadata?.promoCode) {
          await recordPromoUse(session.metadata.promoCode).catch((err) => {
            logError("promo.record_use_failed", { code: session.metadata.promoCode, error: err.message });
          });
        }
        if (subscription.status === "trialing") {
          await notifyBilling(
            uid,
            "Your 14-day free trial has started. Explore the community, rooms and courses."
          );
        }
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object;
        const paymentIntentId =
          typeof charge.payment_intent === "string"
            ? charge.payment_intent
            : charge.payment_intent?.id;
        if (paymentIntentId) {
          try {
            const mapSnap = await adminDb().collection("stripePayments").doc(paymentIntentId).get();
            const mapped = mapSnap.exists ? mapSnap.data() : null;
            if (mapped?.uid && mapped?.targetType && mapped?.targetId) {
              await adminDb()
                .collection("purchases")
                .doc(`${mapped.uid}_${mapped.targetType}_${mapped.targetId}`)
                .delete();
              logError("stripe.purchase_refunded_access_revoked", {
                uid: mapped.uid,
                targetType: mapped.targetType,
                targetId: mapped.targetId,
                paymentIntentId,
              });
            } else {
              const intent = await getStripe().paymentIntents.retrieve(paymentIntentId);
              const meta = intent?.metadata || {};
              const { uid, targetType, targetId } = meta;
              if (uid && PURCHASE_TYPES.includes(targetType) && targetId) {
                await adminDb().collection("purchases").doc(`${uid}_${targetType}_${targetId}`).delete();
                logError("stripe.purchase_refunded_access_revoked", {
                  uid,
                  targetType,
                  targetId,
                  paymentIntentId,
                });
              }
            }
          } catch (err) {
            logError("stripe.refund_revoke_failed", { paymentIntentId, error: err.message });
          }
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.paused":
      case "customer.subscription.resumed": {
        const subscription = event.data.object;
        await syncSubscription(subscription.id);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const { uid } = await syncSubscription(subscription.id);
        await adminDb().collection("subscriptions").doc(uid).update({
          status: "canceled",
          canceledAt: fromEpoch(subscription.canceled_at) || new Date(),
          updatedAt: new Date(),
        });
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object;
        if (!invoice.subscription) break;
        await syncSubscription(invoice.subscription);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object;
        if (!invoice.subscription) break;
        const { uid, customer } = await syncSubscription(invoice.subscription);
        await adminDb().collection("subscriptions").doc(uid).update({
          status: "past_due",
          updatedAt: new Date(),
        });
        await notifyBilling(
          uid,
          "Your payment didn't go through. Update your payment method to keep your membership active."
        );
        if (customer?.email) {
          await sendEmail({
            to: customer.email,
            subject: "Your Community payment failed",
            text: "We couldn't charge your card for your membership. Update your payment method in your account to keep access.",
          }).catch(() => {});
        }
        break;
      }

      case "invoice.upcoming": {
        const invoice = event.data.object;
        if (!invoice.subscription) break;
        const subscription = await getStripe().subscriptions.retrieve(
          invoice.subscription,
          { expand: ["customer"] }
        );
        const customer = subscription.customer;
        const uid = customer?.metadata?.uid;
        if (!uid) break;
        if (subscription.status === "trialing") {
          await notifyBilling(
            uid,
            "Your free trial ends soon. Add a payment method so your membership continues uninterrupted."
          );
          if (customer.email) {
            await sendEmail({
              to: customer.email,
              subject: "Your Community free trial ends soon",
              text: "Add a payment method before the trial ends so you don't lose access.",
            }).catch(() => {});
          }
        }
        break;
      }

      default:
        await markEvent(event.id, "skipped", "", {
          type: event.type,
        });
        break;
    }

    if (shouldMarkProcessed) {
      await markEvent(event.id, "processed", "", { type: event.type });
    }
  } catch (err) {
    logError("stripe.webhook_failed", { event: event.id, type: event.type, error: err.message });
    await markEvent(event.id, "failed", err.message, { type: event.type });
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
