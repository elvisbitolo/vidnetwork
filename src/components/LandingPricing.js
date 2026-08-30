"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import styles from "./LandingPricing.module.css";
import { CheckIcon } from "./LandingIcons";

const TIERS = [
  {
    id: "lounge",
    nameKey: "loungeName",
    priceKey: "loungePrice",
    noteKey: "loungeNote",
    taglineKey: "loungeTagline",
    benefitsKeys: [
      "loungeBenefits.0",
      "loungeBenefits.1",
      "loungeBenefits.2",
      "loungeBenefits.3",
    ],
  },
  {
    id: "plus",
    nameKey: "plusName",
    priceKey: "plusPrice",
    noteKey: "plusNote",
    taglineKey: "plusTagline",
    benefitsKeys: [
      "plusBenefits.0",
      "plusBenefits.1",
      "plusBenefits.2",
      "plusBenefits.3",
    ],
  },
  {
    id: "host",
    nameKey: "hostName",
    priceKey: "hostPrice",
    noteKey: "hostNote",
    taglineKey: "hostTagline",
    benefitsKeys: [
      "hostBenefits.0",
      "hostBenefits.1",
      "hostBenefits.2",
      "hostBenefits.3",
    ],
    featured: true,
  },
];

export default function LandingPricing() {
  const t = useTranslations("landing");
  const tp = useTranslations("pricing");

  return (
    <div className={styles.wrap}>
      <div className={styles.foundingBanner}>
        <span className={styles.foundingBadge}>{tp("foundingBadge")}</span>
        <span className={styles.foundingText}>{tp("foundingLine")}</span>
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
              {tier.id === "lounge" ? (
                <>
                  <span className={styles.strike}>{tp("loungePrice")}</span>{" "}
                  <span>{tp("loungeFoundingPrice")}</span>
                </>
              ) : (
                tp(tier.priceKey)
              )}
              <span className={styles.interval}> {tp("perMonth")}</span>
            </p>
            <p className={styles.tagline}>{tp(tier.taglineKey)}</p>
            <p className={styles.note}>{tp(tier.noteKey)}</p>
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
              href="/signup"
            >
              {tp("joinNow")}
            </Link>
          </div>
        ))}
      </div>

      <p className={styles.fine}>{tp("finePrint")}</p>
    </div>
  );
}