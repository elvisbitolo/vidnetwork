"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import styles from "./pricing.module.css";

const TIERS = [
  {
    id: "standard",
    name: "Standard",
    price: { monthly: "$20", yearly: "$200" },
    note: "Billed per month or per year",
    features: [
      "Access to all live video rooms",
      "Video lessons and course library",
      "Events, calendar & reminders",
      "Broadcast live streams",
      "Real-time chat with members",
    ],
  },
  {
    id: "premium",
    name: "Premium",
    price: { monthly: "$40", yearly: "$400" },
    note: "Everything in Standard, plus premium content",
    features: [
      "Everything in Standard",
      "Premium courses & exclusive lessons",
      "Private premium group rooms",
      "Early access to new content",
      "Priority support",
    ],
    featured: true,
  },
];

export default function PricingPage() {
  const router = useRouter();
  const [billing, setBilling] = useState("monthly");
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [signedIn, setSignedIn] = useState(false);
  const [promo, setPromo] = useState("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => setSignedIn(!!user));
    return unsub;
  }, []);

  async function handleSubscribe(tier) {
    setError("");
    setNotice("");
    setBusy(tier);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: billing, tier, promoCode: promo.trim() || undefined }),
      });
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      const raw = await res.text();
      let data = {};
      if (raw) {
        try {
          data = JSON.parse(raw);
        } catch {
          data = {};
        }
      }
      if (!res.ok) throw new Error(data.error || "Checkout failed, please try again");
      if (data.url) {
        window.location.assign(data.url);
        return;
      }
      if (data.switched) {
        setNotice(
          data.unchanged
            ? `You're already on ${tier === "standard" ? "Standard" : "Premium"} (${billing}).`
            : `Your membership has been updated to ${tier === "standard" ? "Standard" : "Premium"} (${billing}).`
        );
        return;
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link className={styles.headerBrand} href={signedIn ? "/dashboard" : "/"}>
          VidNetwork
        </Link>
        {signedIn ? (
          <Link className={styles.headerLink} href="/dashboard">Back to your dashboard</Link>
        ) : (
          <Link className={styles.headerLink} href="/login">Sign in</Link>
        )}
      </header>
      <div className={styles.container}>
        <h1 className={styles.title}>Choose your membership</h1>
        <p className={styles.subtitle}>Pay with credit card or PayPal. Cancel anytime.</p>

        <div className={styles.toggle}>
          <button
            className={billing === "monthly" ? `${styles.toggleBtn} ${styles.toggleActive}` : styles.toggleBtn}
            onClick={() => setBilling("monthly")}
          >
            Monthly
          </button>
          <button
            className={billing === "yearly" ? `${styles.toggleBtn} ${styles.toggleActive}` : styles.toggleBtn}
            onClick={() => setBilling("yearly")}
          >
            Yearly
          </button>
        </div>

        {error && <p className={styles.error}>{error}</p>}
        {notice && <p className={styles.notice}>{notice}</p>}

        <div className={styles.promoRow}>
          <input
            type="text"
            className={styles.promo}
            value={promo}
            onChange={(e) => setPromo(e.target.value)}
            placeholder="Promo code (optional)"
            aria-label="Promo code"
          />
        </div>

        <div className={styles.grid}>
          {TIERS.map((tier) => (
            <div
              key={tier.id}
              className={tier.featured ? `${styles.card} ${styles.cardFeatured}` : styles.card}
            >
              <h2 className={styles.cardTitle}>{tier.name}</h2>
              <p className={styles.price}>
                {tier.price[billing]} <span className={styles.interval}>{billing === "monthly" ? "per month" : "per year"}</span>
              </p>
              <p className={styles.note}>{tier.note}</p>
              <ul className={styles.features}>
                {tier.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>

              <button
                className={tier.featured ? `${styles.subscribe} ${styles.subscribeFeatured}` : styles.subscribe}
                onClick={() => handleSubscribe(tier.id)}
                disabled={busy !== null}
              >
                {busy === tier.id ? "Redirecting…" : signedIn ? `Subscribe — ${tier.name}` : "Sign in to subscribe"}
              </button>
              <p className={styles.finePrint}>
                Card or PayPal · 14-day free trial · no credit card required
              </p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
