"use client";

import { useRouter } from "next/navigation";
import styles from "./BackButton.module.css";

export default function BackButton({ fallback = "/", label = "Back" }) {
  const router = useRouter();

  return (
    <button
      type="button"
      className={styles.back}
      onClick={() => {
        if (window.history.length > 1) {
          router.back();
        } else {
          router.replace(fallback);
        }
      }}
    >
      <span className={styles.arrow}>←</span>
      {label}
    </button>
  );
}
