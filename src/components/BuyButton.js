"use client";

import { useState } from "react";
import styles from "./BuyButton.module.css";

export default function BuyButton({ targetType, targetId, priceCents }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [promo, setPromo] = useState("");

  const price = priceCents > 0 ? `$${(priceCents / 100).toFixed(2)}` : "";

  async function handleBuy() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/stripe/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetType,
          targetId,
          promoCode: promo.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not start checkout");
        return;
      }
      if (data.url) window.location.assign(data.url);
    } catch {
      setError("Could not start checkout");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className={styles.wrap}>
      <button type="button" className={styles.buy} onClick={handleBuy} disabled={busy}>
        {busy ? "Opening checkout…" : price ? `Buy for ${price}` : "Buy"}
      </button>
      <input
        type="text"
        className={styles.promo}
        value={promo}
        onChange={(e) => setPromo(e.target.value)}
        placeholder="Promo code (optional)"
        aria-label="Promo code"
      />
      {error && <span className={styles.error}>{error}</span>}
    </span>
  );
}
