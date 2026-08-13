import fs from "fs";
import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const env = fs.readFileSync(".env.local", "utf8");
for (const line of env.split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const email = process.argv[2];
if (!email) {
  console.error("Usage: node scripts/set-owner.mjs <email>");
  process.exit(1);
}

const app = initializeApp({
  credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
});
const user = await getAuth(app).getUserByEmail(email);
await getFirestore(app)
  .collection("users")
  .doc(user.uid)
  .set({ role: "owner" }, { merge: true });
console.log(`Promoted ${email} (${user.uid}) to owner`);
process.exit(0);
