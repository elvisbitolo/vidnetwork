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
    id: "lounge",
    nameKey: "loungeName",
    priceKey: "loungePrice",
    noteKey: "loungeNote",
    taglineKey: "loungeTagline",
    benefitsKey: "loungeBenefits",
  },
  {
    id: "plus",
    nameKey: "plusName",
    priceKey: "plusPrice",
    noteKey: "plusNote",
    taglineKey: "plusTagline",
    benefitsKey: "plusBenefits",
  },
  {
    id: "host",
    nameKey: "hostName",
    priceKey: "hostPrice",
    noteKey: "hostNote",
    taglineKey: "hostTagline",
    benefitsKey: "hostBenefits",
    featured: true,
  },
];

export default function PricingPage() {
  const t = useTranslations("pricing");
  const router = useRouter();
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
        body: JSON.stringify({ plan: "monthly", tier, promoCode: promo.trim() || undefined }),
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
        const tierName = t(
          tier === "lounge" ? "loungeName" : tier === "plus" ? "plusName" : "hostName"
        );
        setNotice(
          data.unchanged
            ? t("alreadyOn", { tier: tierName })
            : t("updatedTo", { tier: tierName })
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
          Yarnery Lounge
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

        <div className={styles.foundingBanner}>
          <span className={styles.foundingBadge}>{t("foundingBadge")}</span>
          <span className={styles.foundingText}>{t("foundingLine")}</span>
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
              <h2 className={styles.cardTitle}>{t(tier.nameKey)}</h2>
              <p className={styles.price}>
                {tier.id === "lounge" ? (
                  <>
                    <span className={styles.strike}>{t("loungePrice")}</span>{" "}
                    <span className={styles.foundingPrice}>{t("loungeFoundingPrice")}</span>
                  </>
                ) : (
                  t(tier.priceKey)
                )}{" "}
                <span className={styles.interval}>{t("perMonth")}</span>
              </p>
              <p className={styles.tagline}>{t(tier.taglineKey)}</p>
              <p className={styles.note}>{t(tier.noteKey)}</p>
              <ul className={styles.features}>
                {t(tier.benefitsKey, { returnObjects: true }).map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>

              <button
                className={tier.featured ? `${styles.subscribe} ${styles.subscribeFeatured}` : styles.subscribe}
                onClick={() => handleSubscribe(tier.id)}
                disabled={busy !== null}
              >
                {busy === tier.id ? t("redirecting") : signedIn ? t("subscribe", { tier: t(tier.nameKey) }) : t("signInToSubscribe")}
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