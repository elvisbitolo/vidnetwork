import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  getIdToken,
} from "firebase/auth";
import { auth } from "@/lib/firebase/client";

async function createSession(idToken, name) {
  const res = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(name ? { idToken, name } : { idToken }),
  });
  if (res.status === 403) {
    const data = await res.json().catch(() => ({}));
    if (data.error === "email_not_verified") {
      const err = new Error(
        "Please verify your email first — check your inbox for the confirmation link."
      );
      err.code = "email_not_verified";
      throw err;
    }
    throw new Error(data.error || "Could not create session");
  }
  if (!res.ok) throw new Error("Failed to create session");
  return res.json();
}

export async function loginWithGoogle() {
  const cred = await signInWithPopup(auth, new GoogleAuthProvider());
  const idToken = await getIdToken(cred.user);
  await createSession(idToken);
  return cred.user;
}

export async function loginWithEmail(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  const idToken = await getIdToken(cred.user);
  await createSession(idToken);
  return cred.user;
}

export async function signupWithEmail(name, email, password) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName: name });
  const idToken = await getIdToken(cred.user);
  await createSession(idToken, name);
  return cred.user;
}

export async function logout() {
  await signOut(auth);
  await fetch("/api/auth/logout", { method: "POST" });
}
