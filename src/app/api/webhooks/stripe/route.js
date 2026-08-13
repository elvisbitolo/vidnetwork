import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { getStripe } from "@/lib/server/stripe";

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
    return NextResponse.json({ error: `Webhook signature invalid: ${err.message}` }, { status: 400 });
  }

  async function uidFromSubscription(subscriptionId) {
    const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
    const customer = await getStripe().customers.retrieve(subscription.customer);
    if (customer.deleted || !customer.metadata?.uid) {
      throw new Error(`No uid on customer ${subscription.customer}`);
    }
    return { subscription, customer, uid: customer.metadata.uid };
  }

  function tierFromSessionOrSub(session, subscription) {
    return session?.metadata?.tier || subscription?.metadata?.tier || "standard";
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const { subscription, uid } = await uidFromSubscription(session.subscription);
        const plan = subscription.items.data[0]?.price?.recurring?.interval === "year" ? "yearly" : "monthly";
        await adminDb().collection("subscriptions").doc(uid).set({
          status: subscription.status,
          plan,
          tier: tierFromSessionOrSub(session, subscription),
          stripeSubscriptionId: subscription.id,
          currentPeriodEnd: subscription.current_period_end
            ? new Date(subscription.current_period_end * 1000)
            : null,
          trialEnd: subscription.trial_end
            ? new Date(subscription.trial_end * 1000)
            : null,
          updatedAt: new Date(),
        });
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object;
        const { uid } = await uidFromSubscription(subscription.id);
        const plan = subscription.items.data[0]?.price?.recurring?.interval === "year" ? "yearly" : "monthly";
        await adminDb().collection("subscriptions").doc(uid).set({
          status: subscription.status,
          plan,
          tier: subscription.metadata?.tier || "standard",
          stripeSubscriptionId: subscription.id,
          currentPeriodEnd: subscription.current_period_end
            ? new Date(subscription.current_period_end * 1000)
            : null,
          trialEnd: subscription.trial_end
            ? new Date(subscription.trial_end * 1000)
            : null,
          updatedAt: new Date(),
        });
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const { uid } = await uidFromSubscription(subscription.id);
        await adminDb().collection("subscriptions").doc(uid).update({
          status: "canceled",
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          updatedAt: new Date(),
        });
        break;
      }

      default:
        break;
    }
  } catch (err) {
    console.error("Webhook handler failed:", err.message);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
