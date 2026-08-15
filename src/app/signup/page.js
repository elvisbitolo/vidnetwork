"use client";

import { useState } from "react";
import Link from "next/link";
import { sendEmailVerification } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { signupWithEmail, loginWithGoogle } from "@/lib/client-auth";
import GoogleIcon from "@/components/GoogleIcon";
import styles from "../auth.module.css";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [verifyEmail, setVerifyEmail] = useState("");
  const [resent, setResent] = useState(false);

  async function handleGoogle() {
    setError("");
    setBusy("google");
    try {
      await loginWithGoogle();
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- full reload so the fresh session cookie is sent
      window.location.assign("/dashboard");
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
      setVerifyEmail(email);
      setResent(false);
    } catch (err) {
      if (err.code === "email_not_verified") {
        if (auth.currentUser) {
          await sendEmailVerification(auth.currentUser).catch(() => {});
        }
        setVerifyEmail(email);
        setResent(false);
      } else {
        setError(err.message || "Sign-up failed");
      }
    } finally {
      setBusy("");
    }
  }

  async function resendVerification() {
    if (!auth.currentUser) return;
    setBusy("verify");
    setError("");
    try {
      await sendEmailVerification(auth.currentUser);
      setResent(true);
    } catch (err) {
      setError(err.message || "Could not resend verification email");
    } finally {
      setBusy("");
    }
  }

  if (verifyEmail) {
    return (
      <main className={styles.page}>
        <div className={styles.card}>
          <p className={styles.brand}><Link href="/">VidNetwork</Link></p>
          <h1 className={styles.title}>Verify your email</h1>
          <div className={styles.verifyBox}>
            <p className={styles.verifyText}>
              We sent a confirmation link to <strong>{verifyEmail}</strong>. Click it to
              activate your account, then sign in.
            </p>
            {resent ? (
              <p className={styles.verifyText}>Verification email resent — check your inbox.</p>
            ) : (
              <button
                className={styles.linkBtn}
                onClick={resendVerification}
                disabled={!!busy}
              >
                {busy === "verify" ? "Sending…" : "Resend verification email"}
              </button>
            )}
          </div>
          {error && <p className={styles.error}>{error}</p>}
          <p className={styles.footer}>
            <a className={styles.link} href="/login">Sign in after verifying</a>
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <p className={styles.brand}><Link href="/">VidNetwork</Link></p>
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
