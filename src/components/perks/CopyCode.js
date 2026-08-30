"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import styles from "@/app/perks/perks.module.css";

export default function CopyCode({ code }) {
  const t = useTranslations("perks.shop");
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <div className={styles.codeRow}>
      <span className={styles.code}>{code}</span>
      <button type="button" className={styles.copyBtn} onClick={copy}>
        {copied ? t("copied") : t("copy")}
      </button>
    </div>
  );
}