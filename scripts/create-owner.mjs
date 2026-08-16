import fs from "fs";
import crypto from "crypto";
import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const env = fs.readFileSync(".env.local", "utf8");
for (const line of env.split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const email = process.argv[2];
const name = process.argv[3];
if (!email) {
  console.error("Usage: node scripts/create-owner.mjs <email> [name]");
  process.exit(1);
}

const app = initializeApp({
  credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
});
const auth = getAuth(app);

let uid;
try {
  const existing = await auth.getUserByEmail(email);
  uid = existing.uid;
  console.log(`Account already exists for ${email} — promoting only`);
} catch {
  const password = `${name || "Member"}${crypto.randomBytes(4).toString("hex")}!`;
  const user = await auth.createUser({
    email,
    password,
    displayName: name || email.split("@")[0],
    emailVerified: true,
  });
  uid = user.uid;
  console.log(`Created account for ${email} (${uid})`);
  console.log(`Temporary password: ${password}`);
}

await getFirestore(app)
  .collection("users")
  .doc(uid)
  .set(
    {
      name: name || email.split("@")[0],
      email,
      role: "owner",
      createdAt: new Date(),
    },
    { merge: true }
  );
console.log(`Promoted ${email} (${uid}) to owner`);
process.exit(0);
