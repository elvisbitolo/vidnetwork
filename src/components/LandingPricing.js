"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import styles from "./LandingPricing.module.css";
import { CheckIcon } from "./LandingIcons";

const TIERS = [
  {
    id: "standard",
    nameKey: "community",
    priceKey: "community",
    noteKey: "communityNote",
    benefitsKeys: [
      "communityFeatures.joinLive",
      "communityFeatures.videoLessons",
      "communityFeatures.events",
      "communityFeatures.chat",
    ],
  },
  {
    id: "premium",
    nameKey: "creator",
    priceKey: "creator",
    noteKey: "creatorNote",
    benefitsKeys: [
      "creatorFeatures.everythingInCommunity",
      "creatorFeatures.premiumCourses",
      "creatorFeatures.privateRooms",
      "creatorFeatures.earlyAccess",
      "creatorFeatures.prioritySupport",
    ],
    featured: true,
  },
];

export default function LandingPricing() {
  const t = useTranslations("landing");
  const tp = useTranslations("pricing");
  const [billing, setBilling] = useState("monthly");

  return (
    <div className={styles.wrap}>
      <div className={styles.toggle} role="group" aria-label="Billing interval">
        <button
          type="button"
          className={billing === "monthly" ? `${styles.toggleBtn} ${styles.toggleActive}` : styles.toggleBtn}
          onClick={() => setBilling("monthly")}
        >
          {tp("monthly")}
        </button>
        <button
          type="button"
          className={billing === "yearly" ? `${styles.toggleBtn} ${styles.toggleActive}` : styles.toggleBtn}
          onClick={() => setBilling("yearly")}
        >
          {tp("yearly")}
        </button>
      </div>

      <div className={styles.grid}>
        {TIERS.map((tier) => (
          <div
            key={tier.id}
            className={tier.featured ? `${styles.card} ${styles.cardFeatured}` : styles.card}
          >
            {tier.featured && <span className={styles.rec}>{t("mostPopular")}</span>}
            <h3 className={styles.name}>{tp(tier.nameKey)}</h3>
            <p className={styles.price}>
              {tier.id === "standard" ? "$20" : "$40"}
              <span className={styles.interval}> {billing === "monthly" ? tp("perMonth") : tp("perYear")}</span>
            </p>
            <ul className={styles.benefits}>
              {tier.benefitsKeys.map((key) => (
                <li key={key} className={styles.benefit}>
                  <span className={styles.benefitIcon}>
                    <CheckIcon size={14} />
                  </span>
                  {tp(key)}
                </li>
              ))}
            </ul>
            <Link
              className={tier.featured ? `${styles.cta} ${styles.ctaFeatured}` : styles.cta}
              href="/pricing"
            >
              {tp("subscribe", { tier: tp(tier.nameKey) })}
            </Link>
          </div>
        ))}
      </div>

      <p className={styles.fine}>{tp("finePrint")}</p>
    </div>
  );
}
