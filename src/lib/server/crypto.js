import crypto from "node:crypto";

// AES-256-GCM encryption for sensitive fields at rest (chat message text,
// attachment payloads, conversation previews). Everything is decrypted
// server-side before it reaches an authorized member.
//
// Key: MESSAGE_ENCRYPTION_KEY — a 256-bit key encoded as base64.
// Generate: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

const PREFIX = "v1";
const KEY_BYTES = 32;

function getKey() {
  const raw = process.env.MESSAGE_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "MESSAGE_ENCRYPTION_KEY is not configured. Refusing to store plaintext messages."
    );
  }
  const buf = Buffer.from(raw, "base64");
  if (buf.length !== KEY_BYTES) {
    throw new Error(
      "MESSAGE_ENCRYPTION_KEY must be a base64-encoded 256-bit key (32 bytes)."
    );
  }
  return buf;
}

export function encryptText(plain) {
  if (plain == null || plain === "") return plain;
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(String(plain), "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [
    PREFIX,
    iv.toString("base64"),
    tag.toString("base64"),
    encrypted.toString("base64"),
  ].join(":");
}

// Decrypts a value encrypted by encryptText. Legacy/plain values (anything not
// shaped as a "v1:" token) pass through untouched. Values that cannot be
// decrypted (tampered, wrong key) are replaced with a placeholder rather than
// surfaced raw.
export function decryptText(token) {
  if (token == null || token === "") return token;
  const parts = typeof token === "string" ? token.split(":") : [];
  if (parts[0] !== PREFIX || parts.length < 4) return token;
  const iv = Buffer.from(parts[1], "base64");
  const tag = Buffer.from(parts[2], "base64");
  const data = Buffer.from(parts.slice(3).join(":"), "base64");
  if (iv.length !== 12 || tag.length < 12) return "[message could not be decoded]";

  try {
    const key = getKey();
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
  } catch {
    return "[message could not be decoded]";
  }
}