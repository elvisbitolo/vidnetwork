"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import styles from "./pricing.module.css";

const TIERS = [
  {
    id: "standard",
    name: "community",
    price: { monthly: "$20", yearly: "$200" },
    note: "communityNote",
    features: [
      "communityFeatures.joinLive",
      "communityFeatures.videoLessons",
      "communityFeatures.events",
      "communityFeatures.chat",
      "communityFeatures.gallery",
      "communityFeatures.stickers",
    ],
  },
  {
    id: "premium",
    name: "creator",
    price: { monthly: "$40", yearly: "$400" },
    note: "creatorNote",
    features: [
      "creatorFeatures.everythingInCommunity",
      "creatorFeatures.hostRooms",
      "creatorFeatures.premiumCourses",
      "creatorFeatures.privateRooms",
      "creatorFeatures.earlyAccess",
      "creatorFeatures.prioritySupport",
    ],
    featured: true,
  },
];

export default function PricingPage() {
  const t = useTranslations("pricing");
  const tc = useTranslations("common");
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
      if (!res.ok) throw new Error(data.error || t("checkoutFailed"));
      if (data.url) {
        window.location.assign(data.url);
        return;
      }
      if (data.switched) {
        const tierName = tier === "standard" ? t("community") : t("creator");
        setNotice(
          data.unchanged
            ? t("alreadyOn", { tier: tierName, billing })
            : t("updatedTo", { tier: tierName, billing })
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
          <Link className={styles.headerLink} href="/dashboard">{t("backToDashboard")}</Link>
        ) : (
          <Link className={styles.headerLink} href="/login">Sign in</Link>
        )}
      </header>
      <div className={styles.container}>
        <h1 className={styles.title}>{t("title")}</h1>
        <p className={styles.subtitle}>{t("subtitle")}</p>

        <div className={styles.toggle}>
          <button
            className={billing === "monthly" ? `${styles.toggleBtn} ${styles.toggleActive}` : styles.toggleBtn}
            onClick={() => setBilling("monthly")}
          >
            {t("monthly")}
          </button>
          <button
            className={billing === "yearly" ? `${styles.toggleBtn} ${styles.toggleActive}` : styles.toggleBtn}
            onClick={() => setBilling("yearly")}
          >
            {t("yearly")}
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
            placeholder={t("promoPlaceholder")}
            aria-label="Promo code"
          />
        </div>

        <div className={styles.grid}>
          {TIERS.map((tier) => (
            <div
              key={tier.id}
              className={tier.featured ? `${styles.card} ${styles.cardFeatured}` : styles.card}
            >
              <h2 className={styles.cardTitle}>{t(tier.name)}</h2>
              <p className={styles.price}>
                {tier.price[billing]} <span className={styles.interval}>{billing === "monthly" ? t("perMonth") : t("perYear")}</span>
              </p>
              <p className={styles.note}>{t(tier.note)}</p>
              <ul className={styles.features}>
                {tier.features.map((feature) => (
                  <li key={feature}>{t(feature)}</li>
                ))}
              </ul>

              <button
                className={tier.featured ? `${styles.subscribe} ${styles.subscribeFeatured}` : styles.subscribe}
                onClick={() => handleSubscribe(tier.id)}
                disabled={busy !== null}
              >
                {busy === tier.id ? t("redirecting") : signedIn ? t("subscribe", { tier: t(tier.name) }) : t("signInToSubscribe")}
              </button>
              <p className={styles.finePrint}>
                {t("finePrint")}
              </p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
