"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./account.module.css";

export default function ManageSubscription() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleManage() {
    setBusy(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      window.location.href = data.url;
    } catch {
      setBusy(false);
    }
  }

  return (
    <button className={styles.manage} onClick={handleManage} disabled={busy}>
      {busy ? "Opening…" : "Manage subscription"}
    </button>
  );
}
