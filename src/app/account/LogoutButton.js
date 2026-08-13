"use client";

import { useRouter } from "next/navigation";
import { logout } from "@/lib/client-auth";
import styles from "./account.module.css";

export default function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await logout();
    router.push("/login");
    router.refresh();
  }

  return (
    <button className={styles.logout} onClick={handleLogout}>
      Sign out
    </button>
  );
}
