import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { encryptText, decryptText } from "../crypto.js";

process.env.MESSAGE_ENCRYPTION_KEY = crypto.randomBytes(32).toString("base64");

test("encryptText/decryptText round-trips", () => {
  const plain = "hello from the lounge 🧶 <script>alert(1)</script>";
  const token = encryptText(plain);
  assert.notEqual(token, plain);
  assert.equal(token.startsWith("v1:"), true);
  assert.equal(decryptText(token), plain);
});

test("ciphertext is unique per call (random IV)", () => {
  const a = encryptText("same value");
  const b = encryptText("same value");
  assert.notEqual(a, b);
  assert.equal(decryptText(a), decryptText(b));
});

test("empty and null pass through", () => {
  assert.equal(encryptText(""), "");
  assert.equal(encryptText(null), null);
  assert.equal(encryptText(undefined), undefined);
  assert.equal(decryptText(""), "");
});

test("legacy plaintext passes through untouched", () => {
  assert.equal(decryptText("plain legacy message"), "plain legacy message");
});

test("tampered ciphertext never returns raw token", () => {
  const token = encryptText("secret");
  const bits = Buffer.from(token.split(":")[3], "base64");
  bits[0] ^= 0xff;
  const tampered = [token.split(":")[0], token.split(":")[1], token.split(":")[2], bits.toString("base64")].join(":");
  const result = decryptText(tampered);
  assert.notEqual(result, token);
  assert.equal(result, "[message could not be decoded]");
});

test("fails closed when the key is missing", () => {
  const previous = process.env.MESSAGE_ENCRYPTION_KEY;
  delete process.env.MESSAGE_ENCRYPTION_KEY;
  assert.throws(() => encryptText("anything"));
  process.env.MESSAGE_ENCRYPTION_KEY = previous;
});