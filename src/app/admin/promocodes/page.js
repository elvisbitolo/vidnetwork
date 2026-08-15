"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import Nav from "@/components/Nav";
import styles from "../questions/questions.module.css";

export default function AdminPromoCodesPage() {
  const router = useRouter();
  const [role, setRole] = useState("member");
  const [promos, setPromos] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [code, setCode] = useState("");
  const [percentOff, setPercentOff] = useState("");
  const [amountOff, setAmountOff] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [expiresAt, setExpiresAt] = useState("");

  const loadPromos = useCallback(async () => {
    const res = await fetch("/api/admin/promocodes");
    if (res.ok) setPromos((await res.json()).promos);
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push("/login");
        return;
      }
      loadPromos();
    });
    return unsub;
  }, [router, loadPromos]);

  useEffect(() => {
    fetch("/api/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data && setRole(data.role));
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/admin/promocodes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          percentOff: percentOff ? Number(percentOff) : 0,
          amountOffCents: amountOff ? Math.round(Number(amountOff) * 100) : 0,
          maxUses: maxUses ? Number(maxUses) : 0,
          expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
          active: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not create promo code");
      setCode("");
      setPercentOff("");
      setAmountOff("");
      setMaxUses("");
      setExpiresAt("");
      await loadPromos();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleToggle(promo) {
    setError("");
    try {
      const res = await fetch(`/api/admin/promocodes/${promo.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !promo.active }),
      });
      if (!res.ok) throw new Error("Could not update promo code");
      await loadPromos();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    setError("");
    try {
      const res = await fetch(`/api/admin/promocodes/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Could not delete promo code");
      await loadPromos();
    } catch (err) {
      setError(err.message);
    }
  }

  function discountLabel(promo) {
    if (Number(promo.percentOff) > 0) return `${promo.percentOff}% off`;
    if (Number(promo.amountOffCents) > 0) return `$${(promo.amountOffCents / 100).toFixed(2)} off`;
    return "—";
  }

  function expiryLabel(promo) {
    if (!promo.expiresAt) return "Never";
    const ts = promo.expiresAt?.toMillis ? promo.expiresAt.toMillis() : promo.expiresAt;
    return new Date(ts).toLocaleDateString();
  }

  return (
    <Nav role={role}>
      <div className={styles.container}>
        <h1 className={styles.title}>Promo codes</h1>
        <p className={styles.subtitle}>
          Discount codes members can enter at checkout for subscriptions, events,
          courses and spaces.
        </p>
        {error && <p className={styles.error}>{error}</p>}

        <form className={styles.form} onSubmit={handleCreate}>
          <h2 className={styles.formTitle}>New promo code</h2>
          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="p-code">Code</label>
              <input
                id="p-code"
                className={styles.input}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. LAUNCH20"
                required
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="p-percent">Percent off (%)</label>
              <input
                id="p-percent"
                className={styles.input}
                type="number"
                min={0}
                max={100}
                value={percentOff}
                onChange={(e) => setPercentOff(e.target.value)}
                placeholder="20"
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="p-amount">Amount off ($)</label>
              <input
                id="p-amount"
                className={styles.input}
                type="number"
                min={0}
                step="0.01"
                value={amountOff}
                onChange={(e) => setAmountOff(e.target.value)}
                placeholder="10.00"
              />
            </div>
          </div>
          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="p-uses">Max uses (0 = unlimited)</label>
              <input
                id="p-uses"
                className={styles.input}
                type="number"
                min={0}
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                placeholder="100"
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="p-exp">Expires</label>
              <input
                id="p-exp"
                className={styles.input}
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </div>
          </div>
          <p className={styles.subtitle}>
            Set a percent or an amount discount. The code is created in Stripe
            automatically and applied at checkout.
          </p>
          <button className={styles.submit} disabled={busy}>
            {busy ? "Saving…" : "Create promo code"}
          </button>
        </form>

        <h2 className={styles.listTitle}>Promo codes</h2>
        {promos.length === 0 ? (
          <p className={styles.empty}>No promo codes yet.</p>
        ) : (
          <div className={styles.list}>
            {promos.map((promo) => (
              <div key={promo.id} className={styles.item}>
                <div>
                  <p className={styles.itemName}>{promo.code}</p>
                  <p className={styles.itemMeta}>
                    {discountLabel(promo)} · {promo.uses}/{promo.maxUses || "∞"} used · expires{" "}
                    {expiryLabel(promo)}
                  </p>
                </div>
                <div className={styles.itemActions}>
                  <button
                    className={promo.active ? styles.toggleOn : styles.toggle}
                    onClick={() => handleToggle(promo)}
                  >
                    {promo.active ? "Active" : "Inactive"}
                  </button>
                  <button className={styles.delete} onClick={() => handleDelete(promo.id)}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Nav>
  );
}
