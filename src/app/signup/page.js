"use client";

import { useState } from "react";
import Link from "next/link";
import { signupWithEmail, loginWithGoogle } from "@/lib/client-auth";
import GoogleIcon from "@/components/GoogleIcon";
import styles from "../auth.module.css";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  async function handleGoogle() {
    setError("");
    setBusy("google");
    try {
      await loginWithGoogle();
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- full reload so the fresh session cookie is sent
      window.location.assign("/account");
    } catch (err) {
      setError(err.message || "Google sign-in failed");
    } finally {
      setBusy("");
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy("email");
    try {
      await signupWithEmail(name, email, password);
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- full reload so the fresh session cookie is sent
      window.location.assign("/account");
    } catch (err) {
      setError(err.message || "Sign-up failed");
    } finally {
      setBusy("");
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <p className={styles.brand}><Link href="/">Community</Link></p>
        <h1 className={styles.title}>Create your account</h1>
        <p className={styles.subtitle}>Start connecting with the community</p>

        {error && <p className={styles.error}>{error}</p>}

        <button className={styles.googleButton} onClick={handleGoogle} disabled={!!busy}>
          <GoogleIcon /> Continue with Google
        </button>

        <div className={styles.divider}>or</div>

        <form onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="name">Name</label>
            <input
              id="name"
              className={styles.input}
              type="text"
              required
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="email">Email</label>
            <input
              id="email"
              className={styles.input}
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="password">Password</label>
            <input
              id="password"
              className={styles.input}
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button className={styles.submit} type="submit" disabled={!!busy}>
            {busy === "email" ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className={styles.footer}>
          Already a member? <a className={styles.link} href="/login">Sign in</a>
        </p>
      </div>
    </main>
  );
}
