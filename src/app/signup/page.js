"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { sendEmailVerification } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { signupWithEmail, signupWithGoogle } from "@/lib/client-auth";
import GoogleIcon from "@/components/GoogleIcon";
import PasswordInput from "@/components/PasswordInput";
import styles from "../auth.module.css";

export default function SignupPage() {
  const t = useTranslations("auth");
  const tc = useTranslations("common");
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
    let navigated = false;
    try {
      await signupWithGoogle();
      navigated = true;
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- full reload so the fresh session cookie is sent
      window.location.assign("/dashboard");
    } catch (err) {
      setError(err.message || t("googleFailed"));
    } finally {
      if (!navigated) setBusy("");
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
        <div className={styles.authContainer}>
          <div className={styles.authForm}>
            <p className={styles.brand}><Link href="/">Secret Yarnery</Link></p>
            <h1 className={styles.title}>{t("verifyEmail")}</h1>
            <div className={styles.verifyBox}>
              <p className={styles.verifyText}>
                {t("verifyEmailDesc", { email: verifyEmail })}
              </p>
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
            {error && <p className={styles.error}>{error}</p>}
            <p className={styles.footer}>
              <a className={styles.link} href="/login">{t("signInAfterVerify")}</a>
            </p>
          </div>
          <div className={styles.authImage}>
            <Image src="/images/crochet/model_in_shop_05.jpeg" alt="Join Secret Yarnery" fill sizes="(max-width: 768px) 0px, 460px" style={{ objectFit: "cover" }} />
            <div className={styles.authImageOverlay}>
              <p className={styles.authImageText}>Join a community of creators who share, learn, and grow together.</p>
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
          <p className={styles.brand}><Link href="/">Secret Yarnery</Link></p>
          <h1 className={styles.title}>{t("createAccount")}</h1>
          <p className={styles.subtitle}>{t("startConnecting")}</p>

          {error && <p className={styles.error}>{error}</p>}

          <button className={styles.googleButton} onClick={handleGoogle} disabled={!!busy}>
            <GoogleIcon /> {t("continueWithGoogle")}
          </button>

          <div className={styles.divider}>{tc("or")}</div>

          <form onSubmit={handleSubmit}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="name">{t("name")}</label>
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
              autoComplete="new-password"
            />
            <button className={styles.submit} type="submit" disabled={!!busy}>
              {busy === "email" ? t("creatingAccount") : t("createAccountBtn")}
            </button>
          </form>

          <p className={styles.footer}>
            {t("alreadyMember")} <a className={styles.link} href="/login">{t("signInLink")}</a>
          </p>
        </div>
        <div className={styles.authImage}>
          <Image src="/images/crochet/model_in_shop_05.jpeg" alt="Join Secret Yarnery" fill sizes="(max-width: 768px) 0px, 460px" style={{ objectFit: "cover" }} />
          <div className={styles.authImageOverlay}>
            <p className={styles.authImageText}>Join a community of creators who share, learn, and grow together.</p>
          </div>
        </div>
      </div>
    </main>
  );
}
