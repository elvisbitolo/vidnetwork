"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import Nav from "@/components/Nav";
import styles from "./income.module.css";

function money(cents) {
  return `$${(Number(cents) / 100).toFixed(2)}`;
}

export default function AdminIncomePage() {
  const router = useRouter();
  const [role, setRole] = useState("member");
  const [income, setIncome] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/income");
    if (res.ok) setIncome((await res.json()).income);
    else setError("Could not load income data");
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push("/login");
        return;
      }
      load();
    });
    return unsub;
  }, [router, load]);

  useEffect(() => {
    fetch("/api/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data && setRole(data.role));
  }, []);

  const recurring = income?.recurring;
  const oneTime = income?.oneTime;
  const promos = income?.promos || [];

  const annualRunRate =
    (Number(recurring?.mrrCents || 0) * 12) + Number(oneTime?.revenueCents || 0);
  const totalNet =
    Number(recurring?.mrrCents || 0) + Number(oneTime?.revenueCents || 0);

  return (
    <Nav role={role}>
      <div className={styles.container}>
        <h1 className={styles.title}>Income</h1>
        <p className={styles.subtitle}>
          Your earnings from memberships, events, courses and spaces.
        </p>
        {error && <p className={styles.error}>{error}</p>}

        {income && (
          <>
            <div className={styles.cards}>
              <div className={styles.card}>
                <p className={styles.cardLabel}>Monthly recurring revenue</p>
                <p className={styles.cardValue}>{money(recurring.mrrCents)}</p>
                <p className={styles.cardMeta}>
                  {recurring.activeSubscribers} active subscriber
                  {recurring.activeSubscribers === 1 ? "" : "s"}
                </p>
              </div>
              <div className={styles.card}>
                <p className={styles.cardLabel}>One-time sales</p>
                <p className={styles.cardValue}>{money(oneTime.revenueCents)}</p>
                <p className={styles.cardMeta}>events, courses & spaces</p>
              </div>
              <div className={styles.card}>
                <p className={styles.cardLabel}>Total earned</p>
                <p className={styles.cardValue}>{money(totalNet)}</p>
                <p className={styles.cardMeta}>
                  {money(annualRunRate)} annual run-rate
                </p>
              </div>
              <div className={styles.card}>
                <p className={styles.cardLabel}>Sold via promo codes</p>
                <p className={styles.cardValue}>{money(oneTime.promoRevenueCents)}</p>
                <p className={styles.cardMeta}>one-time purchases</p>
              </div>
            </div>

            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Recurring revenue by tier</h2>
              <div className={styles.table}>
                {recurring.tierBreakdown.length === 0 ? (
                  <p className={styles.empty}>No active memberships yet.</p>
                ) : (
                  recurring.tierBreakdown.map((row) => (
                    <div className={styles.row} key={row.tier}>
                      <span className={styles.cellMain}>
                        {row.tier[0].toUpperCase() + row.tier.slice(1)}
                      </span>
                      <span className={styles.cell}>{row.count} member{row.count === 1 ? "" : "s"}</span>
                      <span className={styles.cellStrong}>{money(row.mrrCents)}/mo</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>One-time sales by offer</h2>
              <div className={styles.table}>
                {oneTime.offers.length === 0 ? (
                  <p className={styles.empty}>No one-time sales yet.</p>
                ) : (
                  oneTime.offers.map((offer) => (
                    <div className={styles.row} key={`${offer.targetType}:${offer.targetId}`}>
                      <span className={styles.cellMain}>
                        {offer.title}
                        <span className={styles.tag}>
                          {income.labelForType[offer.targetType] || offer.targetType}
                        </span>
                      </span>
                      <span className={styles.cell}>{offer.count} sold</span>
                      <span className={styles.cellStrong}>{money(offer.revenueCents)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Recent purchases</h2>
              <div className={styles.table}>
                {oneTime.recent.length === 0 ? (
                  <p className={styles.empty}>No purchases yet.</p>
                ) : (
                  oneTime.recent.map((purchase) => (
                    <div className={styles.row} key={`${purchase.targetType}:${purchase.targetId}:${purchase.purchasedAt}`}>
                      <span className={styles.cellMain}>
                        {purchase.title}
                        {purchase.promoCode && (
                          <span className={styles.promoTag}>{purchase.promoCode}</span>
                        )}
                      </span>
                      <span className={styles.cell}>{purchase.memberName}</span>
                      <span className={styles.cell}>
                        {new Date(purchase.purchasedAt).toLocaleDateString()}
                      </span>
                      <span className={styles.cellStrong}>{money(purchase.priceCents)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Promo codes</h2>
              <div className={styles.table}>
                {promos.length === 0 ? (
                  <p className={styles.empty}>
                    No promo codes yet. Create some on the{" "}
                    <a className={styles.link} href="/admin/promocodes">promo codes</a> page.
                  </p>
                ) : (
                  promos.map((promo) => (
                    <div className={styles.row} key={promo.id}>
                      <span className={styles.cellMain}>{promo.code}</span>
                      <span className={styles.cell}>
                        {promo.percentOff > 0
                          ? `${promo.percentOff}% off`
                          : money(promo.amountOffCents)}
                      </span>
                      <span className={styles.cell}>
                        {promo.uses}/{promo.maxUses || "∞"} used
                      </span>
                      <span className={styles.cell}>
                        {promo.active ? "Active" : "Inactive"}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </Nav>
  );
}
