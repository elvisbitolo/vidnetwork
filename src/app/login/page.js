"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { auth } from "@/lib/firebase/client";
import { sendPasswordResetEmail, sendEmailVerification } from "firebase/auth";
import { loginWithEmail, loginWithGoogle } from "@/lib/client-auth";
import GoogleIcon from "@/components/GoogleIcon";
import PasswordInput from "@/components/PasswordInput";
import styles from "../auth.module.css";

export default function LoginPage() {
  const t = useTranslations("auth");
  const tc = useTranslations("common");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [forgotPassword, setForgotPassword] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [verifyNotice, setVerifyNotice] = useState("");
  const [resent, setResent] = useState(false);

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

  async function handleGoogle() {
    setError("");
    setVerifyNotice("");
    setBusy("google");
    try {
      await loginWithGoogle();
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- full reload so the fresh session cookie is sent
      window.location.assign("/account");
    } catch (err) {
      if (err.code === "email_not_verified") {
        setVerifyNotice(err.message);
        setResent(false);
      } else {
        setError(err.message || t("googleFailed"));
      }
    } finally {
      setBusy("");
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setVerifyNotice("");
    setBusy("email");
    try {
      await loginWithEmail(email, password);
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- full reload so the fresh session cookie is sent
      window.location.assign("/account");
    } catch (err) {
      if (err.code === "email_not_verified") {
        setVerifyNotice(err.message);
        setResent(false);
      } else {
        setError(err.message || "Sign-in failed");
      }
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
        <div className={styles.authContainer}>
          <div className={styles.authForm}>
            <p className={styles.brand}><Link href="/">Yarnery Lounge</Link></p>
            <h1 className={styles.title}>{t("resetPassword")}</h1>
            <p className={styles.subtitle}>{t("resetPasswordDesc")}</p>

            {resetSent ? (
              <p className={styles.success}>{t("resetSent", { email })}</p>
            ) : (
              <>
                {error && <p className={styles.error}>{error}</p>}
                {verifyNotice && (
                  <div className={styles.verifyBox}>
                    <p className={styles.verifyText}>{verifyNotice}</p>
                    {resent ? (
                      <p className={styles.verifyText}>{t("verificationResent")}</p>
                    ) : (
                      <button
                        className={styles.linkBtn}
                        onClick={resendVerification}
                        disabled={!!busy}
                      >
                        {busy === "verify" ? t("resending") : t("resendVerification")}
                      </button>
                    )}
                  </div>
                )}
                <form onSubmit={handleReset}>
                  <div className={styles.field}>
                    <label className={styles.label} htmlFor="reset-email">{t("email")}</label>
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
                    {busy === "reset" ? t("resending") : t("sendResetLink")}
                  </button>
                </form>
              </>
            )}

            <p className={styles.footer}>
              <a className={styles.link} href="/login" onClick={(e) => { e.preventDefault(); setForgotPassword(false); setResetSent(false); setError(""); }}>
                {t("backToSignIn")}
              </a>
            </p>
          </div>
          <div className={styles.authImage}>
            <Image src="/images/crochet/model_in_shop_05.jpeg" alt="Welcome back" fill sizes="(max-width: 768px) 0px, 460px" style={{ objectFit: "cover" }} />
            <div className={styles.authImageOverlay}>
              <p className={styles.authImageText}>Welcome back to your creative community.</p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.authContainer}>
        <div className={styles.authForm}>
          <p className={styles.brand}><Link href="/">Yarnery Lounge</Link></p>
          <h1 className={styles.title}>{t("welcomeBack")}</h1>
          <p className={styles.subtitle}>{t("signInToJoin")}</p>

          {error && <p className={styles.error}>{error}</p>}

          <button className={styles.googleButton} onClick={handleGoogle} disabled={!!busy}>
            <GoogleIcon /> {t("continueWithGoogle")}
          </button>

          <div className={styles.divider}>{tc("or")}</div>

          <form onSubmit={handleSubmit}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="email">{t("email")}</label>
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
            <PasswordInput
              id="password"
              label={t("password")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              showRules={false}
            />
            <button className={styles.submit} type="submit" disabled={!!busy}>
              {busy === "email" ? t("signingIn") : t("signIn")}
            </button>
          </form>

          <p className={styles.forgot}>
            <a className={styles.link} href="/login" onClick={(e) => { e.preventDefault(); setForgotPassword(true); setError(""); }}>
              {t("forgotPassword")}
            </a>
          </p>

          <p className={styles.footer}>
            {t("newHere")} <a className={styles.link} href="/signup">{t("createAccountLink")}</a>
          </p>
        </div>
        <div className={styles.authImage}>
          <Image src="/images/crochet/model_in_shop_05.jpeg" alt="Welcome back" fill sizes="(max-width: 768px) 0px, 460px" style={{ objectFit: "cover" }} />
          <div className={styles.authImageOverlay}>
            <p className={styles.authImageText}>Welcome back to your creative community.</p>
          </div>
        </div>
      </div>
    </main>
  );
}
