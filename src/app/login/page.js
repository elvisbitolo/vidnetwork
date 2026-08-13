"use client";

import { useState } from "react";
import Link from "next/link";
import { sendPasswordResetEmail } from "firebase/auth";
import { loginWithEmail, loginWithGoogle } from "@/lib/client-auth";
import GoogleIcon from "@/components/GoogleIcon";
import styles from "../auth.module.css";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [forgotPassword, setForgotPassword] = useState(false);
  const [resetSent, setResetSent] = useState(false);

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
      await loginWithEmail(email, password);
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- full reload so the fresh session cookie is sent
      window.location.assign("/account");
    } catch (err) {
      setError(err.message || "Sign-in failed");
    } finally {
      setBusy("");
    }
  }

  async function handleReset(e) {
    e.preventDefault();
    setError("");
    setBusy("reset");
    try {
      await sendPasswordResetEmail(auth, email);
      setResetSent(true);
    } catch (err) {
      setError(err.message || "Failed to send reset email");
    } finally {
      setBusy("");
    }
  }

  if (forgotPassword) {
    return (
      <main className={styles.page}>
        <div className={styles.card}>
          <p className={styles.brand}><Link href="/">Community</Link></p>
          <h1 className={styles.title}>Reset your password</h1>
          <p className={styles.subtitle}>
            Enter your email and we&apos;ll send you a reset link.
          </p>

          {resetSent ? (
            <p className={styles.success}>
              Reset link sent to {email}. Check your inbox.
            </p>
          ) : (
            <>
              {error && <p className={styles.error}>{error}</p>}
              <form onSubmit={handleReset}>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="reset-email">Email</label>
                  <input
                    id="reset-email"
                    className={styles.input}
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <button className={styles.submit} type="submit" disabled={!!busy}>
                  {busy === "reset" ? "Sending…" : "Send reset link"}
                </button>
              </form>
            </>
          )}

          <p className={styles.footer}>
            <a className={styles.link} onClick={() => { setForgotPassword(false); setResetSent(false); setError(""); }} href="/login">
              Back to sign in
            </a>
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <p className={styles.brand}><Link href="/">Community</Link></p>
        <h1 className={styles.title}>Welcome back</h1>
        <p className={styles.subtitle}>Sign in to join the community</p>

        {error && <p className={styles.error}>{error}</p>}

        <button className={styles.googleButton} onClick={handleGoogle} disabled={!!busy}>
          <GoogleIcon /> Continue with Google
        </button>

        <div className={styles.divider}>or</div>

        <form onSubmit={handleSubmit}>
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
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button className={styles.submit} type="submit" disabled={!!busy}>
            {busy === "email" ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className={styles.forgot}>
          <a className={styles.link} href="/login" onClick={(e) => { e.preventDefault(); setForgotPassword(true); setError(""); }}>
            Forgot password?
          </a>
        </p>

        <p className={styles.footer}>
          New here? <a className={styles.link} href="/signup">Create an account</a>
        </p>
      </div>
    </main>
  );
}
