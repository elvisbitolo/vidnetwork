"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "./LandingPricing.module.css";
import { CheckIcon } from "./LandingIcons";

const TIERS = [
  {
    id: "standard",
    name: "Standard",
    price: { monthly: "$20", yearly: "$200" },
    note: { monthly: "per month", yearly: "per year" },
    benefits: [
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
    note: { monthly: "per month", yearly: "per year" },
    benefits: [
      "Everything in Standard",
      "Premium courses & exclusive lessons",
      "Private premium group rooms",
      "Early access to new content",
      "Priority support",
    ],
    featured: true,
  },
];

export default function LandingPricing() {
  const [billing, setBilling] = useState("monthly");

  return (
    <div className={styles.wrap}>
      <div className={styles.toggle} role="group" aria-label="Billing interval">
        <button
          type="button"
          className={billing === "monthly" ? `${styles.toggleBtn} ${styles.toggleActive}` : styles.toggleBtn}
          onClick={() => setBilling("monthly")}
        >
          Monthly
        </button>
        <button
          type="button"
          className={billing === "yearly" ? `${styles.toggleBtn} ${styles.toggleActive}` : styles.toggleBtn}
          onClick={() => setBilling("yearly")}
        >
          Yearly
        </button>
      </div>

      <div className={styles.grid}>
        {TIERS.map((tier) => (
          <div
            key={tier.id}
            className={tier.featured ? `${styles.card} ${styles.cardFeatured}` : styles.card}
          >
            {tier.featured && <span className={styles.rec}>Most popular</span>}
            <h3 className={styles.name}>{tier.name}</h3>
            <p className={styles.price}>
              {tier.price[billing]}
              <span className={styles.interval}> {tier.note[billing]}</span>
            </p>
            <ul className={styles.benefits}>
              {tier.benefits.map((benefit) => (
                <li key={benefit} className={styles.benefit}>
                  <span className={styles.benefitIcon}>
                    <CheckIcon size={14} />
                  </span>
                  {benefit}
                </li>
              ))}
            </ul>
            <Link
              className={tier.featured ? `${styles.cta} ${styles.ctaFeatured}` : styles.cta}
              href="/pricing"
            >
              Choose {tier.name}
            </Link>
          </div>
        ))}
      </div>

      <p className={styles.fine}>14-day free trial · no credit card required · card or PayPal</p>
    </div>
  );
}
